import { BadRequestException, Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiEngineService } from '../ai/ai-engine.service';
import { TwilioProvider } from './providers/twilio.provider';
import { OpenWaProvider } from './providers/openwa.provider';
import { NormalizedInbound, WebhookRequest, WhatsAppProvider } from './whatsapp-provider.interface';

const DRAIN_INTERVAL_MS = Number(process.env.MESSAGING_DRAIN_INTERVAL_MS ?? 10_000);
const MAX_BATCH = 20;

// Mapeia a chave do adapter para o enum ProviderType (persistência).
const TYPE_BY_KEY: Record<string, ProviderType> = { twilio: 'TWILIO', openwa: 'CUSTOM' };

@Injectable()
export class MessagingService implements OnModuleInit {
  private readonly logger = new Logger(MessagingService.name);
  private readonly providers = new Map<string, WhatsAppProvider>();
  private draining = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    twilio: TwilioProvider,
    openwa: OpenWaProvider,
    @Inject(forwardRef(() => AiEngineService)) private readonly aiEngine: AiEngineService,
  ) {
    this.providers.set(twilio.key, twilio);
    this.providers.set(openwa.key, openwa);
  }

  async onModuleInit() {
    await this.ensureProviderRows().catch((e) => this.logger.error(`ensureProviderRows: ${e}`));
    // Drain em memória (single-instance). Substituir por BullMQ/@nestjs/schedule
    // quando houver volume/múltiplas instâncias (Épico 3/7 do ROADMAP_TECNICO.md).
    if (process.env.MESSAGING_DRAIN_ENABLED === 'false') return;
    this.timer = setInterval(() => this.drainQueue().catch((e) => this.logger.error(e)), DRAIN_INTERVAL_MS);
    if (this.timer.unref) this.timer.unref();
  }

  // Garante uma linha MessagingProvider por adapter; default inicial = env (ou twilio).
  private async ensureProviderRows() {
    const envDefault = process.env.MESSAGING_PROVIDER ?? 'twilio';
    for (const p of this.listProviders()) {
      const existing = await this.prisma.messagingProvider.findFirst({ where: { name: p.key } });
      if (!existing) {
        await this.prisma.messagingProvider.create({
          data: { name: p.key, type: TYPE_BY_KEY[p.key] ?? 'CUSTOM', isDefault: p.key === envDefault },
        });
      }
    }
    const anyDefault = await this.prisma.messagingProvider.findFirst({ where: { isDefault: true } });
    if (!anyDefault) await this.setActiveProvider(this.providers.has(envDefault) ? envDefault : 'twilio');
  }

  private byKey(key: string): WhatsAppProvider {
    const provider = this.providers.get(key);
    if (!provider) throw new BadRequestException(`Provedor de WhatsApp desconhecido: ${key}`);
    return provider;
  }

  listProviders(): WhatsAppProvider[] {
    return [...this.providers.values()];
  }

  /** Chave do provedor ativo: override explícito → flag persistida (DB) → env → twilio. */
  async activeProviderKey(explicit?: string): Promise<string> {
    if (explicit && this.providers.has(explicit)) return explicit;
    const row = await this.prisma.messagingProvider.findFirst({ where: { isDefault: true } });
    const key = row?.name ?? process.env.MESSAGING_PROVIDER ?? 'twilio';
    return this.providers.has(key) ? key : 'twilio';
  }

  /** Troca a flag: define qual provedor é o ativo (persistido). */
  async setActiveProvider(key: string) {
    this.byKey(key); // valida
    await this.ensureRow(key);
    await this.prisma.messagingProvider.updateMany({ data: { isDefault: false } });
    await this.prisma.messagingProvider.updateMany({ where: { name: key }, data: { isDefault: true } });
    this.logger.log(`Provedor de WhatsApp ativo: ${key}`);
    return this.describeProviders();
  }

  private async ensureRow(key: string) {
    const existing = await this.prisma.messagingProvider.findFirst({ where: { name: key } });
    if (!existing) {
      await this.prisma.messagingProvider.create({ data: { name: key, type: TYPE_BY_KEY[key] ?? 'CUSTOM' } });
    }
  }

  /** Descritor dos adapters para a UI (flag ativa vem do DB). */
  async describeProviders() {
    const active = await this.activeProviderKey();
    return this.listProviders().map((p) => ({
      key: p.key,
      official: p.official,
      configured: p.isConfigured(),
      isDefault: p.key === active,
    }));
  }

  /**
   * Cria a Message OUTBOUND + OutboundMessageLog (QUEUED) e tenta o envio.
   * Usado pela tela de Conversas e (futuramente) pela IA.
   */
  async sendFromConversation(
    conversationId: string,
    body: string,
    opts: { sentByAi?: boolean; providerKey?: string; templateSid?: string; templateVars?: Record<string, string> } = {},
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { professional: true },
    });
    if (!conv) throw new Error('Conversa não encontrada.');
    const to = conv.professional?.whatsapp ?? '';
    const providerKey = await this.activeProviderKey(opts.providerKey);
    const template = opts.templateSid ? { sid: opts.templateSid, vars: opts.templateVars } : undefined;
    // Texto do registro: o corpo, ou um rótulo do template quando for proativo.
    const logBody = body || (template ? `[template ${template.sid}]` : '');

    const [message, log] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, direction: 'OUTBOUND', body: logBody, status: 'QUEUED', sentByAi: !!opts.sentByAi },
      }),
      this.prisma.outboundMessageLog.create({
        data: { conversationId, provider: providerKey, to: to || 'unknown', body: logBody, status: 'QUEUED' },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), lastMessagePreview: logBody.slice(0, 140) } }),
    ]);

    // Tentativa imediata (best-effort); se falhar/ficar QUEUED, o drain reprocessa.
    await this.dispatch(log.id, message.id, to, body, providerKey, template).catch((e) => this.logger.error(e));
    return message;
  }

  /** Envia um log específico via provedor e propaga o status para a Message. */
  private async dispatch(
    logId: string,
    messageId: string | null,
    to: string,
    body: string,
    providerKey: string,
    template?: { sid: string; vars?: Record<string, string> },
  ) {
    const provider = this.byKey(providerKey);
    if (!to || to === 'unknown') {
      await this.markFailed(logId, messageId, 'NO_RECIPIENT', 'Profissional sem WhatsApp.');
      return;
    }
    const result = await provider.send({ to, body, templateSid: template?.sid, templateVars: template?.vars });
    await this.prisma.outboundMessageLog.update({
      where: { id: logId },
      data: {
        status: result.status,
        from: providerKey === 'twilio' ? process.env.TWILIO_WHATSAPP_FROM ?? null : null,
        externalMessageId: result.externalMessageId,
        requestPayload: result.requestPayload as any,
        responsePayload: result.responsePayload as any,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        sentAt: result.status === 'SENT' ? new Date() : null,
      },
    });
    if (messageId) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { status: result.status === 'SENT' ? 'SENT' : 'FAILED' },
      });
    }
  }

  private async markFailed(logId: string, messageId: string | null, code: string, msg: string) {
    await this.prisma.outboundMessageLog.update({ where: { id: logId }, data: { status: 'FAILED', errorCode: code, errorMessage: msg } });
    if (messageId) await this.prisma.message.update({ where: { id: messageId }, data: { status: 'FAILED' } });
  }

  /** Reprocessa logs ainda QUEUED (retry simples). */
  async drainQueue() {
    if (this.draining) return;
    this.draining = true;
    try {
      const pending = await this.prisma.outboundMessageLog.findMany({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        take: MAX_BATCH,
      });
      for (const log of pending) {
        await this.dispatch(log.id, null, log.to, log.body, log.provider).catch((e) => this.logger.error(e));
      }
    } finally {
      this.draining = false;
    }
  }

  /**
   * Processa um webhook inbound: valida assinatura, grava WebhookLog, e —
   * se for mensagem — resolve a conversa e cria a Message INBOUND; se for
   * status de entrega, atualiza a Message correspondente.
   */
  async handleWebhook(providerKey: string, req: WebhookRequest) {
    const provider = this.providers.get(providerKey);
    if (!provider) return { ok: false, reason: 'unknown_provider' };

    const valid = provider.validateWebhook(req);
    const inbound = valid ? provider.parseInbound(req) : null;
    const status = valid ? provider.parseStatus(req) : null;

    await this.prisma.webhookLog.create({
      data: {
        provider: providerKey,
        eventType: inbound ? 'message' : status ? 'status' : 'unknown',
        externalEventId: inbound?.externalEventId ?? status?.externalMessageId,
        payload: req.body as any,
        headers: this.safeHeaders(req.headers) as any,
        processed: valid && !!(inbound || status),
        processedAt: new Date(),
        error: valid ? null : 'invalid_signature',
      },
    });

    if (!valid) return { ok: false, reason: 'invalid_signature' };
    if (inbound) await this.ingestInbound(inbound);
    if (status) await this.applyStatus(status);
    return { ok: true };
  }

  private async ingestInbound(inbound: NormalizedInbound) {
    const professional = await this.prisma.healthProfessional.findFirst({
      where: { whatsapp: { contains: inbound.from.replace(/^\+/, '').slice(-8) } },
    });

    // Só reaproveita conversa aberta se o número casou com um profissional;
    // número desconhecido sempre abre conversa nova (evita anexar a uma alheia).
    let conversation = professional
      ? await this.prisma.conversation.findFirst({
          where: { professionalId: professional.id, status: { in: ['OPEN', 'AI_ACTIVE', 'WAITING_HUMAN'] } },
          orderBy: { lastMessageAt: 'desc' },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          professionalId: professional?.id,
          channel: 'WHATSAPP',
          status: 'OPEN',
          subject: 'Recebida via WhatsApp',
        },
      });
    }

    await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: conversation.id, direction: 'INBOUND', body: inbound.body, status: 'DELIVERED' },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastMessagePreview: inbound.body.slice(0, 140) },
      }),
    ]);
    // Épico 2: aciona o motor de IA se a conversa tiver IA habilitada (a própria
    // checagem de aiEnabled/autoReply/status fica no engine; nunca lança aqui).
    await this.aiEngine.onInbound(conversation.id).catch((e) => this.logger.error(`IA onInbound: ${e?.message}`));
  }

  private async applyStatus(status: { externalMessageId: string; status: any }) {
    const log = await this.prisma.outboundMessageLog.findFirst({ where: { externalMessageId: status.externalMessageId } });
    if (!log) return;
    await this.prisma.outboundMessageLog.update({ where: { id: log.id }, data: { status: status.status } });
  }

  private safeHeaders(headers: Record<string, any>) {
    const clone = { ...headers };
    delete clone['authorization'];
    delete clone['x-api-key'];
    delete clone['x-webhook-secret'];
    return clone;
  }
}
