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

/** Tipo normalizado da mensagem (texto vs não-texto). */
export type InboundMessageType =
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'unknown';

/** Mensagem recebida, normalizada a partir do webhook do provedor. */
export interface NormalizedInbound {
  from: string; // telefone do profissional (E.164, sem prefixo de canal)
  to?: string;
  body: string;
  messageType?: InboundMessageType; // 'text' p/ texto; outro = mídia/não-texto
  senderName?: string; // nome de perfil do WhatsApp (dado real), p/ semear o cadastro
  externalMessageId?: string;
  externalEventId?: string;
  raw: unknown;
}

const MEDIA_LABELS: Record<string, string> = {
  audio: 'áudio',
  image: 'imagem',
  video: 'vídeo',
  document: 'documento',
  sticker: 'figurinha',
  location: 'localização',
  contact: 'contato',
  unknown: 'mídia',
};

/** Normaliza um MIME (audio/ogg) ou um tipo do engine (chat/ptt/image) para InboundMessageType. */
export function normalizeMediaType(raw?: string): InboundMessageType {
  if (!raw) return 'unknown';
  const v = raw.toLowerCase();
  const base = v.includes('/') ? v.split('/')[0] : v;
  if (base.startsWith('audio') || base === 'voice' || base === 'ptt') return 'audio';
  if (base.startsWith('image')) return 'image';
  if (base.startsWith('video')) return 'video';
  if (base.startsWith('application') || base === 'document') return 'document';
  if (base === 'sticker') return 'sticker';
  if (base === 'location') return 'location';
  if (base === 'contact' || base === 'vcard' || base === 'multi_vcard') return 'contact';
  if (base === 'text' || base === 'chat') return 'text';
  return 'unknown';
}

/** Placeholder textual para uma mídia (ex.: "[áudio]"), gravado no lugar do texto. */
export function mediaPlaceholder(type: InboundMessageType): string {
  return `[${MEDIA_LABELS[type] ?? 'mídia'}]`;
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
  rawBody?: string; // corpo cru (bytes) p/ validação HMAC (OpenWA)
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
