// Utilitários de LGPD: opt-out, aviso de privacidade e redação de PII.

// Palavras de descadastro (alta confiança — devem vir praticamente sozinhas para
// não dar falso-positivo, ex.: "não pare de me mandar vagas").
const OPT_OUT_WORDS = new Set([
  'pare',
  'parar',
  'sair',
  'stop',
  'cancelar',
  'descadastrar',
  'remover',
  'sai',
  'unsubscribe',
]);

export function isOptOut(text?: string): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase().replace(/[!.?]+$/, '');
  if (OPT_OUT_WORDS.has(t)) return true;
  return /\b(parar|cancelar|n[ãa]o quero)\s+(de\s+)?receber\b/.test(t);
}

/** Mascara dígitos mantendo só os 4 últimos de cada sequência (telefones, etc.). */
export function maskPhone(s?: string | null): string {
  if (!s) return s ?? '';
  return String(s).replace(/\d(?=\d{4})/g, '*');
}

/** Redação de PII em texto livre de log (telefone + CPF). */
export function redactPII(s?: string | null): string {
  if (!s) return s ?? '';
  return maskPhone(String(s)).replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***CPF***');
}

// Campos de payload de webhook que carregam telefone → mascarar ao persistir o log.
const PHONE_KEYS = ['From', 'To', 'WaId', 'from', 'to', 'sender', 'recipient', 'chatId', 'author'];

/** Cópia do payload com telefones mascarados (o log fica auditável sem expor PII). */
export function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const out: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  for (const k of Object.keys(out)) {
    if (PHONE_KEYS.includes(k) && typeof out[k] === 'string') out[k] = maskPhone(out[k] as string);
  }
  return out;
}

/** Aviso de privacidade enviado no primeiro contato (transparência, Art. 9 LGPD). */
export function privacyNotice(): string {
  const url = process.env.PRIVACY_POLICY_URL;
  const politica = url ? ` Política de privacidade: ${url}.` : '';
  return (
    'Olá! Aqui é o assistente virtual do HealthMatch 🤖. ' +
    'Usamos seu número apenas para falar sobre oportunidades de plantão; seus dados são tratados ' +
    `conforme a LGPD.${politica} ` +
    'Se não quiser mais receber mensagens, responda PARE.'
  );
}

export const OPT_OUT_CONFIRMATION =
  'Pronto, você não receberá mais mensagens nossas. Se mudar de ideia, é só nos escrever. 👋';
