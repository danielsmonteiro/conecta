// Constantes e helpers da fila durável (BullMQ/Redis) do processamento de IA.

export const AI_INBOUND_QUEUE = 'ai-inbound';
export const AI_INBOUND_QUEUE_TOKEN = 'AI_INBOUND_QUEUE';

/** Conexão Redis (BullMQ cria/gerencia a instância ioredis a partir destas opções). */
export function redisConnection() {
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };
}

/**
 * Opções por job de inbound:
 * - delay = janela de debounce (agrupa mensagens em rajada).
 * - jobId por conversa = coalescing DURÁVEL: enquanto houver um job pendente/ativo
 *   da mesma conversa, novos adds são unificados (uma execução por rajada).
 */
export function inboundJobOptions(conversationId: string) {
  return {
    delay: Number(process.env.AI_DEBOUNCE_MS ?? 4000),
    jobId: `inbound-${conversationId}`, // BullMQ proíbe ':' no jobId (separador de chave)
  };
}
