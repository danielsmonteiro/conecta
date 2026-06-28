// Contrato único para qualquer canal de WhatsApp. Adapters (Twilio oficial,
// OpenWA não-oficial) implementam esta interface; o resto do sistema não sabe
// qual está em uso. O enum ProviderType (schema.prisma) já prevê TWILIO/CUSTOM.

import type { MessageStatus } from '@prisma/client';

/** Mensagem a enviar (já resolvida a partir da conversa/profissional). */
export interface OutboundMessage {
  to: string; // telefone em E.164 (ex.: +5585999998888) ou id do canal
  body: string;
  conversationId?: string;
  // Envio por template (obrigatório p/ abordagem proativa no WhatsApp oficial).
  // No Twilio: ContentSid + ContentVariables. Ignorado pelo OpenWA (usa body).
  templateSid?: string;
  templateVars?: Record<string, string>;
}

/** Resultado normalizado de uma tentativa de envio. */
export interface SendResult {
  status: 'SENT' | 'QUEUED' | 'FAILED';
  externalMessageId?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorCode?: string;
  errorMessage?: string;
}

/** Mensagem recebida, normalizada a partir do webhook do provedor. */
export interface NormalizedInbound {
  from: string; // telefone do profissional (E.164, sem prefixo de canal)
  to?: string;
  body: string;
  externalMessageId?: string;
  externalEventId?: string;
  raw: unknown;
}

/** Atualização de status de entrega (delivery receipt). */
export interface DeliveryUpdate {
  externalMessageId: string;
  status: MessageStatus; // SENT | DELIVERED | READ | FAILED
  errorCode?: string;
}

/** Cabeçalhos/corpo crus passados ao adapter para validar e parsear. */
export interface WebhookRequest {
  body: Record<string, any>;
  headers: Record<string, any>;
  url: string; // URL pública completa que o provedor chamou (p/ validar assinatura)
}

export interface WhatsAppProvider {
  /** Identificador estável: 'twilio' | 'openwa'. */
  readonly key: string;
  /** Oficial (homologado) ou não-oficial (automação WhatsApp Web — risco de ban). */
  readonly official: boolean;
  /** Há credenciais suficientes para operar? */
  isConfigured(): boolean;
  /** Envia uma mensagem; nunca lança — devolve SendResult com erro normalizado. */
  send(msg: OutboundMessage): Promise<SendResult>;
  /** Valida a autenticidade do webhook (assinatura/secret). */
  validateWebhook(req: WebhookRequest): boolean;
  /** Extrai uma mensagem inbound do payload, ou null se não for inbound. */
  parseInbound(req: WebhookRequest): NormalizedInbound | null;
  /** Extrai uma atualização de status de entrega, ou null. */
  parseStatus(req: WebhookRequest): DeliveryUpdate | null;
}

export const WHATSAPP_PROVIDERS = Symbol('WHATSAPP_PROVIDERS');

/** Normaliza um número para E.164 simples (remove prefixos de canal e símbolos). */
export function normalizePhone(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .replace(/^whatsapp:/i, '')
    .replace(/@c\.us$/i, '')
    .replace(/[^\d+]/g, '');
}
