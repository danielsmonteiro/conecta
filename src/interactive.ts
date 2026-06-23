import fs from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Response } from 'playwright';
import { loadConfig, PATHS, type RecoveryConfig } from './config.js';
import { closeLogger, initLogger, log } from './logger.js';
import {
  maskHeaders,
  parseBody,
  sleep,
  slugify,
  templatizePath,
} from './util.js';
import type { ApiCall } from './types.js';

/**
 * Modo de captura INTERATIVA.
 * Abre o Chromium visivel na tela de login. O usuario loga e navega
 * manualmente (inclusive disparando fluxos de escrita POST/PUT/DELETE).
 * O script grava em segundo plano: chamadas XHR/Fetch, HAR e screenshots
 * a cada navegacao. Encerra quando o usuario fecha o navegador ou Ctrl+C.
 */

const HAR_PATH = path.join(PATHS.out, 'session-interactive.har');
const INVENTORY_PATH = path.join(PATHS.out, 'api-inventory-interactive.json');
const SHOTS_DIR = path.join(PATHS.screenshots, 'interactive');

const apiCalls: ApiCall[] = [];
let currentRoute = '(login)';
let shotCounter = 0;
let lastShotUrl = '';

const API_LIKE = /\/(api|v\d+|graphql|rest|oauth|auth|token)\b/i;
const NOISE = /\/(cdn-cgi|_next\/static)\b/i;

function attachCapture(context: BrowserContext): void {
  context.on('response', (response: Response) => {
    void recordResponse(response).catch(() => {});
  });
}

async function recordResponse(response: Response): Promise<void> {
  const request = response.request();
  const type = request.resourceType();
  const url = request.url();
  if (NOISE.test(url)) return;

  const isApi = type === 'xhr' || type === 'fetch' || API_LIKE.test(url);
  if (!isApi) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  const respHeaders = await response.allHeaders().catch(() => ({}) as Record<string, string>);
  const reqHeaders = await request.allHeaders().catch(() => ({}) as Record<string, string>);
  const contentType = respHeaders['content-type'] ?? null;

  let sample: unknown = null;
  if (contentType && /json|text|graphql/i.test(contentType)) {
    try {
      const body = await response.text();
      sample = body.length > 1500 ? body.slice(0, 1500) + '…(truncated)' : body;
      try {
        sample = parseBody(typeof sample === 'string' ? sample : JSON.stringify(sample));
      } catch {
        /* mantem texto */
      }
    } catch {
      sample = '(corpo indisponivel)';
    }
  }

  const method = request.method();
  apiCalls.push({
    method,
    url,
    endpoint: parsed.origin + parsed.pathname,
    template: parsed.origin + templatizePath(parsed.pathname),
    resourceType: type,
    requestHeaders: maskHeaders(reqHeaders),
    requestBody: parseBody(request.postData()),
    status: response.status(),
    statusText: response.statusText(),
    responseHeaders: maskHeaders(respHeaders),
    responseContentType: contentType,
    responseSample: sample,
    observedOn: currentRoute,
    timestamp: new Date().toISOString(),
  });

  // Destaca metodos de escrita no log — sao o alvo do modo interativo.
  if (/^(POST|PUT|PATCH|DELETE)$/i.test(method)) {
    log.info(`✏️  ${method} ${parsed.pathname} → ${response.status()}`);
  }
}

function saveInventory(): void {
  const grouped = new Map<string, ApiCall[]>();
  for (const c of apiCalls) {
    const k = `${c.method} ${c.template}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(c);
  }
  const endpoints = [...grouped.entries()].map(([key, calls]) => {
    const s = calls[0];
    return {
      key,
      method: s.method,
      template: s.template,
      resourceType: s.resourceType,
      callCount: calls.length,
      statuses: [...new Set(calls.map((c) => c.status))],
      observedOn: [...new Set(calls.map((c) => c.observedOn))],
      sampleRequestBody: s.requestBody,
      sampleResponse: s.responseSample,
      sampleRequestHeaders: s.requestHeaders,
      sampleResponseHeaders: s.responseHeaders,
    };
  });
  fs.writeFileSync(
    INVENTORY_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), mode: 'interactive', totalCalls: apiCalls.length, endpoints, rawCalls: apiCalls }, null, 2),
    'utf8',
  );
}

async function scrubFile(filePath: string, needle: string, replacement: string): Promise<void> {
  if (!needle || !fs.existsSync(filePath)) return;
  const tmp = filePath + '.tmp';
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const output = fs.createWriteStream(tmp, { encoding: 'utf8' });
  const carryLen = needle.length - 1;
  let carry = '';
  await new Promise<void>((resolve, reject) => {
    input.on('data', (chunk: string | Buffer) => {
      const data = carry + chunk.toString();
      const replaced = data.split(needle).join(replacement);
      const keep = replaced.length > carryLen ? replaced.length - carryLen : 0;
      output.write(replaced.slice(0, keep));
      carry = replaced.slice(keep);
    });
    input.on('end', () => output.end(carry, () => resolve()));
    input.on('error', reject);
    output.on('error', reject);
  });
  fs.renameSync(tmp, filePath);
}

async function main(): Promise<void> {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  fs.mkdirSync(PATHS.logs, { recursive: true });
  initLogger();

  let cfg: RecoveryConfig;
  try {
    cfg = loadConfig();
  } catch (e) {
    log.error((e as Error).message);
    closeLogger();
    process.exitCode = 1;
    return;
  }

  log.info('=== MODO INTERATIVO — captura dirigida pelo usuario ===');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordHar: { path: HAR_PATH, content: 'embed' },
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  attachCapture(context);

  const page = await context.newPage();

  // Screenshot automatico a cada navegacao de pagina principal (com debounce).
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    currentRoute = url;
    if (url === lastShotUrl || url === 'about:blank') return;
    lastShotUrl = url;
    void (async () => {
      await sleep(1200);
      const name = `${String(++shotCounter).padStart(3, '0')}_${slugify(url)}.png`;
      await page.screenshot({ path: path.join(SHOTS_DIR, name), fullPage: true }).catch(() => {});
      log.info(`📷 ${name}  (${url})`);
    })();
  });

  await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

  // Autosave periodico para nao perder captura se algo travar.
  const autosave = setInterval(() => saveInventory(), 15000);

  printInstructions();

  let finished = false;
  const finalize = async () => {
    if (finished) return;
    finished = true;
    clearInterval(autosave);
    log.info('Encerrando: salvando inventario e HAR...');
    saveInventory();
    await context.close().catch(() => {}); // flush HAR
    await browser.close().catch(() => {});
    await scrubFile(HAR_PATH, cfg.password, '***PASSWORD_REDACTED***').catch(() => {});
    printSummary();
    closeLogger();
    process.exit(0);
  };

  // Encerra quando o usuario fecha o navegador...
  context.on('close', () => void finalize());
  browser.on('disconnected', () => void finalize());
  // ...ou quando pressiona Ctrl+C no terminal.
  process.on('SIGINT', () => void finalize());
  process.on('SIGTERM', () => void finalize());

  // Mantem o processo vivo enquanto o navegador estiver aberto.
  await new Promise<void>(() => {});
}

function printInstructions(): void {
  // eslint-disable-next-line no-console
  console.log(`
\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────┐
│  MODO INTERATIVO ATIVO — o navegador esta sob seu controle    │
└──────────────────────────────────────────────────────────────┘\x1b[0m
  • Faca login digitando suas credenciais na janela do Chromium.
  • Navegue normalmente: abra menus, listas, detalhes, formularios.
  • Para mapear ESCRITA, dispare as acoes reais (criar/editar/salvar).
    Cada POST/PUT/PATCH/DELETE aparece aqui com ✏️ em tempo real.
  • Screenshots (📷) sao salvas a cada tela visitada.

  Quando terminar:  FECHE a janela do navegador  ou  pressione Ctrl+C.
  Tudo sera salvo em:
    • api-inventory-interactive.json
    • session-interactive.har  (senha redigida)
    • screenshots/interactive/
`);
}

function printSummary(): void {
  const endpoints = new Set(apiCalls.map((c) => `${c.method} ${c.template}`)).size;
  const writes = apiCalls.filter((c) => /^(POST|PUT|PATCH|DELETE)$/i.test(c.method)).length;
  // eslint-disable-next-line no-console
  console.log(`
\x1b[1m── RESUMO DA SESSAO INTERATIVA ──\x1b[0m
  Chamadas capturadas:   ${apiCalls.length}
  Endpoints distintos:   ${endpoints}
  Chamadas de escrita:   ${writes}  (POST/PUT/PATCH/DELETE)
  Screenshots:           ${shotCounter}

  Compare com api-inventory.json e rode 'npm run report' para consolidar.
`);
}

void main();
