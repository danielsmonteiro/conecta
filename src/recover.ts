import fs from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Page, type Response } from 'playwright';
import { loadConfig, PATHS, type RecoveryConfig } from './config.js';
import { closeLogger, initLogger, log } from './logger.js';
import {
  looksDestructive,
  maskHeaders,
  normalizeUrl,
  parseBody,
  routeKey,
  sleep,
  slugify,
  templatizePath,
} from './util.js';
import type {
  ApiCall,
  AssetRecord,
  RecoverySummary,
  SkippedItem,
  VisitedRoute,
} from './types.js';

/* ------------------------------------------------------------------ *
 * Estado global da coleta
 * ------------------------------------------------------------------ */
const apiCalls: ApiCall[] = [];
const assetUrls = new Set<string>();
const visited: VisitedRoute[] = [];
const skipped: SkippedItem[] = [];
const visitedKeys = new Set<string>();
let currentRoute = '(login)';

const API_LIKE = /\/(api|v\d+|graphql|rest|oauth|auth|token)\b/i;
const ASSET_TYPES = new Set(['script', 'stylesheet', 'image', 'font']);

function ensureDirs(): void {
  for (const dir of [PATHS.out, PATHS.screenshots, PATHS.html, PATHS.assets, PATHS.logs]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/* ------------------------------------------------------------------ *
 * Captura passiva de rede (XHR/Fetch + assets)
 * ------------------------------------------------------------------ */
function attachNetworkCapture(context: BrowserContext, cfg: RecoveryConfig): void {
  context.on('response', (response: Response) => {
    void recordResponse(response, cfg).catch((e) =>
      log.warn(`Falha ao registrar response ${response.url()}: ${(e as Error).message}`),
    );
  });
}

async function recordResponse(response: Response, cfg: RecoveryConfig): Promise<void> {
  const request = response.request();
  const type = request.resourceType();
  const url = request.url();

  // Coleta URLs de assets (mesma origem) para download posterior.
  if (ASSET_TYPES.has(type) && url.startsWith(cfg.origin)) {
    assetUrls.add(url);
  }

  const isApi = type === 'xhr' || type === 'fetch' || API_LIKE.test(url);
  if (!isApi) return;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }

  const respHeaders = await safeHeaders(() => response.allHeaders());
  const reqHeaders = await safeHeaders(() => request.allHeaders());
  const contentType = respHeaders['content-type'] ?? null;

  let sample: unknown = null;
  if (contentType && /json|text|graphql/i.test(contentType)) {
    try {
      const body = await response.text();
      sample = summarizeBody(body, contentType);
    } catch {
      sample = '(corpo indisponivel)';
    }
  } else if (contentType) {
    sample = `(${contentType} — corpo binario/omitido)`;
  }

  apiCalls.push({
    method: request.method(),
    url,
    endpoint: parsedUrl.origin + parsedUrl.pathname,
    template: parsedUrl.origin + templatizePath(parsedUrl.pathname),
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
}

async function safeHeaders(fn: () => Promise<Record<string, string>>): Promise<Record<string, string>> {
  try {
    return await fn();
  } catch {
    return {};
  }
}

function summarizeBody(body: string, contentType: string): unknown {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (/json|graphql/i.test(contentType)) {
    try {
      return parseBody(trimmed);
    } catch {
      /* fallthrough */
    }
  }
  return trimmed.length > 1500 ? trimmed.slice(0, 1500) + '…(truncated)' : trimmed;
}

/* ------------------------------------------------------------------ *
 * Login
 * ------------------------------------------------------------------ */
async function login(page: Page, cfg: RecoveryConfig): Promise<boolean> {
  log.info(`Acessando pagina de login: ${cfg.loginUrl}`);
  await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded', timeout: cfg.pageTimeout });
  await page.waitForLoadState('networkidle', { timeout: cfg.pageTimeout }).catch(() => {});

  const emailField = page
    .locator(
      'input[type="email"], input[name="email"], input[name="username"], input[id*="email" i], input[name*="user" i]',
    )
    .first();
  const passwordField = page.locator('input[type="password"]').first();

  try {
    await emailField.waitFor({ state: 'visible', timeout: cfg.pageTimeout });
    await passwordField.waitFor({ state: 'visible', timeout: cfg.pageTimeout });
  } catch {
    log.error('Campos de login (email/senha) nao encontrados. Verifique a URL e o layout.');
    return false;
  }

  await emailField.fill(cfg.user);
  await passwordField.fill(cfg.password);
  log.info('Credenciais preenchidas (mascaradas nos logs). Enviando formulario...');

  // Aguarda a resposta da API de autenticacao como sinal confiavel de sucesso
  // (apps SPA/Next.js fazem o redirect via client-side router depois do 2xx).
  const authRespPromise = page
    .waitForResponse(
      (r) => /\/(api\/)?(auth\/)?(login|signin|sessions?|token)\b/i.test(r.url()) && r.request().method() === 'POST',
      { timeout: cfg.pageTimeout },
    )
    .catch(() => null);

  await passwordField.press('Enter').catch(async () => {
    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")')
      .first();
    await submitBtn.click({ timeout: cfg.pageTimeout }).catch(() => {});
  });

  const authResp = await authRespPromise;
  let success = false;
  if (authResp) {
    const ok = authResp.status() >= 200 && authResp.status() < 300;
    log.info(`Resposta de auth: ${authResp.request().method()} ${authResp.url()} → ${authResp.status()}`);
    success = ok;
  }

  // Da tempo ao client-side router e confirma saida da tela de login.
  await page
    .waitForURL((u) => !/login|signin|entrar/i.test(u.toString()), { timeout: cfg.pageTimeout })
    .catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: cfg.pageTimeout }).catch(() => {});
  await sleep(1000);

  const stillOnLogin = /login|signin|entrar/i.test(page.url());
  const hasPasswordField = (await page.locator('input[type="password"]').count()) > 0;
  // Sucesso se a API confirmou OU se ja saimos da tela de login.
  success = success || (!stillOnLogin && !hasPasswordField);

  if (success) {
    log.info(`Login bem-sucedido. URL atual: ${page.url()}`);
  } else {
    log.error(`Login parece ter falhado — ainda na tela de login (${page.url()}).`);
  }
  return success;
}

/* ------------------------------------------------------------------ *
 * Descoberta de links / navegacao
 * ------------------------------------------------------------------ */
async function discoverLinks(page: Page, cfg: RecoveryConfig): Promise<string[]> {
  const hrefs = await page
    .evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = (a as HTMLAnchorElement).getAttribute('href');
        if (href) out.push(href);
      });
      return out;
    })
    .catch(() => [] as string[]);

  const result = new Set<string>();
  for (const href of hrefs) {
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:'))
      continue;
    const norm = normalizeUrl(href, page.url());
    if (!norm) continue;
    if (!norm.startsWith(cfg.origin)) continue; // apenas mesma origem
    result.add(norm);
  }
  return [...result];
}

/**
 * Descobre rotas acionadas por cliques em elementos de navegacao (SPA sem href).
 * Conservador: ignora qualquer elemento com texto/atributo destrutivo.
 */
async function discoverViaNavClicks(page: Page, cfg: RecoveryConfig, baseUrl: string): Promise<string[]> {
  if (!cfg.allowNavClicks) return [];

  const candidates = await page
    .evaluate(() => {
      const sel =
        'nav a, nav button, aside a, aside button, [role="navigation"] a, [role="navigation"] button, [role="tab"], .sidebar a, .sidebar button, .menu a, .menu button, .nav-link';
      const items: { text: string; aria: string; title: string }[] = [];
      document.querySelectorAll(sel).forEach((el) => {
        items.push({
          text: (el.textContent || '').trim().slice(0, 60),
          aria: el.getAttribute('aria-label') || '',
          title: el.getAttribute('title') || '',
        });
      });
      return items;
    })
    .catch(() => [] as { text: string; aria: string; title: string }[]);

  const found = new Set<string>();
  const max = Math.min(candidates.length, 30);

  for (let i = 0; i < max; i++) {
    const c = candidates[i];
    if (looksDestructive(c.text, c.aria, c.title)) {
      skipped.push({ reason: 'nav-click destrutivo bloqueado', context: c.text || c.aria || c.title });
      continue;
    }
    const sel =
      'nav a, nav button, aside a, aside button, [role="navigation"] a, [role="navigation"] button, [role="tab"], .sidebar a, .sidebar button, .menu a, .menu button, .nav-link';
    const el = page.locator(sel).nth(i);
    try {
      await el.click({ timeout: 4000, trial: false });
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await sleep(400);
      const norm = normalizeUrl(page.url());
      if (norm && norm.startsWith(cfg.origin) && norm !== baseUrl) found.add(norm);
    } catch {
      // elemento nao clicavel/oculto — ignora silenciosamente
    } finally {
      // volta para a pagina base para o proximo candidato
      if (normalizeUrl(page.url()) !== baseUrl) {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: cfg.pageTimeout }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      }
    }
  }
  return [...found];
}

/* ------------------------------------------------------------------ *
 * Visita de uma rota
 * ------------------------------------------------------------------ */
async function visitRoute(
  page: Page,
  cfg: RecoveryConfig,
  url: string,
  depth: number,
): Promise<string[]> {
  const key = routeKey(url);
  if (visitedKeys.has(key)) return [];
  visitedKeys.add(key);
  currentRoute = url;

  const record: VisitedRoute = {
    url,
    routeKey: key,
    title: '',
    depth,
    status: 'ok',
    discoveredLinks: 0,
  };

  try {
    log.info(`[d${depth}] Visitando: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.pageTimeout });
    await page.waitForLoadState('networkidle', { timeout: cfg.pageTimeout }).catch(() => {});
    await sleep(800);

    record.title = (await page.title().catch(() => '')) || '';

    const base = slugify(url);
    const shotPath = path.join(PATHS.screenshots, `${base}.png`);
    const htmlPath = path.join(PATHS.html, `${base}.html`);

    await page.screenshot({ path: shotPath, fullPage: true }).catch(async (e) => {
      log.warn(`Screenshot fullPage falhou (${e.message}); tentando viewport.`);
      await page.screenshot({ path: shotPath }).catch(() => {});
    });
    record.screenshot = path.relative(PATHS.out, shotPath);

    const html = await page.content().catch(() => '');
    fs.writeFileSync(htmlPath, html, 'utf8');
    record.html = path.relative(PATHS.out, htmlPath);

    const links = await discoverLinks(page, cfg);
    const navLinks = await discoverViaNavClicks(page, cfg, url);
    const all = [...new Set([...links, ...navLinks])];
    record.discoveredLinks = all.length;
    visited.push(record);
    return all;
  } catch (e) {
    record.status = 'error';
    record.note = (e as Error).message;
    visited.push(record);
    skipped.push({ url, reason: `erro ao visitar: ${(e as Error).message}` });
    log.error(`Falha ao visitar ${url}: ${(e as Error).message}`);
    return [];
  }
}

/* ------------------------------------------------------------------ *
 * Download de assets
 * ------------------------------------------------------------------ */
async function downloadAssets(context: BrowserContext, cfg: RecoveryConfig): Promise<AssetRecord[]> {
  const records: AssetRecord[] = [];
  const urls = [...assetUrls];
  log.info(`Baixando ${urls.length} assets (mesma origem)...`);

  for (const url of urls) {
    const rec: AssetRecord = { url, type: guessAssetType(url), savedAs: null, status: null, bytes: null };
    try {
      const resp = await context.request.get(url, { timeout: cfg.pageTimeout });
      rec.status = resp.status();
      if (resp.ok()) {
        const buf = await resp.body();
        rec.bytes = buf.byteLength;
        const u = new URL(url);
        let rel = u.pathname.replace(/^\/+/, '');
        if (!rel || rel.endsWith('/')) rel += 'index';
        const dest = path.join(PATHS.assets, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buf);
        rec.savedAs = path.relative(PATHS.out, dest);
      }
    } catch (e) {
      rec.error = (e as Error).message;
      skipped.push({ url, reason: `download de asset falhou: ${rec.error}` });
    }
    records.push(rec);
  }
  return records;
}

/**
 * Substitui todas as ocorrencias de `needle` por `replacement` em um arquivo,
 * via streaming (memoria constante). Mantem um "carry" para nao perder matches
 * que cruzam a fronteira de dois chunks. Escreve em um .tmp e troca no final.
 */
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
      // Preserva o final que pode conter um match parcial.
      const keep = replaced.length > carryLen ? replaced.length - carryLen : 0;
      output.write(replaced.slice(0, keep));
      carry = replaced.slice(keep);
    });
    input.on('end', () => {
      output.end(carry, () => resolve());
    });
    input.on('error', reject);
    output.on('error', reject);
  });

  fs.renameSync(tmp, filePath);
}

function guessAssetType(url: string): string {
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  if (['js', 'mjs', 'cjs'].includes(ext)) return 'script';
  if (ext === 'css') return 'stylesheet';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif'].includes(ext)) return 'image';
  if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) return 'font';
  return 'other';
}

/* ------------------------------------------------------------------ *
 * Persistencia dos inventarios
 * ------------------------------------------------------------------ */
function writeInventories(assets: AssetRecord[]): void {
  // Agrupa chamadas por template para o inventario de API.
  const grouped = new Map<string, ApiCall[]>();
  for (const call of apiCalls) {
    const k = `${call.method} ${call.template}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(call);
  }

  const endpoints = [...grouped.entries()].map(([key, calls]) => {
    const sample = calls[0];
    return {
      key,
      method: sample.method,
      template: sample.template,
      resourceType: sample.resourceType,
      callCount: calls.length,
      statuses: [...new Set(calls.map((c) => c.status))],
      observedOn: [...new Set(calls.map((c) => c.observedOn))],
      sampleRequestBody: sample.requestBody,
      sampleResponse: sample.responseSample,
      sampleRequestHeaders: sample.requestHeaders,
      sampleResponseHeaders: sample.responseHeaders,
    };
  });

  fs.writeFileSync(
    PATHS.apiInventory,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), totalCalls: apiCalls.length, endpoints, rawCalls: apiCalls },
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    PATHS.routesInventory,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalRoutes: visited.length,
        routes: visited,
        skipped,
        assets,
      },
      null,
      2,
    ),
    'utf8',
  );
  log.info(`Inventarios salvos: ${endpoints.length} endpoints, ${visited.length} rotas.`);
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */
async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  ensureDirs();
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

  log.info(`Origem alvo: ${cfg.origin} | maxDepth=${cfg.maxDepth} | maxPages=${cfg.maxPages}`);

  const browser = await chromium.launch({ headless: cfg.headless });
  const context = await browser.newContext({
    recordHar: { path: PATHS.har, content: 'embed' },
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  attachNetworkCapture(context, cfg);

  const page = await context.newPage();
  page.setDefaultTimeout(cfg.pageTimeout);

  let loginSucceeded = false;
  let assets: AssetRecord[] = [];

  try {
    loginSucceeded = await login(page, cfg);
    if (!loginSucceeded) {
      log.error('Abortando crawl autenticado pois o login falhou.');
    } else {
      // BFS a partir da pagina pos-login. Se o redirect client-side nao tirou
      // a gente da tela de login, vai direto para a landing autenticada (/app).
      if (/login|signin|entrar/i.test(page.url())) {
        log.info('Ainda na tela de login apos auth; navegando para /app.');
        await page.goto(cfg.origin + '/app', { waitUntil: 'domcontentloaded', timeout: cfg.pageTimeout }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: cfg.pageTimeout }).catch(() => {});
      }
      const seed = normalizeUrl(page.url()) ?? cfg.origin + '/app';
      const queue: { url: string; depth: number }[] = [{ url: seed, depth: 0 }];

      while (queue.length > 0 && visited.length < cfg.maxPages) {
        const { url, depth } = queue.shift()!;
        if (visitedKeys.has(routeKey(url))) continue;

        const discovered = await visitRoute(page, cfg, url, depth);
        if (depth < cfg.maxDepth) {
          for (const d of discovered) {
            if (!visitedKeys.has(routeKey(d))) queue.push({ url: d, depth: depth + 1 });
          }
        } else {
          for (const d of discovered) {
            if (!visitedKeys.has(routeKey(d)))
              skipped.push({ url: d, reason: `nao visitado: profundidade > ${cfg.maxDepth}` });
          }
        }
      }

      if (visited.length >= cfg.maxPages) {
        log.warn(`Limite de ${cfg.maxPages} paginas atingido. Restantes na fila: ${queue.length}.`);
        for (const q of queue) skipped.push({ url: q.url, reason: 'limite maxPages atingido' });
      }

      assets = await downloadAssets(context, cfg);
    }
  } catch (e) {
    log.error(`Erro fatal no crawl: ${(e as Error).message}`);
  } finally {
    await context.close(); // flush do HAR
    await browser.close();
  }

  // Remove a senha em texto puro do HAR bruto (o HAR captura o corpo do POST
  // de login). Streaming para suportar arquivos grandes com seguranca.
  try {
    await scrubFile(PATHS.har, cfg.password, '***PASSWORD_REDACTED***');
    log.info('Senha removida do session.har.');
  } catch (e) {
    log.warn(`Nao foi possivel scrubbar o HAR: ${(e as Error).message}`);
  }

  writeInventories(assets);

  const finishedAt = new Date().toISOString();
  const summary: RecoverySummary = {
    startedAt,
    finishedAt,
    loginSucceeded,
    origin: cfg.origin,
    routesVisited: visited.length,
    apiEndpoints: new Set(apiCalls.map((c) => `${c.method} ${c.template}`)).size,
    apiCalls: apiCalls.length,
    screenshots: visited.filter((v) => v.screenshot).length,
    assets: assets.filter((a) => a.savedAs).length,
    skipped: skipped.length,
  };
  fs.writeFileSync(path.join(PATHS.out, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  printSummary(summary);
  closeLogger();
}

function printSummary(s: RecoverySummary): void {
  const line = '─'.repeat(54);
  // eslint-disable-next-line no-console
  console.log(`
\x1b[1m┌${line}┐
│  RESUMO EXECUTIVO — RECUPERACAO HEALTHMATCH          │
└${line}┘\x1b[0m
  Login:                  ${s.loginSucceeded ? '\x1b[32mOK\x1b[0m' : '\x1b[31mFALHOU\x1b[0m'}
  Rotas visitadas:        ${s.routesVisited}
  Endpoints de API:       ${s.apiEndpoints}
  Chamadas XHR/Fetch:     ${s.apiCalls}
  Screenshots:            ${s.screenshots}
  Assets baixados:        ${s.assets}
  Itens ignorados:        ${s.skipped}

  Artefatos em: recovered-healthmatch/
    • session.har          (sessao de rede completa)
    • api-inventory.json   (endpoints + payloads + respostas)
    • routes-inventory.json(rotas, skips e assets)
    • screenshots/  html/  assets/  logs/

  Proximos passos:
    1) npm run report   → gera BACKEND_RECONSTRUCTION.md
    2) Revise api-inventory.json para confirmar entidades e contratos
    3) Modele DB a partir das entidades inferidas no doc
    4) Implemente endpoints na ordem: auth → leitura (GET) → escrita
`);
}

void main();
