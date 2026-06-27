// Adapter NÃO-OFICIAL — OpenWA (https://github.com/rmyndharis/OpenWA).
// Gateway self-hosted (NestJS) que automatiza o WhatsApp Web via QR.
//
// ⚠️ AVISO: este caminho VIOLA o Termos de Serviço do WhatsApp e expõe o número
// a BANIMENTO. Use em número DEDICADO (nunca o número principal da cooperativa),
// preferencialmente em dev/teste ou cenários sensíveis a custo. Para o piloto
// Coaph, o default recomendado é o Twilio (oficial). Ver ROADMAP_TECNICO.md.
//
// O OpenWA expõe REST (estilo WAHA) + webhooks. Endpoints/shape exatos variam
// por versão do gateway — confirme contra a instância implantada. Parsing
// defensivo abaixo cobre os formatos mais comuns.

import { Injectable, Logger } from '@nestjs/common';
import {
  DeliveryUpdate,
  NormalizedInbound,
  OutboundMessage,
  SendResult,
  WebhookRequest,
  WhatsAppProvider,
  normalizePhone,
} from '../whatsapp-provider.interface';
import type { MessageStatus } from '@prisma/client';

const OPENWA_STATUS_MAP: Record<string, MessageStatus> = {
  sent: 'SENT',
  server: 'SENT',
  delivered: 'DELIVERED',
  device: 'DELIVERED',
  read: 'READ',
  played: 'READ',
  error: 'FAILED',
  failed: 'FAILED',
};

@Injectable()
export class OpenWaProvider implements WhatsAppProvider {
  readonly key = 'openwa';
  readonly official = false;
  private readonly logger = new Logger(OpenWaProvider.name);

  private get baseUrl() {
    return (process.env.OPENWA_BASE_URL ?? '').replace(/\/$/, '');
  }
  private get session() {
    return process.env.OPENWA_SESSION ?? 'default';
  }

  isConfigured(): boolean {
    return !!this.baseUrl && !!process.env.OPENWA_API_KEY;
  }

  async send(msg: OutboundMessage): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { status: 'FAILED', errorCode: 'NOT_CONFIGURED', errorMessage: 'OpenWA não configurado.' };
    }
    const url = `${this.baseUrl}/api/sendText`;
    const requestPayload = { session: this.session, chatId: this.toChatId(msg.to), text: msg.body };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': process.env.OPENWA_API_KEY! },
        body: JSON.stringify(requestPayload),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          status: 'FAILED',
          requestPayload,
          responsePayload: json,
          errorCode: String(res.status),
          errorMessage: json?.error ?? json?.message ?? `HTTP ${res.status}`,
        };
      }
      return {
        status: 'SENT',
        externalMessageId: json?.id ?? json?.messageId ?? json?.key?.id,
        requestPayload,
        responsePayload: json,
      };
    } catch (err: any) {
      this.logger.error(`Falha ao enviar via OpenWA: ${err?.message}`);
      return { status: 'FAILED', requestPayload, errorCode: 'NETWORK', errorMessage: err?.message };
    }
  }

  // Sem assinatura HMAC nativa: validamos um token compartilhado no header.
  validateWebhook(req: WebhookRequest): boolean {
    const secret = process.env.OPENWA_WEBHOOK_SECRET;
    if (!secret) return process.env.OPENWA_VALIDATE_WEBHOOK === 'false';
    const got = (req.headers['x-webhook-secret'] ?? req.headers['x-api-key']) as string | undefined;
    return got === secret;
  }

  parseInbound(req: WebhookRequest): NormalizedInbound | null {
    const b = req.body;
    if (b.event && b.event !== 'message' && b.event !== 'message.any') return null;
    const p = b.payload ?? b;
    // Ignora ecos de mensagens enviadas por nós.
    if (p.fromMe === true) return null;
    const from = p.from ?? p.author ?? p.chatId;
    const body = p.body ?? p.text ?? p.content;
    if (!from || body == null) return null;
    return {
      from: normalizePhone(from),
      to: normalizePhone(p.to),
      body: String(body),
      externalMessageId: p.id?._serialized ?? p.id ?? p.messageId,
      externalEventId: p.id?._serialized ?? p.id ?? p.messageId,
      raw: b,
    };
  }

  parseStatus(req: WebhookRequest): DeliveryUpdate | null {
    const b = req.body;
    if (b.event && !['message.ack', 'ack', 'state'].includes(b.event)) return null;
    const p = b.payload ?? b;
    const ack = p.ack ?? p.status;
    const id = p.id?._serialized ?? p.id ?? p.messageId;
    if (ack == null || !id) return null;
    const mapped = OPENWA_STATUS_MAP[String(ack).toLowerCase()];
    if (!mapped) return null;
    return { externalMessageId: id, status: mapped };
  }

  private toChatId(num: string): string {
    const clean = normalizePhone(num);
    return clean.includes('@') ? clean : `${clean.replace(/^\+/, '')}@c.us`;
  }
}
