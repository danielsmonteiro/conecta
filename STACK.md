# HealthMatch — Aplicação (backend + frontend)

Aplicação reconstruída a partir dos artefatos recuperados em `recovered-healthmatch/`.

- **backend/** — NestJS + Prisma (PostgreSQL). API REST sob `/api`.
- **frontend/** — Next.js (App Router) + Tailwind v4, fiel ao design recuperado
  (tokens `--hm-*`, sidebar navy, primary `#0b74d1`). Faz proxy de `/api` para o backend.
- **db** — PostgreSQL 16.

## Rodar em desenvolvimento (hot reload)

```bash
docker compose up --build
```

- Frontend: http://localhost:3001
- Backend:  http://localhost:3000/api
- Postgres: localhost:5432

O backend sincroniza o schema (`prisma db push`) e roda o seed automaticamente.
Login padrão (seed): **admin@healthmatch.local** / **changeme123**
(ajustável via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Rodar em produção

```bash
# defina segredos reais no ambiente (ou em um .env ao lado do compose)
export POSTGRES_USER=... POSTGRES_PASSWORD=... \
       JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... \
       SEED_ON_START=true   # só no primeiro deploy

docker compose -f docker-compose.prod.yml up --build -d
```

- Backend em modo build enxuto (`node dist/src/main.js`), migrações via
  `prisma migrate deploy` (cai para `db push` se ainda não houver migrações).
- Frontend em modo `next start` (output standalone).
- `COOKIE_SECURE=true` por padrão (sirva atrás de HTTPS).

## Arquitetura de autenticação

Cookies httpOnly (`access_token` + `refresh_token`), mesmo modelo da produção
recuperada. O frontend chama `/api/*` (mesma origem, via rewrite do Next), e em
401 o cliente chama `/api/auth/refresh` e repete a requisição.

## Estrutura do frontend

```
frontend/app/
├── layout.tsx          # root (html/body, globals.css)
├── login/page.tsx      # /login
└── (app)/              # route group com o shell autenticado (sidebar + topbar)
    ├── layout.tsx
    ├── page.tsx        # / (dashboard)
    ├── vagas/          # lista, nova, detalhe (matching + financeiro)
    ├── profissionais/  organizacoes/  contratos/
```

> Nota: o painel autenticado fica na raiz (`/`, `/vagas`, …) usando um route group
> `(app)`, em vez de um segmento literal `/app` — isso evita uma colisão de chunks
> do `next dev` com o diretório `app/` do App Router.

## Páginas implementadas

Login, Dashboard (dados reais), Vagas (lista + nova + detalhe com matching/financeiro),
Profissionais, Organizações, Contratos. Os demais itens do menu (Candidaturas,
Matching, Alocações, Escala, Financeiro, Conversas, I.A., Integrações, Auditoria,
Configurações) têm os endpoints prontos no backend — faltam as telas.

## Memória por usuário (atendimento personalizado por IA)

O bot de WhatsApp mantém uma **memória por profissional** para personalizar o atendimento
(ex.: *"Vi que você é técnica de enfermagem em Fortaleza e prefere plantões noturnos — tenho
uma vaga compatível"*).

### Fluxo (a cada mensagem recebida)

1. **Identificação pelo WhatsApp** — `MessagingService.ingestInbound` acha o `HealthProfessional`
   pelo número (últimos 8 dígitos).
2. **Criação automática** — se o número não existe, cria um cadastro mínimo
   (`status=INCOMPLETE`, `origin=SELF_SIGNUP`); o nome usa o *profile name* real do WhatsApp.
3. **Persistência das mensagens** — toda mensagem (inbound/outbound) é salva em `Message`.
4. **Carga da memória** — antes de chamar a OpenAI, `AiEngineService.run` carrega a memória e a
   injeta no *system prompt* (bloco "MEMÓRIA DO PROFISSIONAL").
5. **Resposta personalizada** — a IA usa a memória para não repetir perguntas e propor vagas compatíveis.
6. **Atualização da memória** — durante a execução, a IA chama a tool `atualizar_memoria` com
   **apenas o que o profissional informou** (nunca inventa). O serviço grava só os campos preenchidos.
7. **Candidatura** — ao demonstrar interesse claro, a IA chama `registrar_candidatura`
   (cria `Application` PENDING, `origin=AI`).

### Onde os dados ficam

- **`HealthProfessional`** — nome, cidade, estado, especialidade principal (campos do cadastro).
- **`ProfessionalMemory`** (1:1, nova tabela) — `profession`, `specialtyName`, `availability`,
  `salaryExpectation`, `vacancyPreferences`, `presentedVacancyIds` (vagas já apresentadas),
  `summary` (resumo evolutivo).
- **`Application`** — candidaturas feitas.
- **`Message`** — histórico das conversas.

### Não inventar (garantia)

A escrita só ocorre via tool `atualizar_memoria`, chamada pelo modelo com o que o usuário
declarou; o `ProfessionalMemoryService` grava **somente campos preenchidos** (descarta vazios).
O *system prompt* reforça "NUNCA invente nem deduza".

### Inspeção

`GET /api/memory/:professionalId` retorna o perfil + memória + candidaturas do profissional.

### Migração

O modelo `ProfessionalMemory` é aplicado por `prisma db push` no boot do backend (convenção do
projeto — sem pasta de migrations). Reiniciar o backend cria a tabela.

## Fila durável de IA (Redis/BullMQ)

O processamento de IA dos inbounds **não é mais "promise solta"**: cada mensagem
recebida enfileira um job durável (BullMQ sobre Redis) consumido por um worker.

- **Durabilidade:** jobs ficam no Redis (AOF) → sobrevivem a restart/crash do backend.
- **Retry:** `attempts=3` com backoff exponencial; em erro transitório (ex.: OpenAI 5xx)
  o `run()` lança e o BullMQ reprocessa.
- **Coalescing de rajada:** `delay` (= `AI_DEBOUNCE_MS`, default 4s) + `jobId` por conversa
  unificam várias mensagens seguidas numa única execução/resposta.
- **Arquitetura:** producer em `src/queue/` (fila `ai-inbound`), worker `AiInboundWorker`
  no `AiModule` chama `AiEngineService.processInbound`. Requer o serviço `redis` no compose
  (`REDIS_HOST`/`REDIS_PORT`). Ajustes: `AI_WORKER_CONCURRENCY`, `AI_JOB_ATTEMPTS`.

> Limite conhecido: serialização por conversa depende do coalescing por `jobId` (uma
> mensagem que chegue durante o run ativo é reprocessada na próxima mensagem). Para
> garantia estrita multi-instância, um lock por conversa no Redis seria o próximo passo.

## Resiliência da chamada de IA (retry + fallback)

Além do retry da fila (job), a própria chamada à OpenAI tem retry fino e há um fallback
quando tudo falha — para o usuário nunca ficar "no silêncio":

- **Retry/backoff no provider** (`openai.provider.ts`): erros TRANSITÓRIOS (HTTP 429/5xx,
  rede, timeout) são reexecutados com backoff exponencial (`AI_LLM_RETRIES`, default 2;
  respeita `Retry-After`). Erros PERMANENTES (400/401/403/404/422 — payload/credencial)
  falham na hora, sem retry.
- **Fallback de falha final** (`AiInboundWorker` → `AiEngineService.handleInboundFailure`):
  quando o job esgota os retries (`AI_JOB_ATTEMPTS`), envia uma mensagem de cortesia
  (`AI_FALLBACK_MESSAGE`) e transfere a conversa para humano (`WAITING_HUMAN`), parando a
  auto-resposta. Assim a falha vira escalonamento, não dead-air.

Knobs (todas no compose, com defaults): `AI_DEBOUNCE_MS`, `AI_TIMEOUT_MS`, `AI_LLM_RETRIES`,
`AI_JOB_ATTEMPTS`, `AI_WORKER_CONCURRENCY`, `AI_FALLBACK_MESSAGE`.

## Mensagens não-texto (mídia)

Áudio, imagem, vídeo, documento, figurinha, localização e contato são detectados nos
adapters e tratados com elegância (antes a IA recebia corpo vazio/"lixo"):

- **Normalização** (`whatsapp-provider.interface.ts`): `parseInbound` define `messageType`
  e, quando não há texto, grava um placeholder legível no corpo (`[áudio]`, `[imagem]`…).
  Twilio usa `NumMedia`/`MediaContentType0` (+ `Latitude/Longitude` p/ localização);
  OpenWA usa o `type` do payload. Legenda (caption) é preservada quando existe.
- **Resposta da IA**: o system prompt instrui a pedir gentilmente uma mensagem de TEXTO
  ao receber mídia, sem tentar adivinhar o conteúdo.

> Extensão futura: transcrever áudio (Whisper) e descrever imagem (visão) em vez de só
> pedir texto — a normalização por `messageType` já deixa o gancho pronto.

## Guardrails / anti-injection

Defesa em profundidade contra manipulação (prompt-injection) e desvio de escopo:

- **System prompt endurecido:** trata mensagens do profissional como CONTEÚDO (não comandos),
  ignora pedidos de mudar papel/regras ou revelar o prompt; nunca promete/negocia valores ou
  dá conselho médico/jurídico/financeiro; nunca aprova candidatura/confirma cobertura sozinho.
- **Guardrail de ENTRADA** (`guardrails.ts` → `detectInjection`): padrões de alta confiança
  ("ignore as instruções", "você agora é…", "modo desenvolvedor", "revele o prompt", jailbreak…).
  Ao detectar, NÃO chama a LLM — envia mensagem segura e faz handoff para humano.
- **Guardrail de SAÍDA** (`looksLikePromptLeak`): se a resposta gerada vazar instruções internas,
  troca por mensagem segura e encaminha para humano.
- Toggle `AI_GUARDRAILS_ENABLED` (default `true`). Padrões conservadores p/ evitar falso-positivo.

## Notificação de handoff ao operador

Quando a IA transfere uma conversa para humano (`WAITING_HUMAN`) — por pedido, aceite de
plantão, guardrail ou falha — o operador é avisado ativamente (além do contador no dashboard):

- `OperatorNotifierService` é acionado em todo `handoff()`. Registra em log e, se
  `OPERATOR_NOTIFY_WEBHOOK_URL` estiver setado, faz POST de um JSON com `text`/`content`
  (compatível com Slack/Teams/Discord) + campos estruturados (`event`, `conversationId`,
  `professional`, `reason`, `url`), incluindo **link direto** para a conversa
  (`PUBLIC_BASE_URL/conversas/:id`). Best-effort (timeout `OPERATOR_NOTIFY_TIMEOUT_MS`, 5s).
- Sem webhook configurado → só log + o dashboard ("Aguardando humano").
