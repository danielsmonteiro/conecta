import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do projeto (um nivel acima de src/). */
export const PROJECT_ROOT = path.resolve(__dirname, '..');

/** Pasta unica de saida exigida pelos requisitos. */
export const OUT_DIR = path.join(PROJECT_ROOT, 'recovered-healthmatch');

export const PATHS = {
  out: OUT_DIR,
  screenshots: path.join(OUT_DIR, 'screenshots'),
  html: path.join(OUT_DIR, 'html'),
  assets: path.join(OUT_DIR, 'assets'),
  logs: path.join(OUT_DIR, 'logs'),
  har: path.join(OUT_DIR, 'session.har'),
  log: path.join(OUT_DIR, 'logs', 'recovery.log'),
  apiInventory: path.join(OUT_DIR, 'api-inventory.json'),
  routesInventory: path.join(OUT_DIR, 'routes-inventory.json'),
  backendDoc: path.join(OUT_DIR, 'BACKEND_RECONSTRUCTION.md'),
  readme: path.join(OUT_DIR, 'README.md'),
} as const;

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Variavel de ambiente obrigatoria ausente: ${name}. ` +
        `Copie .env.example para .env e preencha as credenciais.`,
    );
  }
  return v.trim();
}

function intEnv(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return /^(1|true|yes|sim)$/i.test(v.trim());
}

export interface RecoveryConfig {
  loginUrl: string;
  user: string;
  password: string;
  origin: string;
  maxDepth: number;
  maxPages: number;
  pageTimeout: number;
  headless: boolean;
  allowNavClicks: boolean;
}

export function loadConfig(): RecoveryConfig {
  const loginUrl = required('HEALTHMATCH_URL');
  const origin = new URL(loginUrl).origin;
  return {
    loginUrl,
    user: required('HEALTHMATCH_USER'),
    password: required('HEALTHMATCH_PASSWORD'),
    origin,
    maxDepth: intEnv('HEALTHMATCH_MAX_DEPTH', 3),
    maxPages: intEnv('HEALTHMATCH_MAX_PAGES', 80),
    pageTimeout: intEnv('HEALTHMATCH_PAGE_TIMEOUT', 20000),
    headless: boolEnv('HEALTHMATCH_HEADLESS', true),
    allowNavClicks: boolEnv('HEALTHMATCH_ALLOW_NAV_CLICKS', true),
  };
}

/**
 * Palavras que indicam acoes destrutivas / mutadoras. Qualquer link, botao ou
 * controle cujo texto/atributos contenham um destes termos NUNCA sera clicado.
 */
export const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'apagar',
  'excluir',
  'deletar',
  'cancelar',
  'finalizar',
  'confirmar',
  'salvar',
  'cadastrar',
  'enviar',
  'submit',
  'destroy',
  'logout',
  'sair',
  'desconectar',
  'pagar',
  'comprar',
  'aprovar',
  'rejeitar',
  'bloquear',
  'desativar',
  'editar',
  'update',
  'atualizar',
];
