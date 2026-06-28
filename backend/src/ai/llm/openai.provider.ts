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
    const body = {
      model: params.model ?? this.defaultModel(),
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 500,
      messages: [{ role: 'system', content: params.system }, ...params.messages.map((m) => this.toOpenAi(m))],
      ...(params.tools?.length ? { tools: params.tools.map((t) => this.toolToOpenAi(t)), tool_choice: 'auto' } : {}),
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 30000)),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`OpenAI HTTP ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 300)}`);
      throw new Error(json?.error?.message ?? `OpenAI HTTP ${res.status}`);
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
