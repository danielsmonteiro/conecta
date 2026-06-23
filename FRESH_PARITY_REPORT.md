# HealthMatch — Reverificação de Paridade (Produção × Reconstrução)

> Recheck do início ao fim em 2026-06-13. Verdade da produção capturada AO VIVO
> (campos reais de cada endpoint via fetch autenticado) e confrontada com o código
> da reconstrução (`backend/`, `frontend/`). Foco: contratos de API e shape.

## Veredito geral

A **base CRUD e o domínio de dados estão em paridade sólida**. As divergências
remanescentes estão concentradas em **endpoints agregados/de configuração** e em
**campos computados de listagem**. Nenhuma entidade ou endpoint está faltando;
o que diverge é **shape/campos** de alguns retornos.

---

## ✅ Em paridade (confirmado)

| Área | Observação |
|---|---|
| Envelope de lista | `{items, pagination}` em toda a API ✓ |
| Financeiro | `summary` (14 métricas) e `entries` (20 campos) idênticos ✓ |
| Applications | campos idênticos (origin, matchCategory, flags, operationalConflict) ✓ |
| Allocations | idênticos (attendanceStatus, confirmedByDoctor, amounts, vínculos) ✓ |
| Conversations (entidade) | idênticos (aiEnabled, lastMessagePreview, internalSummary, messagesCount) ✓ |
| Matching score | shape idêntico (score/category/eligible/reasons) ✓ |
| Specialties / DocumentTypes | campos idênticos (slug, requiresRqe, active…) ✓ |
| Audit-logs / CBOs | idênticos ✓ |
| Vacancies / Contracts / Organizations / PublicAgencies (entidade) | campos batem (com exceção dos *counts* de lista, abaixo) ✓ |
| users/me, settings/branding | idênticos ✓ |

---

## 🔴 Divergências confirmadas (em código)

### 1. `GET /api/dashboard/summary` — shape totalmente diferente (ALTA)
- **Produção:** objeto **plano com 61 contadores** — `registeredDoctors`,
  `openVacancies`, `urgentVacancies`, `pendingApplications`, `eligibleApplications`,
  `calculatedMatches`, `perfectMatches`, `confirmedAllocations`, `noShowAllocations`,
  `pendingDocuments`, `totalReceivable`, `overdueFinancialEntries`,
  `openConversations`, `waitingHumanConversations`, `aiRunsToday`, `aiFailedRuns`,
  `aiHandoffs`, `operationalAlerts`, `organizationsCount`, … (61 no total).
- **Reconstrução** (`backend/src/dashboard/dashboard.module.ts`): objeto **aninhado**
  com 7 grupos (`vacancies`, `applications`, `allocations`, `financial`, `pipeline`,
  `conversations`, `coverage`).
- **Ação:** reescrever `summary()` para retornar o objeto plano com as 61 chaves;
  ajustar o frontend (`app/(app)/page.tsx`) para consumir o novo shape.

### 2. `GET /api/ai/status` — estatísticas vs configuração (ALTA)
- **Produção:** config da IA — `enabled, dryRun, autoReplyEnabled, model,
  reasoningEffort, hasOpenAiKey, maxContextMessages, requireHumanForCriticalActions,
  provider, isConfigured`.
- **Reconstrução** (`backend/src/ai/ai.module.ts`): `enabled, model, conversations,
  aiActiveConversations, coveragePercent, totalRuns` (estatísticas).
- **Ação:** retornar o objeto de configuração da IA (com defaults via env).

### 3. `GET /api/ai/conversation-runs` — campos faltando (MÉDIA)
- **Produção:** `trigger, dryRun, inputMessagesCount, outputMessage, toolCallsCount,
  actionsCount, aiInteractionId, conversation, aiInteraction`.
- **Reconstrução:** `id, conversationId, status, model, outcome, tokensUsed, startedAt,
  finishedAt`.
- **Ação:** enriquecer o model `AiConversationRun` + retorno.

### 4. `HealthUnit` — entidade rasa (MÉDIA)
- **Produção:** `legalName, cnpj, city, state, phone, email, mainContactName,
  requiresHumanApproval, contactsCount, rulesCount, documentRequirementsCount`.
- **Reconstrução** (`prisma model HealthUnit`): basicamente `name, type, status,
  organizationId`.
- **Ação:** adicionar campos ao schema + retorno; contadores computados na lista.

### 5. Integrações — config Twilio e logs rasos (MÉDIA)
- **`messaging/status` produção:** `provider, hasAccountSid, hasAuthToken,
  hasPhoneNumber, hasWhatsappFrom, hasTestWhatsappTo, validateSignatureEnabled,
  isConfigured, twilioMessagingServiceConfigured`. **Nosso:** `{configured,
  activeCount, defaultProvider, providers}`.
- **`messaging/providers` produção:** descritor `{provider, channel, enabled,
  configured}`. **Nosso:** entidade `{id, name, type, status, isDefault}`.
- **`outbound-message-logs` produção:** 17 campos (`channel, from, contentType,
  externalMessageId, requestPayload, responsePayload, errorCode, errorMessage,
  sentAt, conversation, message`). **Nosso:** `{id, providerId, conversationId, to,
  body, status, error, createdAt}`.
- **`webhook-logs` produção:** `channel, eventType, externalEventId, headers,
  processed, processedAt`. **Nosso:** `{provider, event, payload, statusCode,
  receivedAt}`.
- **Ação:** alinhar shape de status/providers (config) e enriquecer os logs.

---

## 🟡 Divergências menores — *counts* computados na LISTAGEM (BAIXA/MÉDIA)

A produção inclui contadores agregados já nos itens de lista; nossas listas não:

| Lista | Falta no item |
|---|---|
| `organizations` | `publicAgenciesCount`, `healthUnitsCount` |
| `public-agencies` | `organizationName`, `healthUnitsCount`, `contractsCount` |
| `vacancies` | `requirementsCount`, `documentRequirementsCount` |
| `health-units` | `contactsCount`, `rulesCount`, `documentRequirementsCount` |

- **Ação:** adicionar `_count`/contadores nos `findMany` das listas correspondentes.

---

## Plano de correção priorizado

1. **(ALTA)** `dashboard/summary` plano (61 chaves) + ajustar frontend.
2. **(ALTA)** `ai/status` como configuração.
3. **(MÉDIA)** Enriquecer `HealthUnit` (campos + counts).
4. **(MÉDIA)** Alinhar Integrações (status/providers config + logs ricos).
5. **(MÉDIA)** `ai/conversation-runs` (trigger/dryRun/toolCallsCount/actionsCount).
6. **(BAIXA)** Counts computados nas listagens (organizations, public-agencies,
   vacancies, health-units).

Nada disso é entidade/endpoint faltando — é **alinhamento de shape/campos**. O núcleo
funcional permanece fiel.

---

## ✅ Correções aplicadas e validadas (2026-06-14)

Todas as 6 divergências foram corrigidas e validadas (API + frontend no Docker):

1. **`dashboard/summary`** → reescrito como **objeto plano com 61 chaves** idêntico
   à produção (registeredDoctors, openVacancies, perfectMatches, overdueFinancialEntries,
   aiRunsToday, operationalAlerts, …). Frontend ajustado para o shape plano. ✅
2. **`ai/status`** → agora retorna **configuração** (enabled, dryRun, autoReplyEnabled,
   model, reasoningEffort, hasOpenAiKey, maxContextMessages, requireHumanForCriticalActions,
   provider, isConfigured). Tela de IA atualizada. ✅
3. **`ai/conversation-runs`** → `AiConversationRun` enriquecido (trigger, dryRun,
   inputMessagesCount, outputMessage, toolCallsCount, actionsCount, aiInteractionId). ✅
4. **`HealthUnit`** → +legalName, cnpj, city, state, phone, email, mainContactName,
   requiresHumanApproval, publicAgency, e counts (contactsCount/rulesCount/
   documentRequirementsCount). ✅
5. **Integrações** → `messaging/status` = config Twilio (hasAccountSid/…/
   twilioMessagingServiceConfigured); `providers` = descritor {provider,channel,enabled,
   configured}; logs enriquecidos (channel, from, contentType, externalMessageId,
   request/responsePayload, errorCode; webhook: channel, eventType, externalEventId,
   headers, processed). Tela de Integrações atualizada. ✅
6. **Counts de listagem** → organizations (publicAgenciesCount, healthUnitsCount),
   public-agencies (organizationName, healthUnitsCount, contractsCount), vacancies
   (requirementsCount, documentRequirementsCount), health-units (counts). ✅

**Validação:** `nest build` limpo, `tsc --noEmit` do frontend limpo, db push + seed,
e conferência ao vivo no browser (dashboard, IA, integrações renderizando com os novos
contratos). Paridade de shape/campos agora **completa** nas áreas auditadas.
