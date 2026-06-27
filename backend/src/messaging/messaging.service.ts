import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioProvider } from './providers/twilio.provider';
import { OpenWaProvider } from './providers/openwa.provider';
import { NormalizedInbound, WebhookRequest, WhatsAppProvider } from './whatsapp-provider.interface';

const DRAIN_INTERVAL_MS = Number(process.env.MESSAGING_DRAIN_INTERVAL_MS ?? 10_000);
const MAX_BATCH = 20;

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
  ) {
    this.providers.set(twilio.key, twilio);
    this.providers.set(openwa.key, openwa);
  }

  // Drain em memória (single-instance). Substituir por BullMQ/@nestjs/schedule
  // quando houver volume/múltiplas instâncias (Épico 3/7 do ROADMAP_TECNICO.md).
  onModuleInit() {
    if (process.env.MESSAGING_DRAIN_ENABLED === 'false') return;
    this.timer = setInterval(() => this.drainQueue().catch((e) => this.logger.error(e)), DRAIN_INTERVAL_MS);
    if (this.timer.unref) this.timer.unref();
  }

  getProvider(key?: string): WhatsAppProvider {
    const selected = key ?? process.env.MESSAGING_PROVIDER ?? 'twilio';
    const provider = this.providers.get(selected);
    if (!provider) throw new Error(`Provedor de WhatsApp desconhecido: ${selected}`);
    return provider;
  }

  listProviders(): WhatsAppProvider[] {
    return [...this.providers.values()];
  }

  /**
   * Cria a Message OUTBOUND + OutboundMessageLog (QUEUED) e tenta o envio.
   * Usado pela tela de Conversas e (futuramente) pela IA.
   */
  async sendFromConversation(conversationId: string, body: string, opts: { sentByAi?: boolean; providerKey?: string } = {}) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { professional: true },
    });
    if (!conv) throw new Error('Conversa não encontrada.');
    const to = conv.professional?.whatsapp ?? '';

    const [message, log] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, direction: 'OUTBOUND', body, status: 'QUEUED', sentByAi: !!opts.sentByAi },
      }),
      this.prisma.outboundMessageLog.create({
        data: {
          conversationId,
          provider: opts.providerKey ?? process.env.MESSAGING_PROVIDER ?? 'twilio',
          to: to || 'unknown',
          body,
          status: 'QUEUED',
        },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), lastMessagePreview: body.slice(0, 140) } }),
    ]);

    // Tentativa imediata (best-effort); se falhar/ficar QUEUED, o drain reprocessa.
    await this.dispatch(log.id, message.id, to, body, opts.providerKey).catch((e) => this.logger.error(e));
    return message;
  }

  /** Envia um log específico via provedor e propaga o status para a Message. */
  private async dispatch(logId: string, messageId: string | null, to: string, body: string, providerKey?: string) {
    const provider = this.getProvider(providerKey);
    if (!to || to === 'unknown') {
      await this.markFailed(logId, messageId, 'NO_RECIPIENT', 'Profissional sem WhatsApp.');
      return;
    }
    const result = await provider.send({ to, body, conversationId: undefined });
    await this.prisma.outboundMessageLog.update({
      where: { id: logId },
      data: {
        status: result.status,
        from: process.env.TWILIO_WHATSAPP_FROM ?? null,
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
    // TODO (Épico 2): se conversation.aiEnabled → acionar o motor de IA aqui.
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
