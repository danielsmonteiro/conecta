# HealthMatch — Relatório de QA (teste completo da aplicação)

> Executado em 2026-06-13 contra o stack Docker em execução (backend :3000,
> frontend :3001, PostgreSQL). Abordagem: testes de API automatizados +
> testes de regras de negócio + navegação do frontend via browser real.

## Resumo executivo

| Bloco | Resultado |
|---|---|
| API (auth, contrato, validação, filtros) | **32/32 ✅** |
| Regras de negócio (ciclo de vida, auditoria, matching, financeiro) | **14/14 ✅** (após correções) |
| Frontend (telas construídas + auth) | ✅ após 2 correções |
| **Bugs encontrados** | **3 — todos corrigidos** |
| Gaps conhecidos (não-bug) | 12 telas não construídas |

## 🐛 Bugs encontrados e corrigidos

### BUG-1 (Alto) — Links quebrados após reestruturação de rotas
Após mover o frontend para rotas na raiz (route group `(app)`), 4 referências
ainda apontavam para o prefixo antigo `/app/...` → **404**:
- Botão "Nova vaga" (dashboard e lista de vagas)
- Link da linha da vaga na listagem
- **Redirect pós-criação** no formulário Nova vaga (criava a vaga mas caía em 404)

**Correção:** `/app/vagas*` → `/vagas*` em `(app)/page.tsx`, `(app)/vagas/page.tsx`,
`(app)/vagas/nova/page.tsx`. **Re-testado ✅.**

### BUG-2 (Alto) — Detalhe da vaga quebrava (regressão da reconciliação)
A Fase 5 mudou o shape do matching (`reasons/available/professionalName` →
`positiveReasons/eligible/doctor.fullName`), mas a página de detalhe não foi
atualizada → `TypeError: Cannot read properties of undefined (reading 'slice')`,
tela inteira em erro.

**Correção:** atualizado `interface MatchScore` e a renderização em
`(app)/vagas/[id]/page.tsx`. **Re-testado ✅** (scores e flag "inelegível" corretos).

### BUG-3 (Médio) — `code` não auto-gerado em vaga/contrato
Produção gera código sequencial (`VAG-2026-0008`, `CTR-2026-0006`); o destino
deixava `code` nulo na criação.

**Correção:** geração `VAG-YYYY-NNNN` / `CTR-YYYY-NNNN` em
`vacancies.service` e `contracts.service`. **Re-testado ✅** (`VAG-2026-0004`, `CTR-2026-0001`).

## ✅ O que passou

**Autenticação:** senha errada→401, email inexistente→401, payload inválido/email
malformado→400, login válido seta cookie, rota protegida sem cookie→401 / com
cookie→200, `/users/me`, **logout→/login**, **middleware protege `/` →
redireciona para `/login?next=/`**.

**Contrato de API:** as 16 listas retornam o envelope `{items, pagination}`.

**Validação/negativos:** POST sem campo obrigatório→400, enum inválido→400,
recurso inexistente→404.

**Filtros:** `overdueOnly` (só OVERDUE), `includeInactive` (esconde inativas por
padrão), `matching/scores` paginado respeita `limit`, `startsFrom`.

**Ciclo de vida + auditoria:** criar→`*.create` auditado; update→aplicado;
**DELETE = archive** (soft) → some da lista, profile→404, `*.archive` auditado.

**Regras de negócio:** aprovar candidatura **cria alocação**; confirmar alocação
**incrementa `filledDoctors`**; matching com `category` válida e detecção de
**conflito de agenda** (profissional com alocação sobreposta marcado inelegível);
financeiro da vaga com margem correta; summary com 14 métricas consistentes.

**Frontend (telas construídas):** Login, Dashboard (cards + pipeline + conversas +
cobertura), Vagas (lista/nova/detalhe), Profissionais, Organizações, Contratos —
todas renderizam com dados reais e design fiel.

## ⚠️ Gaps conhecidos (não são bugs — backlog)

- **12 telas não construídas** (rotas existem no menu, mas dão 404):
  Órgãos Públicos, Unidades, Candidaturas, Matching, Alocações, Escala,
  Financeiro, Conversas, I.A., Integrações, Auditoria, Configurações.
- **Página 404 crua** (preta, padrão do Next) — falta um `not-found.tsx`
  estilizado dentro do shell do app. (Baixa/cosmético.)
- Dashboard ainda sem as seções "Pendências críticas" e "Atividade recente"
  e a sidebar sem submenus aninhados (ver PARITY.md seção E).

## Construção das 12 telas pendentes (pós-QA)

As 12 telas faltantes foram construídas (route group `(app)`, helpers `useApi` +
`DataTable`) e validadas no browser: Órgãos Públicos, Unidades, Candidaturas,
Matching, Alocações, Escala, Financeiro, Conversas, I.A., Integrações, Auditoria,
Configurações — mais uma **404 estilizada** (`not-found.tsx`). Typecheck limpo
(`tsc --noEmit`) e render confirmado com dados reais.

### BUG-4 (Baixo, encontrado e corrigido durante a construção)
`GET /api/document-types` retornava **array cru** (inconsistente com o envelope
`{items}` do resto), travando a seção de Configurações em "Carregando…".
**Correção:** endpoint paginado como os demais. Re-testado ✅.

## Conclusão

A **camada de dados/API e os fluxos das telas existentes estão sólidos** —
nenhuma falha funcional remanescente. Os 3 bugs (2 bloqueadores de navegação +
1 de paridade) foram corrigidos e re-validados. O trabalho restante é de
**cobertura** (construir as 12 telas pendentes), não de correção.
