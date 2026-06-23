# HealthMatch — Backend reconstruído (NestJS + Prisma)

Scaffold do backend reconstruído a partir dos **contratos de API recuperados**
(`recovered-healthmatch/BACKEND_RECONSTRUCTION.md` + `INTERACTIVE_FINDINGS.md`).
Reproduz o que foi observado em produção:

- Prefixo global **`/api`**, CORS com cookies.
- **Auth por cookie httpOnly** com access token curto + **`POST /api/auth/refresh`**.
- IDs `cuid`, datas em UTC, **hard delete** retornando `{ "success": true }`.
- Listagem paginada: `?limit=&page=&sortBy=&sortOrder=`.
- Detalhe em `GET /api/<recurso>/:id/profile` + sub-recursos `/:id/<aspecto>`.

## Stack

NestJS 10 · Prisma 5 (PostgreSQL) · Passport-JWT · class-validator.

## Setup

```bash
cd backend
npm install
cp .env.example .env          # ajuste DATABASE_URL e segredos JWT
npm run prisma:generate
npm run prisma:migrate         # cria as tabelas
SEED_ADMIN_EMAIL=voce@ex.com SEED_ADMIN_PASSWORD=suaSenha npm run db:seed
npm run start:dev              # http://localhost:3000/api
```

> Requer um PostgreSQL acessível pela `DATABASE_URL`.

## Endpoints implementados

| Área | Rotas |
|------|-------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Users | `GET /users/me` |
| Dashboard | `GET /dashboard/summary` |
| Settings | `GET /settings/branding` (público) |
| Organizations | CRUD + `/:id/profile`, `/:id/financial` |
| Contracts | CRUD + `/:id/profile`, `/:id/financial` |
| Vacancies | CRUD + `/:id/{profile,applications,kanban,matching,allocations,conversations,financial}` |
| Health Professionals | CRUD + `/:id/{profile,metrics,events,allocations,financial,conversations,channel-identities}` |
| Health Units | `GET /health-units`, `GET /health-units/:id` |
| Public Agencies | `GET /public-agencies`, `GET /public-agencies/:id` |
| Specialties | `GET /specialties` |
| Applications | `GET /applications` (+filtros), `GET /:id`, `POST`, `PATCH /:id/status`, `DELETE /:id` |
| Allocations | `GET /allocations`, `GET /allocations/schedule`, `GET /:id`, `POST`, `PATCH /:id/status`, `DELETE /:id` |
| Matching | `GET /matching/scores` (?vacancyId=&limit=) |
| Financial | `GET /financial/entries`, `GET /financial/summary` |
| Conversations | `GET /conversations`, `GET /:id`, `GET /:id/messages`, `POST /:id/messages`, `PATCH /:id` |
| AI | `GET /ai/status`, `GET /ai/conversation-runs` |
| Integrations | `GET /integrations/messaging/{providers,status}`, `GET /integrations/{outbound-message-logs,webhook-logs}` |
| Document Types | `GET /document-types` |

## Lógica de negócio implementada (não são mais stubs)

- **Matching** (`MatchingService`): score 0–100 explicável (especialidade, status,
  credenciais, indicação) + checagem de conflito de agenda com alocações.
- **Financeiro**: margem por vaga/contrato/organização, ganhos do profissional,
  `summary` (receita/custo/margem realizada + margem mensal estimada).
- **Dashboard**: agrega os cartões reais da tela (vagas, candidaturas, alocações,
  margem, pipeline, conversas, cobertura, banco de reserva).
- **Kanban**: candidaturas agrupadas por status.
- **Escrita operacional**: aprovar candidatura cria alocação; transições de alocação
  ajustam `filledDoctors` da vaga e os contadores em `ProfessionalMetrics`.
- **Conversas/IA/Integrações**: mensagens, runs de IA, provedores e logs reais.
- **Escala** (`/allocations/schedule`): montada a partir das alocações ativas.

### Ainda a evoluir
Motor de matching pode ganhar pesos por histórico/distância; envio real de mensagens
(hoje grava `OutboundMessageLog` com status `QUEUED`) precisa do adaptador do provedor.

## Mapa de contratos → código

- Payloads de criação validados pelos DTOs em `src/<recurso>/dto/` refletem
  exatamente os corpos capturados (ex.: `POST /api/vacancies`, `/api/contracts`,
  `/api/organizations`, `/api/health-professionals`).
- Enums em `prisma/schema.prisma` vêm dos `<select>` reais do frontend.
