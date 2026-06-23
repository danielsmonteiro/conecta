import { DESTRUCTIVE_KEYWORDS } from './config.js';

/** Converte uma URL/rota em um nome de arquivo seguro e estavel. */
export function slugify(input: string): string {
  let s = input
    .replace(/^https?:\/\//, '')
    .replace(/[?#].*$/, '') // remove query/hash do nome (mantido na URL registrada)
    .replace(/[^a-zA-Z0-9._/-]/g, '_')
    .replace(/\//g, '__')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) s = 'root';
  if (s.length > 120) s = s.slice(0, 120);
  return s;
}

/** Normaliza uma URL para deduplicacao (remove hash, ordena nada, mantem query). */
export function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    // remove trailing slash redundante (exceto raiz)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return null;
  }
}

/** Chave de deduplicacao de rota: ignora a query para nao explodir o crawl. */
export function routeKey(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

const DESTRUCTIVE_RE = new RegExp(`\\b(${DESTRUCTIVE_KEYWORDS.join('|')})`, 'i');

/** true se o texto/atributos sugerem acao destrutiva ou mutadora. */
export function looksDestructive(...parts: (string | null | undefined)[]): boolean {
  const blob = parts.filter(Boolean).join(' ').toLowerCase();
  return DESTRUCTIVE_RE.test(blob);
}

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'x-api-key',
  'x-csrf-token',
  'x-xsrf-token',
]);

/** Mascara valores de headers sensiveis, preservando o formato/prefixo. */
export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(k.toLowerCase())) {
      out[k] = maskValue(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function maskValue(v: string): string {
  if (!v) return v;
  const m = v.match(/^(Bearer|Basic|Token)\s+(.*)$/i);
  if (m) return `${m[1]} ***MASKED(${m[2].length} chars)***`;
  if (v.length <= 8) return '***MASKED***';
  return `${v.slice(0, 4)}…***MASKED(${v.length} chars)***`;
}

const SENSITIVE_FIELD_RE =
  /(senha|password|passwd|secret|token|authorization|cpf|cnpj|cartao|card|cvv|rg|email)/i;

/** Mascara recursivamente campos sensiveis em payloads JSON. */
export function maskPayload(value: unknown, depth = 0): unknown {
  if (depth > 6) return '***DEPTH_LIMIT***';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => maskPayload(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_RE.test(k) && typeof v === 'string') {
        out[k] = maskValue(v);
      } else {
        out[k] = maskPayload(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Tenta interpretar um corpo como JSON; senao retorna truncado. */
export function parseBody(body: string | null | undefined): unknown {
  if (!body) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return maskPayload(JSON.parse(trimmed));
  } catch {
    // nao e JSON (form-urlencoded, texto, etc.)
    const masked = trimmed.replace(/(password|senha|token)=([^&\s]+)/gi, '$1=***MASKED***');
    return masked.length > 2000 ? masked.slice(0, 2000) + '…(truncated)' : masked;
  }
}

/** Substitui IDs numericos/uuids no path por placeholders para agrupar endpoints. */
export function templatizePath(pathname: string): string {
  return pathname
    .split('/')
    .map((seg) => {
      if (/^\d+$/.test(seg)) return ':id';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':uuid';
      if (/^[0-9a-f]{24}$/i.test(seg)) return ':objectId';
      return seg;
    })
    .join('/');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
