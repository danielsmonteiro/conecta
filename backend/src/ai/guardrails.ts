// Guardrails determinísticos (defesa em profundidade, além do system prompt).
// Conservadores e de alta confiança para minimizar falso-positivo numa conversa
// real de plantão.

// Tentativas de manipular as instruções/papel da IA (prompt-injection) na ENTRADA.
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b[^.]*\b(instru\w*|regra\w*|prompt|rules?|previous|prior|above|anterior\w*|acima)\b/i,
  /\bdesconsider\w+\b[^.]*\b(instru\w*|regra\w*|tudo|acima|anterior\w*)\b/i,
  /\besque[çc]a\b[^.]*\b(instru\w*|regra\w*|tudo|suas)\b/i,
  /\b(voc[êe]|tu)\s+(agora|a partir de agora)\s+(é|e|ser[áa]|vai ser|atua)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bsystem\s*prompt\b/i,
  /\b(modo|mode)\s+(desenvolvedor|developer|debug|admin|root|deus|god)\b/i,
  /\baja\s+como\s+(se|um|uma|outro|administrador|admin|o sistema)\b/i,
  /\b(revele|mostre|repita|imprima|me diga|conte)\b[^.]*\b(prompt|instru\w*|regra\w*)\b/i,
  /\bjailbreak\b|\bDAN\b/i,
];

// Vazamento das instruções internas na resposta GERADA (saída).
const LEAK_PATTERNS: RegExp[] = [
  /REGRAS DE SEGURAN/i,
  /system\s*prompt/i,
  /minhas?\s+instru[çc][õo]es/i,
  /assistente de conting[êe]ncia do healthmatch/i, // trecho literal do system prompt
];

export function detectInjection(text?: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

export function looksLikePromptLeak(text?: string): boolean {
  if (!text) return false;
  return LEAK_PATTERNS.some((re) => re.test(text));
}

// Mensagem segura usada quando um guardrail dispara (entrada ou saída).
export const GUARDRAIL_SAFE_REPLY =
  'Vou te encaminhar para um atendente humano para te ajudar melhor. Um instante 🙂';
