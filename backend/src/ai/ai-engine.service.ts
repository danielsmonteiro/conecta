import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { OpenAiProvider } from './llm/openai.provider';
import { LlmProvider, LlmTurn, ToolCall, ToolDef } from './llm/llm-provider.interface';

interface RunOpts {
  trigger?: string; // INBOUND_MESSAGE | MANUAL
  dryRun?: boolean; // override; senão usa AI_DRY_RUN
}

const MAX_TOOL_ITERATIONS = 4;

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiProvider,
    @Inject(forwardRef(() => MessagingService)) private readonly messaging: MessagingService,
  ) {}

  private cfg() {
    return {
      enabled: process.env.AI_ENABLED !== 'false',
      autoReply: process.env.AI_AUTO_REPLY === 'true',
      dryRun: process.env.AI_DRY_RUN === 'true',
      requireHuman: process.env.AI_REQUIRE_HUMAN !== 'false',
      maxContext: Number(process.env.AI_MAX_CONTEXT_MESSAGES ?? 20),
      provider: process.env.AI_PROVIDER ?? 'openai',
    };
  }

  private llm(): LlmProvider {
    // Só OpenAI implementado; Anthropic entra aqui depois (mesma interface).
    return this.openai;
  }

  /** Disparado por mensagem inbound: só roda se a conversa tem IA habilitada. */
  async onInbound(conversationId: string) {
    if (!this.cfg().enabled || !this.cfg().autoReply) return;
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv?.aiEnabled || conv.status === 'WAITING_HUMAN') return;
    await this.run(conversationId, { trigger: 'INBOUND_MESSAGE' }).catch((e) => this.logger.error(`IA inbound: ${e?.message}`));
  }

  /** Roda o motor numa conversa: contexto → modelo → tools → resposta. */
  async run(conversationId: string, opts: RunOpts = {}) {
    const cfg = this.cfg();
    const dryRun = opts.dryRun ?? cfg.dryRun;
    const llm = this.llm();
    const model = llm.defaultModel();

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        professional: true,
        vacancy: { include: { specialty: true, healthUnit: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: cfg.maxContext },
      },
    });
    if (!conv) throw new Error('Conversa não encontrada.');
    if (!llm.isConfigured()) throw new Error(`Provedor de IA (${cfg.provider}) não configurado.`);

    const history = [...conv.messages].reverse();
    const turns: LlmTurn[] = history.map((m) => ({
      role: m.direction === 'INBOUND' ? 'user' : 'assistant',
      content: m.body,
    }));

    let toolCallsCount = 0;
    let actionsCount = 0;
    let finalText: string | null = null;
    let totalTokens = 0;
    const ctx = { conv, handedOff: false };

    try {
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        const resp = await llm.chat({ system: this.systemPrompt(conv), messages: turns, tools: this.tools(), model });
        totalTokens += resp.totalTokens;
        if (resp.toolCalls.length) {
          toolCallsCount += resp.toolCalls.length;
          turns.push({ role: 'assistant', content: resp.text ?? '', toolCalls: resp.toolCalls });
          for (const tc of resp.toolCalls) {
            const r = await this.execTool(tc, ctx);
            if (r.isAction) actionsCount++;
            turns.push({ role: 'tool', toolCallId: tc.id, name: tc.name, content: r.content });
          }
          continue;
        }
        finalText = resp.text;
        break;
      }

      // Envia a resposta (a menos que dryRun, sem texto, ou já transferido p/ humano).
      let sent = false;
      if (finalText && !dryRun && !ctx.handedOff) {
        await this.messaging.sendFromConversation(conversationId, finalText, { sentByAi: true });
        sent = true;
      }

      await this.recordRun(conversationId, {
        trigger: opts.trigger ?? 'MANUAL',
        status: 'COMPLETED',
        model,
        dryRun,
        inputMessagesCount: history.length,
        outputMessage: finalText ?? undefined,
        toolCallsCount,
        actionsCount,
        tokensUsed: totalTokens,
        outcome: ctx.handedOff ? 'HANDOFF' : sent ? 'REPLIED' : dryRun ? 'DRY_RUN' : 'NO_REPLY',
      });

      return { reply: finalText, sent, dryRun, handedOff: ctx.handedOff, toolCallsCount, actionsCount, tokensUsed: totalTokens };
    } catch (err: any) {
      await this.recordRun(conversationId, {
        trigger: opts.trigger ?? 'MANUAL',
        status: 'FAILED',
        model,
        dryRun,
        inputMessagesCount: history.length,
        toolCallsCount,
        actionsCount,
        tokensUsed: totalTokens,
        outcome: 'ERROR',
        error: err?.message,
      });
      throw err;
    }
  }

  // ----------------------------- Tools -----------------------------
  private tools(): ToolDef[] {
    return [
      {
        name: 'consultar_vaga',
        description: 'Retorna os detalhes da vaga/plantão vinculada à conversa (especialidade, unidade, datas, valor).',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'registrar_resposta',
        description:
          'Registra a intenção do profissional sobre o plantão. Use quando ele aceitar, recusar ou ficar indeciso.',
        parameters: {
          type: 'object',
          properties: {
            intencao: { type: 'string', enum: ['aceitou', 'recusou', 'indeciso'] },
            resumo: { type: 'string', description: 'Resumo curto do que o profissional disse.' },
          },
          required: ['intencao', 'resumo'],
        },
      },
      {
        name: 'transferir_para_humano',
        description: 'Transfere a conversa para um atendente humano. Use em dúvidas fora do escopo ou pedido explícito.',
        parameters: {
          type: 'object',
          properties: { motivo: { type: 'string' } },
          required: ['motivo'],
        },
      },
    ];
  }

  private async execTool(tc: ToolCall, ctx: any): Promise<{ content: string; isAction: boolean }> {
    const cfg = this.cfg();
    const conv = ctx.conv;
    try {
      switch (tc.name) {
        case 'consultar_vaga': {
          const v = conv.vacancy;
          if (!v) return { content: 'Nenhuma vaga vinculada a esta conversa.', isAction: false };
          return {
            content: JSON.stringify({
              titulo: v.title,
              especialidade: v.specialty?.name ?? null,
              unidade: v.healthUnit?.name ?? null,
              inicio: v.startsAt,
              fim: v.endsAt,
              valorProfissional: v.doctorAmount,
            }),
            isAction: false,
          };
        }
        case 'registrar_resposta': {
          const intencao = tc.arguments?.intencao ?? 'indeciso';
          const resumo = String(tc.arguments?.resumo ?? '').slice(0, 280);
          // Ação CRÍTICA: aceite vira cobertura confirmada → exige humano se configurado.
          if (intencao === 'aceitou' && cfg.requireHuman) {
            await this.handoff(conv.id, `Profissional aceitou — confirmar cobertura. ${resumo}`);
            ctx.handedOff = true;
            return { content: 'Aceite registrado e ENCAMINHADO para um humano confirmar a cobertura.', isAction: true };
          }
          await this.prisma.conversation.update({
            where: { id: conv.id },
            data: { internalSummary: `[IA] ${intencao}: ${resumo}` },
          });
          return { content: `Resposta registrada (${intencao}).`, isAction: true };
        }
        case 'transferir_para_humano': {
          await this.handoff(conv.id, String(tc.arguments?.motivo ?? 'Solicitado pela IA.'));
          ctx.handedOff = true;
          return { content: 'Conversa transferida para atendimento humano.', isAction: true };
        }
        default:
          return { content: `Ferramenta desconhecida: ${tc.name}`, isAction: false };
      }
    } catch (e: any) {
      return { content: `Erro ao executar ${tc.name}: ${e?.message}`, isAction: false };
    }
  }

  private async handoff(conversationId: string, motivo: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'WAITING_HUMAN', internalSummary: `[IA→humano] ${motivo}`.slice(0, 280) },
    });
  }

  private systemPrompt(conv: any): string {
    const nome = conv.professional?.fullName ?? 'profissional';
    return [
      'Você é o assistente de contingência do HealthMatch falando por WhatsApp com um profissional de saúde.',
      'Objetivo: cobrir um plantão em aberto (gap). Seja cordial, MUITO conciso (mensagens curtas de WhatsApp), em português do Brasil.',
      `Você está falando com: ${nome}.`,
      'Use a ferramenta consultar_vaga para saber os detalhes antes de propor.',
      'Quando o profissional decidir, use registrar_resposta. Nunca confirme a cobertura sozinho: ações críticas vão para um humano.',
      'Se fugir do escopo (pagamento, reclamação, jurídico), use transferir_para_humano.',
      'Não invente dados que não tem; consulte as ferramentas.',
    ].join(' ');
  }

  private async recordRun(conversationId: string, data: any) {
    await this.prisma.aiConversationRun.create({
      data: { conversationId, finishedAt: new Date(), ...data },
    });
  }
}
