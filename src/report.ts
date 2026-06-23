import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.js';
import { closeLogger, initLogger, log } from './logger.js';

interface EndpointSummary {
  key: string;
  method: string;
  template: string;
  resourceType: string;
  callCount: number;
  statuses: (number | null)[];
  observedOn: string[];
  sampleRequestBody: unknown;
  sampleResponse: unknown;
  sampleRequestHeaders: Record<string, string>;
  sampleResponseHeaders: Record<string, string>;
}

function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Extrai o segmento de recurso de um template tipo /api/users/:id → "users". */
function resourceOf(template: string): string {
  try {
    const path = new URL(template).pathname;
    const segs = path.split('/').filter((s) => s && !s.startsWith(':') && !/^v\d+$/i.test(s));
    const idx = segs.findIndex((s) => /^(api|rest|graphql)$/i.test(s));
    const after = idx >= 0 ? segs.slice(idx + 1) : segs;
    return after[0] || segs[segs.length - 1] || 'root';
  } catch {
    return 'root';
  }
}

function detectAuth(endpoints: EndpointSummary[]): string {
  const headerBlob = endpoints
    .flatMap((e) => Object.keys(e.sampleRequestHeaders || {}))
    .map((h) => h.toLowerCase());
  const set = new Set(headerBlob);
  const findings: string[] = [];
  if (set.has('authorization')) {
    const sample = endpoints.find((e) => e.sampleRequestHeaders?.['authorization'])?.sampleRequestHeaders?.[
      'authorization'
    ];
    if (sample && /bearer/i.test(sample)) {
      findings.push('**Bearer token** no header `Authorization` (provavel JWT/OAuth). Token enviado por chamada.');
    } else {
      findings.push('Header `Authorization` presente (esquema mascarado nos relatorios).');
    }
  }
  if (set.has('cookie') || set.has('x-xsrf-token') || set.has('x-csrf-token')) {
    findings.push('**Sessao por cookie** (cookie de sessao e/ou token CSRF detectados).');
  }
  if (set.has('x-api-key')) findings.push('Header `x-api-key` detectado (chave de API).');
  if (findings.length === 0)
    findings.push('Nao foi possivel inferir o modelo de auth a partir dos headers capturados.');
  return findings.map((f) => `- ${f}`).join('\n');
}

function fence(value: unknown): string {
  if (value === null || value === undefined) return '_(vazio)_';
  const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const truncated = str.length > 1200 ? str.slice(0, 1200) + '\n…(truncated)' : str;
  return '```json\n' + truncated + '\n```';
}

function main(): void {
  initLogger();
  const api = readJson<{ endpoints: EndpointSummary[]; totalCalls: number }>(PATHS.apiInventory);
  const routes = readJson<{ routes: { url: string; title: string; status: string }[]; skipped: unknown[] }>(
    PATHS.routesInventory,
  );

  if (!api || !routes) {
    log.error('Inventarios nao encontrados. Rode `npm run recover` antes de `npm run report`.');
    closeLogger();
    process.exitCode = 1;
    return;
  }

  const allEndpoints = api.endpoints ?? [];
  // Separa a API REST real (/api/*) do trafego de navegacao do Next.js (RSC)
  // e de telemetria de terceiros (Cloudflare RUM, etc.).
  const NOISE = /\/(cdn-cgi|_next)\b/i;
  const endpoints = allEndpoints.filter((e) => /\/api\//i.test(e.template) && !NOISE.test(e.template));
  const navEndpoints = allEndpoints.filter((e) => !/\/api\//i.test(e.template) && !NOISE.test(e.template));

  // Agrupa endpoints por recurso (entidade de dominio inferida).
  const byResource = new Map<string, EndpointSummary[]>();
  for (const e of endpoints) {
    const r = resourceOf(e.template);
    if (!byResource.has(r)) byResource.set(r, []);
    byResource.get(r)!.push(e);
  }

  const methodCount = endpoints.reduce<Record<string, number>>((acc, e) => {
    acc[e.method] = (acc[e.method] || 0) + 1;
    return acc;
  }, {});

  const now = new Date().toISOString();
  const md: string[] = [];

  md.push(`# HealthMatch — Análise para Reconstrução do Backend`);
  md.push(`\n> Gerado automaticamente em ${now} a partir de \`api-inventory.json\` e \`routes-inventory.json\`.`);
  md.push(`> Dados sensíveis foram mascarados na captura. Revise manualmente antes de publicar.\n`);

  md.push(`## 1. Visão geral`);
  md.push(`- Stack do frontend detectada: **Next.js (App Router)** — rotas servidas como React Server Components.`);
  md.push(`- Rotas de frontend visitadas: **${routes.routes.length}**`);
  md.push(`- Endpoints da **API REST** (\`/api/*\`) distintos: **${endpoints.length}**`);
  md.push(`- Requisições de navegação RSC (\`/app/*\`, ignoradas na modelagem): **${navEndpoints.length}**`);
  md.push(`- Total de chamadas XHR/Fetch observadas: **${api.totalCalls}**`);
  md.push(`- Entidades de domínio inferidas (a partir de \`/api/*\`): **${byResource.size}**`);
  md.push(
    `- Distribuição de métodos (apenas API REST): ${Object.entries(methodCount)
      .map(([m, c]) => `\`${m}\`×${c}`)
      .join(', ') || '_n/d_'}`,
  );

  md.push(`\n## 2. Modelo de autenticação aparente`);
  md.push(detectAuth(endpoints));

  md.push(`\n## 3. Rotas do frontend`);
  md.push(`| # | Rota | Título | Status |`);
  md.push(`|---|------|--------|--------|`);
  routes.routes.forEach((r, i) => {
    md.push(`| ${i + 1} | \`${new URL(r.url).pathname}\` | ${(r.title || '').replace(/\|/g, '/')} | ${r.status} |`);
  });

  md.push(`\n## 4. Entidades de domínio inferidas`);
  md.push(`Cada recurso abaixo é candidato a uma tabela/coleção e a um módulo de rotas no backend.\n`);
  for (const [resource, eps] of [...byResource.entries()].sort()) {
    md.push(`### \`${resource}\``);
    md.push(`Operações observadas:`);
    md.push(`| Método | Path | Chamadas | Status |`);
    md.push(`|--------|------|----------|--------|`);
    for (const e of eps.sort((a, b) => a.method.localeCompare(b.method))) {
      const p = new URL(e.template).pathname;
      md.push(`| \`${e.method}\` | \`${p}\` | ${e.callCount} | ${e.statuses.join(', ')} |`);
    }
    // Campos inferidos a partir do primeiro response com objeto.
    const withObj = eps.find((e) => e.sampleResponse && typeof e.sampleResponse === 'object');
    if (withObj) {
      const fields = inferFields(withObj.sampleResponse);
      if (fields.length) {
        md.push(`\nCampos inferidos do response:`);
        md.push(fields.map((f) => `- \`${f.name}\`: ${f.type}`).join('\n'));
      }
    }
    md.push('');
  }

  md.push(`## 5. Catálogo detalhado de endpoints`);
  for (const e of endpoints.sort((a, b) => a.template.localeCompare(b.template))) {
    md.push(`\n### \`${e.method}\` ${new URL(e.template).pathname}`);
    md.push(`- Chamadas: ${e.callCount} | Status: ${e.statuses.join(', ')} | Tipo: ${e.resourceType}`);
    md.push(`- Observado em: ${e.observedOn.map((o) => `\`${safePath(o)}\``).join(', ')}`);
    if (e.sampleRequestBody) {
      md.push(`\n**Payload de request (amostra, mascarado):**`);
      md.push(fence(e.sampleRequestBody));
    }
    md.push(`\n**Response (amostra, mascarado):**`);
    md.push(fence(e.sampleResponse));
  }

  md.push(`\n## 6. Sugestão de estrutura inicial do backend`);
  md.push(suggestion([...byResource.keys()]));

  md.push(`\n## 7. Próximos passos`);
  md.push(`1. Validar entidades e relacionamentos do bloco 4 contra a regra de negócio real.`);
  md.push(`2. Definir o schema do banco (uma tabela por entidade + chaves estrangeiras inferidas dos paths aninhados).`);
  md.push(`3. Implementar autenticação conforme o bloco 2 antes de qualquer endpoint protegido.`);
  md.push(`4. Implementar endpoints na ordem: \`auth\` → \`GET\` (leitura) → \`POST/PUT/DELETE\` (escrita).`);
  md.push(`5. Usar os responses de amostra como contrato de testes de integração.`);
  md.push(`6. Reidratar o frontend a partir de \`assets/\` e \`html/\` apontando para o novo backend.`);

  // Anexa os achados da captura interativa (escrita + auth), se existirem,
  // para que o documento consolidado nao se perca ao regenerar o report.
  const interactivePath = path.join(path.dirname(PATHS.backendDoc), 'INTERACTIVE_FINDINGS.md');
  if (fs.existsSync(interactivePath)) {
    const interactive = fs.readFileSync(interactivePath, 'utf8');
    md.push(`\n\n---\n\n# Apêndice — Captura interativa (escrita + autenticação)`);
    md.push(`> Conteúdo consolidado de \`INTERACTIVE_FINDINGS.md\` (sessão dirigida via Claude in Chrome).\n`);
    md.push(interactive);
  }

  fs.writeFileSync(PATHS.backendDoc, md.join('\n') + '\n', 'utf8');
  log.info(`Documento gerado: ${PATHS.backendDoc}`);

  // eslint-disable-next-line no-console
  console.log(`\n\x1b[32m✓ BACKEND_RECONSTRUCTION.md gerado com ${endpoints.length} endpoints e ${byResource.size} entidades.\x1b[0m`);
  closeLogger();
}

function safePath(u: string): string {
  try {
    return new URL(u).pathname;
  } catch {
    return u;
  }
}

function inferFields(obj: unknown): { name: string; type: string }[] {
  let target = obj;
  if (Array.isArray(obj)) target = obj[0];
  if (target && typeof target === 'object' && 'data' in (target as object)) {
    const d = (target as Record<string, unknown>).data;
    if (Array.isArray(d)) target = d[0];
    else if (d && typeof d === 'object') target = d;
  }
  if (!target || typeof target !== 'object') return [];
  return Object.entries(target as Record<string, unknown>).map(([name, v]) => ({
    name,
    type: Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v,
  }));
}

function suggestion(resources: string[]): string {
  const clean = resources.filter((r) => r && r !== 'root').slice(0, 30);
  const routesList = clean.map((r) => `│   │   ├── ${r}.routes.ts`).join('\n');
  return [
    'Stack sugerida: **Node.js + Express/Fastify + TypeScript + Prisma** (ajuste à sua preferência).',
    '',
    '```',
    'backend/',
    '├── src/',
    '│   ├── index.ts            # bootstrap do servidor',
    '│   ├── auth/               # login, refresh, middleware de token',
    '│   ├── routes/',
    routesList || '│   │   └── (definir conforme entidades)',
    '│   ├── controllers/        # 1 por entidade',
    '│   ├── services/           # regra de negócio',
    '│   ├── models/             # schema Prisma / entidades',
    '│   └── middleware/         # auth, CORS, logging, erro',
    '├── prisma/schema.prisma',
    '└── package.json',
    '```',
    '',
    `Módulos de rota candidatos (a partir das entidades inferidas): ${clean.map((c) => `\`${c}\``).join(', ') || '_n/d_'}.`,
  ].join('\n');
}

main();
