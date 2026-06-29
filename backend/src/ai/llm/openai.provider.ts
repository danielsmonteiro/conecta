// Adapter OpenAI (Chat Completions) via REST — sem SDK, igual ao padrão do projeto.
import { Injectable, Logger } from '@nestjs/common';
import { LlmChatParams, LlmProvider, LlmResponse, LlmTurn, ToolCall, ToolDef } from './llm-provider.interface';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly key = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  defaultModel(): string {
    return process.env.AI_MODEL ?? 'gpt-4o-mini';
  }

  async chat(params: LlmChatParams): Promise<LlmResponse> {
    if (!this.isConfigured()) throw new Error('OPENAI_API_KEY ausente.');
    // Retry com backoff só em erros TRANSITÓRIOS (429/5xx/rede/timeout). Erros
    // permanentes (400/401/403/404/422 — payload/credencial) falham na hora.
    const maxRetries = Number(process.env.AI_LLM_RETRIES ?? 2);
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callOnce(params);
      } catch (err: any) {
        lastErr = err;
        if (!err?.retryable || attempt === maxRetries) throw err;
        const waitMs = err.retryAfterMs ?? Math.min(8000, 500 * 2 ** attempt);
        this.logger.warn(`OpenAI tentativa ${attempt + 1}/${maxRetries + 1} falhou (${err.message}); novo retry em ${waitMs}ms`);
        await this.sleep(waitMs);
      }
    }
    throw lastErr;
  }

  /** Uma chamada à OpenAI. Marca erros transitórios com `retryable` para o chat() reagir. */
  private async callOnce(params: LlmChatParams): Promise<LlmResponse> {
    const body = {
      model: params.model ?? this.defaultModel(),
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 500,
      messages: [{ role: 'system', content: params.system }, ...params.messages.map((m) => this.toOpenAi(m))],
      ...(params.tools?.length ? { tools: params.tools.map((t) => this.toolToOpenAi(t)), tool_choice: 'auto' } : {}),
    };

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 30000)),
      });
    } catch (e: any) {
      // Rede caída ou timeout (AbortError) → transitório.
      throw Object.assign(new Error(`OpenAI rede/timeout: ${e?.message ?? e}`), { retryable: true });
    }

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      const retryAfter = res.headers.get('retry-after');
      const retryAfterMs = retryAfter && !Number.isNaN(Number(retryAfter)) ? Number(retryAfter) * 1000 : undefined;
      this.logger.error(`OpenAI HTTP ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 300)}`);
      throw Object.assign(new Error(json?.error?.message ?? `OpenAI HTTP ${res.status}`), {
        retryable,
        retryAfterMs,
        status: res.status,
      });
    }

    const choice = json.choices?.[0];
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name,
      arguments: this.safeParse(tc.function?.arguments),
    }));
    return {
      text: choice?.message?.content ?? null,
      toolCalls,
      totalTokens: json.usage?.total_tokens ?? 0,
      finishReason: choice?.finish_reason ?? null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toOpenAi(m: LlmTurn): any {
    if (m.role === 'tool') return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  }

  private toolToOpenAi(t: ToolDef): any {
    return { type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } };
  }

  private safeParse(s: any) {
    if (typeof s !== 'string') return s ?? {};
    try {
      return JSON.parse(s);
    } catch {
      return {};
    }
  }
}
