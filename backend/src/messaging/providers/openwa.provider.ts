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
import { createHmac, timingSafeEqual } from 'node:crypto';
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
    // Contrato real do rmyndharis/OpenWA: a sessão vai na URL; corpo {chatId,text}.
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(this.session)}/messages/send-text`;
    const requestPayload = { chatId: this.toChatId(msg.to), text: msg.body };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.OPENWA_API_KEY! },
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
        externalMessageId: json?.messageId ?? json?.id?._serialized ?? json?.id ?? json?.key?.id,
        requestPayload,
        responsePayload: json,
      };
    } catch (err: any) {
      this.logger.error(`Falha ao enviar via OpenWA: ${err?.message}`);
      return { status: 'FAILED', requestPayload, errorCode: 'NETWORK', errorMessage: err?.message };
    }
  }

  // Validação HMAC sobre o corpo cru (rawBody). Header e algoritmo são
  // configuráveis (OPENWA_SIGNATURE_HEADER / OPENWA_HMAC_ALGO) — confirme o
  // esquema exato na instância do OpenWA. Aceita hex ou base64 e prefixo
  // "algo=" (estilo GitHub). Sem segredo: respeita OPENWA_VALIDATE_WEBHOOK.
  validateWebhook(req: WebhookRequest): boolean {
    const secret = process.env.OPENWA_WEBHOOK_SECRET;
    if (!secret) return process.env.OPENWA_VALIDATE_WEBHOOK === 'false';
    if (!req.rawBody) return false;
    const headerName = (process.env.OPENWA_SIGNATURE_HEADER ?? 'x-webhook-hmac').toLowerCase();
    let sig = (req.headers[headerName] ?? req.headers['x-hub-signature-256']) as string | undefined;
    if (!sig) return false;
    sig = sig.replace(/^(sha1|sha256|sha512)=/i, '').trim();
    const algo = process.env.OPENWA_HMAC_ALGO ?? 'sha512';
    let digest: Buffer;
    try {
      digest = createHmac(algo, secret).update(Buffer.from(req.rawBody, 'utf8')).digest();
    } catch {
      return false;
    }
    return this.timingEq(sig, digest.toString('hex')) || this.timingEq(sig, digest.toString('base64'));
  }

  private timingEq(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }

  parseInbound(req: WebhookRequest): NormalizedInbound | null {
    const b = req.body;
    const ev = b.event ?? b.type;
    if (ev && !['message', 'message.received', 'message.any'].includes(ev)) return null;
    const p = b.payload ?? b.data ?? b;
    // Ignora ecos de mensagens enviadas por nós.
    if (p.fromMe === true) return null;
    // Campo do OpenWA é `sender` (telefone@c.us); demais como fallback.
    const from = p.sender ?? p.from ?? p.author ?? p.chatId;
    const body = p.body ?? p.text ?? p.content;
    if (!from || body == null) return null;
    const id = p.messageId ?? p.id?._serialized ?? p.id;
    return {
      from: normalizePhone(from),
      to: normalizePhone(p.recipient ?? p.to),
      body: String(body),
      senderName: p.notifyName ?? p.pushName ?? p.senderName ?? p.contact?.pushName ?? undefined,
      externalMessageId: id,
      externalEventId: id,
      raw: b,
    };
  }

  parseStatus(req: WebhookRequest): DeliveryUpdate | null {
    const b = req.body;
    const ev = b.event ?? b.type;
    if (ev && !['message.ack', 'ack', 'message.status', 'session.status'].includes(ev)) return null;
    const p = b.payload ?? b.data ?? b;
    const ack = p.ack ?? p.status ?? p.state;
    const id = p.messageId ?? p.id?._serialized ?? p.id;
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
