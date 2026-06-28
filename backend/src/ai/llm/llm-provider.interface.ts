// Abstração de LLM (igual ao padrão dos canais de WhatsApp): o motor de IA não
// sabe qual provedor está em uso. OpenAI agora; Anthropic plugável depois.

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

/** Turno normalizado de conversa enviado ao modelo. */
export interface LlmTurn {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string; // role 'tool'
  name?: string; // role 'tool'
  toolCalls?: ToolCall[]; // role 'assistant'
}

export interface LlmResponse {
  text: string | null;
  toolCalls: ToolCall[];
  totalTokens: number;
  finishReason: string | null;
}

export interface LlmChatParams {
  system: string;
  messages: LlmTurn[];
  tools?: ToolDef[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProvider {
  readonly key: string; // 'openai' | 'anthropic'
  isConfigured(): boolean;
  defaultModel(): string;
  chat(params: LlmChatParams): Promise<LlmResponse>;
}
