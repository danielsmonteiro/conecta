# HealthMatch — Roadmap Técnico (Piloto Coaph)

> Plano de desenvolvimento que liga o **código atual** ao **Business Plan v4**
> ([business-plan/versoes/v4-receita/BUSINESS_PLAN.md](business-plan/versoes/v4-receita/BUSINESS_PLAN.md)).
> Data: 2026-06-27 · Estágio: pré-piloto · Âncora: Coaph (Fortaleza/CE).
>
> **Premissa de orçamento:** o piloto (R$ 300 mil) financia **1 engenheiro por ~6 meses
> (~26 semanas)** + implantação + instrumentação de KPIs (BP v4, seções 9 e 14).
> Os Épicos 1–6 cabem nesse envelope; o Épico 7 é da rodada plena.

---

## Veredito de partida

Os relatórios [PARITY.md](PARITY.md), [FRESH_PARITY_REPORT.md](FRESH_PARITY_REPORT.md) e
[QA_REPORT.md](QA_REPORT.md) atestam **paridade com o frontend de produção recuperado**
— ou seja, as telas de leitura/CRUD batem com o sistema antigo. Isso **não** é o mesmo
que paridade com a tese do v4.

O BP v4 (seção 3) define três pilares: **Matching**, **IA no WhatsApp** e **Financeiro**.
Auditoria de código (2026-06-27):

- ✅ **Financeiro** e **CRUD/auditoria/dashboard** — sólidos e testados.
- 🟡 **Matching** — funcional, porém raso e com problema de escala.
- 🔴 **IA no WhatsApp** e **mensageria real (Twilio)** — **são stubs**: não há SDK
  Anthropic nem Twilio instalados, nenhuma chamada de modelo, nenhum envio/recebimento
  real de mensagem. O `OutboundMessageLog` é criado com status `QUEUED` e **nunca é
  entregue** ([conversations.module.ts:67](backend/src/conversations/conversations.module.ts)).

Construir esses pilares **é** o trabalho do piloto.

---

## Estado atual por capacidade

| Capacidade | Estado | Evidência |
|---|---|---|
| Autenticação (JWT cookie, refresh, middleware) | ✅ Pronto | [auth.service.ts](backend/src/auth/auth.service.ts) |
| CRUD do domínio (org, órgãos, unidades, contratos, vagas, profissionais, CBO, specialties) | ✅ Pronto | `backend/src/*` |
| Modelo de dados (28 modelos, soft-delete, enums) | ✅ Pronto | [schema.prisma](backend/prisma/schema.prisma) |
| Auditoria automática de mutações | ✅ Pronto | [audit.interceptor.ts](backend/src/audit/audit.interceptor.ts) |
| Regras de fluxo (aprovar→aloca; confirmar→`filledDoctors++`) | ✅ Pronto | [applications.module.ts](backend/src/applications/applications.module.ts) |
| Financeiro (receivable/payable, summary 14 métricas, margem) | ✅ Pronto | [financial.service.ts](backend/src/financial/financial.service.ts) |
| Dashboard (61 contadores) + 17 telas frontend | ✅ Pronto | `frontend/app/(app)/*` |
| Matching rule-based | 🟡 Funciona, mas N×M e sem CBO/no-show | [matching.service.ts](backend/src/matching/matching.service.ts) |
| Envio/recebimento de WhatsApp | 🔴 Stub | [integrations.module.ts](backend/src/integrations/integrations.module.ts) |
| Motor de IA (Anthropic) | 🔴 Stub (só lê env) | [ai.module.ts](backend/src/ai/ai.module.ts) |
| Detecção de gap / campanha automática | 🔴 Ausente (`autoStartCampaign` não usado) | [vacancies.service.ts](backend/src/vacancies/vacancies.service.ts) |
| Multi-tenancy | 🔴 Ausente | — |
| LGPD (PII, consentimento, retenção) | 🔴 Ausente | — |
| Observabilidade (logs/métricas/tracing) | 🔴 Ausente | [main.ts](backend/src/main.ts) |

---

## Épicos

Ordem = ordem de execução. Estimativas em semanas de **1 engenheiro**.
Critérios de aceite (DoD) são intencionalmente verificáveis.

### 🔴 Épico 1 — Mensageria WhatsApp real (Twilio)
**Bloqueador absoluto · ~3–4 semanas · depende de: nada**

Sem canal real não há camada de contingência. Hoje a mensagem morre no banco.

Arquitetura adotada: **interface única `WhatsAppProvider` + adapters plugáveis**
(`backend/src/messaging/`). Twilio (oficial, default do piloto) e OpenWA (não-oficial,
número dedicado). Sem novas dependências de runtime (`fetch` + `crypto` nativos).

- [x] Adapter Twilio via REST (sem SDK) lendo config de env.
- [x] Serviço de **envio** que consome `OutboundMessageLog` (`QUEUED → SENT/FAILED`),
      gravando `externalMessageId`, `requestPayload`, `responsePayload`, `errorCode`.
- [x] **Webhook inbound** `POST /api/integrations/webhooks/:provider` com **validação de
      assinatura** (Twilio HMAC-SHA1) → grava `WebhookLog` → cria `Message` INBOUND → conversa.
- [x] Fila + retry simples (drain em memória, single-instance). ⬅ trocar por BullMQ no Épico 3/7.
- [x] Status de entrega (delivery receipts) → `OutboundMessageLog.status`.
- [x] UI: tela de Integrações lista os adapters (oficial × não-oficial, padrão).
- [ ] **Templates do Twilio** p/ mensagem proativa (janela 24h) — ponte p/ Épico 2.
- [ ] **Validação de build + teste E2E** com sandbox Twilio (pendente: ambiente sem Node).
- [ ] Status de sessão/QR do OpenWA na UI.

**DoD:** enviar de uma conversa entrega no WhatsApp real (sandbox Twilio); responder no
WhatsApp cria `Message` INBOUND visível na tela de Conversas; logs preenchidos.

> **Status (2026-06-27):** fundação implementada (commits `38fe283`, `8789fc2`). Falta
> compilar/testar — o ambiente de desenvolvimento atual não tem toolchain Node.

---

### 🔴 Épico 2 — Motor de IA no WhatsApp (Anthropic)
**O coração do v4 · ~5–7 semanas · depende de: Épico 1**

Provedor default: **OpenAI** (`gpt-4o-mini`), abstraído por interface (`ai/llm/`) —
Anthropic plugável depois. Sem SDK (REST via `fetch`).

- [x] Provedor de IA acionado por `Message` INBOUND (`AiEngineService.onInbound`).
- [x] Contexto respeitando `maxContextMessages`; modelo configurável (`AI_MODEL`).
- [x] **Tool-use**: `consultar_vaga`, `registrar_resposta`, `transferir_para_humano` —
      cada run grava `AiConversationRun` (trigger, dryRun, inputMessagesCount,
      outputMessage, toolCallsCount, actionsCount, tokensUsed, outcome).
- [x] **Handoff humano** em ação crítica (`AI_REQUIRE_HUMAN`) → `WAITING_HUMAN`.
- [x] `dryRun` e `autoReply` operantes; endpoint manual `POST /api/ai/conversations/:id/run`.
- [ ] Mais tools sobre o domínio (propor plantão do pool, criar/atualizar Application,
      confirmar alocação quando humano libera) — ligar ao Épico 3.
- [ ] Provedor Anthropic (mesma interface) como alternativa.

**DoD:** com `autoReply=true`, a IA aborda/negocia e em ação crítica faz handoff;
`AiConversationRun` reflete a execução. ✅ validado (run manual + inbound→handoff).

> **Status (2026-06-28):** motor entregue (OpenAI). Tools básicas + handoff OK;
> envio real depende de `AI_DRY_RUN=false`.

---

### 🟠 Épico 3 — Detecção de gap + orquestração de campanha
**A tese de contingência · ~3–4 semanas · depende de: Épicos 1, 2 e 4**

- [ ] Job agendado de **detecção de gap** (vaga `OPEN`/`REPLACEMENT_NEEDED` próxima do
      início e não preenchida, no-show).
- [ ] Pipeline: gap → matching ranqueado → campanha de WhatsApp ao pool (consome 1 e 2).
- [ ] Implementar `autoStartCampaign` / `autoGenerateVacancies` (no schema, hoje sem uso).
- [ ] Instrumentar **tempo de cobertura do gap** (de horas para minutos — KPI da seção 11).

**DoD:** criar um gap dispara automaticamente abordagem ao pool; a primeira confirmação
fecha a vaga; o tempo de cobertura é registrado.

---

### 🟠 Épico 4 — Matching para contingência (melhoria)
**~1–2 semanas · depende de: nada (pode rodar em paralelo a 1/2)**

- [ ] Corrigir o N×M: pré-filtrar candidatos por especialidade/CBO/cidade **na query**,
      não em memória ([matching.service.ts:53](backend/src/matching/matching.service.ts)).
- [ ] Cruzar **CBO** (campo existe no schema, não usado).
- [ ] Ponderar `noShowCount` e `attendanceRate` no score (prometido na seção 3 do v4).

**DoD:** matching de uma vaga com 5k profissionais responde < 500ms; score reflete
no-show e CBO.

---

### 🟡 Épico 5 — LGPD & hardening
**Exigência explícita do piloto (BP v4, seções 9 e 13) · ~2–3 semanas**

- [ ] Mascaramento/criptografia de PII (CPF, whatsapp) em repouso e nos logs.
- [ ] Base legal/consentimento e política de retenção; portabilidade de dados.
- [ ] Rate limiting, secrets management, headers de segurança, validação de webhook (do Épico 1).

**DoD:** PII não aparece em texto puro em logs; relatório de compliance básico do piloto.

---

### 🟡 Épico 6 — Instrumentação de KPIs do ROI
**Justifica o gatilho da rodada plena (≥ R$ 100 mil/mês) · ~1–2 semanas**

- [ ] Painel de piloto com a tabela da seção 11: sobrepreço evitado, plantões descobertos,
      horas de preposto, % de gaps cobertos sem humano, taxa de aceite via IA, NPS.
- [ ] Baseline (antes) × realizado (depois), exportável para o comitê mensal Coaph.

**DoD:** diretoria vê, em uma tela, a economia operacional realizada do mês.

---

### 🟢 Épico 7 — Multi-tenancy, billing/split & observabilidade (rodada plena)
**Tese ofensiva — NÃO cabe no piloto · pós-piloto**

- [ ] Scoping por tenant em todas as queries (hoje um login vê tudo).
- [ ] Modelo de receita da seção 6: SaaS de prontidão + fee capado ≤ 2%; split financeiro.
- [ ] Observabilidade plena (logs estruturados, métricas, tracing, healthchecks).

**DoD:** segunda cooperativa isolada em produção com cobrança independente.

---

## Sequenciamento vs. orçamento do piloto

```
Sem 1 ───────────────────────────────────────────────► Sem 26
[E1 WhatsApp 3-4][E2 IA 5-7         ][E3 Gap/Campanha 3-4]
        [E4 Matching 1-2 (paralelo)]
                            [E5 LGPD 2-3][E6 KPIs 1-2]
                                                  └─ folga p/ implantação + hardening
E7 (multi-tenancy/billing) ──► rodada plena
```

- Épicos 1–6 ≈ **15–22 semanas** — cabem nas ~26 do piloto, com folga para implantação.
- **Ordem inegociável:** 1 → 2 → 3 (dependência direta). E4 pode correr em paralelo.
- Casamento com o "uso do piloto" da seção 14: *hardening + integrações + LGPD +
  instrumentação de KPIs + 1 eng. por ~6 meses*.

---

## Riscos técnicos

| Risco | Mitigação |
|---|---|
| Custo/latência da IA por mensagem | `dryRun` no piloto; modelo Haiku; cache de contexto; cap de mensagens |
| Limites/qualidade do número WhatsApp (Twilio) | Começar em sandbox; aprovar número de produção cedo |
| Matching N×M degrada com a base real | Épico 4 antes de ativar campanhas em volume |
| Ação errada da IA com profissional real | Handoff humano obrigatório em ações críticas (Épico 2) |
| PII vazando em logs | Épico 5 antes de tráfego de produção |
| Fundador solo / continuidade | Documentar; cláusulas de IP (BP v4, seção 13) |
```
