// Adapter OFICIAL — Twilio WhatsApp Business API.
// Conformidade e SLA; é o default recomendado para o piloto Coaph.
// Implementado direto sobre a REST API (fetch + crypto nativos) para não
// adicionar dependência de SDK. Trocar por SDK é transparente para o resto.
//
// Nota de conformidade: mensagens proativas (business-initiated) fora da janela
// de 24h exigem TEMPLATE aprovado. O envio de texto livre abaixo cobre respostas
// dentro da janela; templates entram no Épico 2 (campanhas da IA).

import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
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

const TWILIO_STATUS_MAP: Record<string, MessageStatus> = {
  queued: 'QUEUED',
  sending: 'SENT',
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
  undelivered: 'FAILED',
};

@Injectable()
export class TwilioProvider implements WhatsAppProvider {
  readonly key = 'twilio';
  readonly official = true;
  private readonly logger = new Logger(TwilioProvider.name);

  isConfigured(): boolean {
    const e = process.env;
    return !!(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && (e.TWILIO_WHATSAPP_FROM || e.TWILIO_MESSAGING_SERVICE_SID));
  }

  async send(msg: OutboundMessage): Promise<SendResult> {
    const e = process.env;
    if (!this.isConfigured()) {
      return { status: 'FAILED', errorCode: 'NOT_CONFIGURED', errorMessage: 'Twilio não configurado.' };
    }
    const accountSid = e.TWILIO_ACCOUNT_SID!;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.set('To', this.toWhatsApp(msg.to));
    if (e.TWILIO_MESSAGING_SERVICE_SID) {
      params.set('MessagingServiceSid', e.TWILIO_MESSAGING_SERVICE_SID);
    } else {
      params.set('From', this.toWhatsApp(e.TWILIO_WHATSAPP_FROM!));
    }
    // Template explícito → sempre template (abordagem proativa). Sem template mas
    // com texto → texto livre (janela 24h). Sem ambos → template default do env.
    const templateSid = msg.templateSid ?? (msg.body ? undefined : e.TWILIO_DEFAULT_CONTENT_SID);
    if (templateSid) {
      params.set('ContentSid', templateSid);
      if (msg.templateVars) params.set('ContentVariables', JSON.stringify(msg.templateVars));
    } else {
      params.set('Body', msg.body);
    }

    const auth = Buffer.from(`${accountSid}:${e.TWILIO_AUTH_TOKEN}`).toString('base64');
    const requestPayload = Object.fromEntries(params);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          status: 'FAILED',
          requestPayload,
          responsePayload: json,
          errorCode: String(json?.code ?? res.status),
          errorMessage: json?.message ?? `HTTP ${res.status}`,
        };
      }
      return {
        status: 'SENT',
        externalMessageId: json?.sid,
        requestPayload,
        responsePayload: json,
      };
    } catch (err: any) {
      this.logger.error(`Falha ao enviar via Twilio: ${err?.message}`);
      return { status: 'FAILED', requestPayload, errorCode: 'NETWORK', errorMessage: err?.message };
    }
  }

  // Validação de assinatura: base64(HMAC-SHA1(authToken, url + params ordenados)).
  validateWebhook(req: WebhookRequest): boolean {
    if (process.env.TWILIO_VALIDATE_SIGNATURE === 'false') return true;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers['x-twilio-signature'] as string | undefined;
    if (!token || !signature) return false;
    const sorted = Object.keys(req.body).sort();
    let data = req.url;
    for (const key of sorted) data += key + (req.body[key] ?? '');
    const expected = createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
    return expected === signature;
  }

  parseInbound(req: WebhookRequest): NormalizedInbound | null {
    const b = req.body;
    // Callbacks de status de entrega trazem MessageStatus (sent/delivered/...) e sem Body.
    // ATENÇÃO: mensagens inbound de WhatsApp do Twilio trazem SmsStatus='received' — NÃO
    // descartar por SmsStatus, senão toda mensagem real do profissional é perdida.
    if (b.MessageStatus) return null;
    if (!b.From || b.Body == null) return null;
    return {
      from: normalizePhone(b.From),
      to: normalizePhone(b.To),
      body: String(b.Body),
      externalMessageId: b.MessageSid ?? b.SmsMessageSid,
      externalEventId: b.MessageSid ?? b.SmsMessageSid,
      raw: b,
    };
  }

  parseStatus(req: WebhookRequest): DeliveryUpdate | null {
    const b = req.body;
    const status = b.MessageStatus ?? b.SmsStatus;
    if (!status || !b.MessageSid) return null;
    const mapped = TWILIO_STATUS_MAP[String(status).toLowerCase()];
    if (!mapped) return null;
    return { externalMessageId: b.MessageSid, status: mapped, errorCode: b.ErrorCode };
  }

  private toWhatsApp(num: string): string {
    const clean = normalizePhone(num);
    return clean.startsWith('whatsapp:') ? clean : `whatsapp:${clean}`;
  }
}
