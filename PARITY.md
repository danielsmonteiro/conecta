# HealthMatch — Matriz de Paridade (Produção × Destino)

> Auditoria feita em 2026-06-13 navegando **todas** as telas do app de produção
> (código perdido) via Chrome e capturando os endpoints/contratos reais que cada
> tela usa. Compara com o destino reconstruído (`backend/` + `frontend/`).
> Objetivo: garantir que **nada** que existe na produção falte no destino.

Legenda: ✅ existe e compatível · 🟡 existe mas diverge · ❌ falta no destino

---

## A. Endpoints por tela (produção)

| Tela (rota) | Endpoints usados | Destino |
|---|---|---|
| Dashboard `/app` | `dashboard/summary`, `vacancies`, `applications`, `allocations?startsFrom=`, `conversations`, `users/me`, `settings/branding` | 🟡 (falta `startsFrom`; faltam seções "Pendências críticas" e "Atividade recente") |
| Profissionais | `health-professionals`, `cbos` (busca no form) | 🟡 (falta `cbos`; campos) |
| Organizações | `organizations` | 🟡 campos |
| Órgãos Públicos | `organizations?limit=100`, `public-agencies` | 🟡 campos |
| Unidades | `organizations`, `public-agencies`, `health-units` | 🟡 campos |
| Contratos | `contracts` | 🟡 campos |
| Vagas | `vacancies` (+ `/:id/{profile,applications,kanban,matching,allocations,conversations,financial}`) | ✅ / 🟡 campos |
| Candidaturas | `vacancies?limit=100`, `applications` | 🟡 campos |
| Matching | `vacancies`, `matching/scores?page&limit` | 🟡 shape/paginação |
| Alocações | `vacancies`, `health-units`, `health-professionals`, `allocations` | 🟡 campos |
| Escala | `health-units`, `health-professionals`, `allocations/schedule` | ✅ |
| Financeiro | `financial/summary`, `financial/entries?overdueOnly&sortBy=dueDate` | 🟡 modelo diverge |
| Conversas | `conversations?limit=60`, `health-professionals`, `vacancies`, `applications`, `allocations` | 🟡 campos |
| I.A. | `ai/status`, `ai/conversation-runs?page&limit` | ✅ |
| Integrações | `integrations/messaging/{status,providers}`, `webhook-logs`, `outbound-message-logs` | ✅ |
| Auditoria | `audit-logs?page&limit` | ❌ **falta inteiro** |
| Configurações | `specialties?includeInactive`, `document-types?includeInactive`, `integrations/messaging/providers`, `ai/status`, `settings/branding` | 🟡 (falta `includeInactive`; campos) |

---

## B. Lacunas transversais (afetam tudo) ⚠️

1. **Envelope de paginação**: produção retorna `{ items: [...], pagination: { page, limit, total, totalPages } }`.
   O destino retorna `{ data: [...], meta: { total, page, limit, totalPages } }`. → **Padronizar para `{items, pagination}`** (afeta backend e o cliente do frontend).
2. **Auditoria (audit log)**: toda mutação na produção grava um `AuditLog`
   (`contracts.create`, `contracts.archive`, …) com `actorUser`, `action`,
   `entityType`, `entityId`, `payload`. → **Criar entidade + endpoint + escrita nas mutações.**
3. **Soft-state**: DELETE é na verdade *archive* (`*.archive`, `deletedAt`/`status=ARCHIVED`),
   não hard delete. O destino hoje faz hard delete. → alinhar para soft/archive.

---

## C. Módulos/endpoints faltando no destino

| Endpoint | Status | Ação |
|---|---|---|
| `GET /api/audit-logs` | ❌ | criar `AuditLog` + módulo + middleware de auditoria |
| `GET /api/cbos` (busca CBO) | ❌ | criar controller de `Cbo` (search por nome/código/CBO2002) |
| `allocations?startsFrom=` | ❌ filtro | adicionar filtro de data |
| `financial/entries?overdueOnly=&sortBy=dueDate` | ❌ filtro/campo | adicionar `dueDate`, `overdueOnly` |
| `specialties?includeInactive` / `document-types?includeInactive` | ❌ filtro | adicionar campo `active` + filtro |

---

## D. Paridade de campos por entidade (produção → faltando no destino)

**Vacancy** — falta: `requirementsCount`, `documentRequirementsCount` (computados);
ok no resto.

**HealthProfessional** — falta: `city`, `state`, `noShowCount`, `attendanceRate`.
`credentialStatus` usa `MISSING_DOCUMENTS` (destino: `MISSING_DATA`). Relações
`mainSpecialty`/`primaryCbo` retornadas como objeto.

**Cbo** — produção: `coCbo`, `name`, `normalizedName`, `cbo2002Code`,
`availableForAssignment`, `sourceProcedureCode`. Destino: só `name/code/cbo2002`.

**Organization** — falta: `publicAgenciesCount`, `healthUnitsCount` (computados).

**PublicAgency** — falta: `acronym`, `type` (ex.: `MUNICIPAL_GOVERNMENT`),
`sphere` (`MUNICIPAL`/…), `state`, `city`, `ibgeCode`, `document`,
`responsibleName`, `healthUnitsCount`, `contractsCount`, `organizationName`.

**Contract** — falta: `billingType`.

**Application** — falta: `origin`, `matchCategory`, `rejectionReason`,
`withdrawReason`, `hasPendingDocuments`, `hasMissingData`, `operationalConflict`.

**Allocation** — falta: `attendanceStatus`, `doctorAmount`, `clientAmount`,
`confirmedByDoctor`, `confirmedAt`, `approvedAt`, vínculo a `application`/`contract`/`healthUnit`.

**Conversation** — diverge: campo é `aiEnabled` (não `aiActive`); falta
`assignedToUser`, `lastMessagePreview`, `internalSummary`, `messagesCount`,
vínculos a `application`/`allocation`.

**Specialty** — falta: `slug`, `description`, `requiresRqe`,
`requiresSpecialistRegistry`, `active`, `deletedAt`.

**DocumentType** — diverge: falta `slug`, `description`, `requiredByDefault`,
`requiresExpirationDate`, `requiresManualReview`, `active`. (Destino tem `code/scope/required`.)

**FinancialEntry** — modelo diverge bastante. Produção:
`type` = `CLIENT_RECEIVABLE` | `PROFESSIONAL_PAYABLE` (e provavelmente de órgão),
`direction` = `IN`|`OUT`, `status` = `PENDING_APPROVAL`|`APPROVED`|`PAID`|`OVERDUE`|`CANCELLED`|`CONTESTED`,
`dueDate`, `competenceDate`, `approvedAt`, `paidAt`, relações
(`organization`, `publicAgency`, `doctor`, `healthUnit`, `contract`, `vacancy`, `allocation`).
Destino usa `REVENUE/COST` + `PROJECTED/PENDING/PAID`.

**Financial summary** — produção: `totalReceivable`, `totalPayable`,
`predictedReceivable`, `predictedPayable`, `approvedReceivable`, `approvedPayable`,
`paidReceivable`, `paidPayable`, `overdueReceivable`, `overduePayable`,
`cancelledAmount`, `contestedAmount`, `estimatedMargin`, `entriesCount`.

**Matching score** — produção: `{ score, category (LOW/MEDIUM/HIGH), eligible,
operationalConflict, ineligibilityReasons[], positiveReasons[], negativeReasons[],
doctor{...}, vacancyId, applicationId }`, **paginado**. Destino: `{professionalId,
professionalName, score, available, reasons[]}`.

---

## E. Telas do frontend (status atual)

✅ Login · Dashboard (parcial) · Vagas (lista/nova/detalhe) · Profissionais (lista) ·
Organizações (lista) · Contratos (lista)
❌ A construir: Órgãos Públicos, Unidades, Candidaturas, Matching, Alocações, Escala,
Financeiro, Conversas, I.A., Integrações, Auditoria, Configurações; formulários
"novo/editar" das demais entidades; seções "Pendências críticas" e "Atividade recente"
do dashboard; submenus aninhados na sidebar.

---

## ✅ Status final da reconciliação (paridade 1:1 — backend)

Todas as fases B–F de **dados/API** foram implementadas e validadas no Docker:

- ✅ **Fase 1** — Envelope `{items, pagination}` em todas as listas (backend + frontend).
- ✅ **Fase 2** — `AuditLog` + `GET /api/audit-logs` + interceptor global que audita
  toda mutação (`<recurso>.create/update/archive`) com ator; `GET /api/cbos`.
- ✅ **Fase 3** — Campos/enums enriquecidos: PublicAgency (`acronym/type/sphere/state/city/ibgeCode/document/responsibleName`),
  HealthProfessional (`city/state/noShowCount/attendanceRate`, `MISSING_DOCUMENTS`),
  Cbo (`coCbo/normalizedName/cbo2002Code/availableForAssignment/sourceProcedureCode`),
  Specialty (`slug/description/requiresRqe/requiresSpecialistRegistry/active`),
  DocumentType (`slug/description/requiredByDefault/requiresExpirationDate/requiresManualReview/active`),
  Contract (`billingType`), Application (`origin/matchCategory/rejection/withdraw/flags/operationalConflict`),
  Allocation (`attendanceStatus/doctorAmount/clientAmount/confirmed*/approvedAt` + vínculos),
  Conversation (`aiEnabled/assignedToUser/lastMessagePreview/internalSummary` + vínculos).
  Filtros `includeInactive` em specialties/document-types.
- ✅ **Fase 4** — FinancialEntry fiel (`CLIENT_RECEIVABLE/PROFESSIONAL_PAYABLE/…`,
  `direction IN/OUT`, status `PENDING_APPROVAL/APPROVED/PAID/OVERDUE/CANCELLED/CONTESTED`,
  `dueDate/competenceDate/approvedAt/paidAt` + relações); summary com as 14 métricas.
- ✅ **Fase 5** — Matching shape de produção (`score/category/eligible/operationalConflict/
  ineligibilityReasons/positiveReasons/negativeReasons`) **paginado**; filtros
  `startsFrom` (alocações) e `overdueOnly` (financeiro).
- ✅ **Fase 6** — Soft-delete/archive (DELETE → `deletedAt` + `status=ARCHIVED`, GET→404),
  refletido nos logs de auditoria como `*.archive`.
- ✅ **Fase 7** — Seed atualizado (lançamentos receivable/payable em vários status,
  auditoria de exemplo); validado no Docker (login → dashboard → listas).

**Frontend (atualizado):** as **12 telas restantes foram construídas e validadas**
no browser — Órgãos Públicos, Unidades, Candidaturas, Matching, Alocações, Escala,
Financeiro, Conversas, I.A., Integrações, Auditoria, Configurações — além de uma
página **404 estilizada** (`not-found.tsx`). Todas usam o envelope `{items}`,
o design system e dados reais. **Concluído também:** seções do dashboard "Pendências críticas" + "Atividade
recente" (abas); submenus aninhados na sidebar; formulários de **criação**
(profissional/organização/contrato); páginas de **detalhe** (profissional/
organização/contrato, com listas linkadas); **ações na UI** — aprovar/rejeitar
candidatura, confirmar/concluir/cancelar alocação, e **detalhe de conversa com
envio de mensagem**. Todos validados no browser.

**Edição (PUT) concluída:** telas de editar para vaga, profissional, organização
e contrato (pré-preenchidas, com conversão correta de datas), acessíveis via botão
"Editar" nos detalhes. Validado no browser. **Frontend e backend feature-complete
para paridade com a produção.**

---

## F. Plano de reconciliação (ordem sugerida)

1. **Contrato base**: padronizar paginação `{items, pagination}` (backend + cliente do frontend).
2. **Entidades faltantes**: `AuditLog` (+ escrita nas mutações) e controller de `Cbo`.
3. **Enriquecer entidades** (campos/enums acima) no `schema.prisma` + DTOs + serviços.
4. **Refazer domínio financeiro** (receivable/payable, status, dueDate, summary).
5. **Refinar matching** (category, eligible, reasons, paginação) e filtros
   (`startsFrom`, `overdueOnly`, `includeInactive`).
6. **Soft-delete/archive** no lugar de hard delete.
7. **Seed** atualizado e re-validação no Docker.
8. **Telas** do frontend restantes (item E) — depois da paridade de dados/API.
