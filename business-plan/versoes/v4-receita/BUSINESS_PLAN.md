# HealthMatch — Business Plan
### Camada de contingência para escalas de saúde — começando pela Coaph

**Versão:** Piloto + Pre-seed (revisão pós-reunião Coaph) · **Data:** Junho/2026 · **Estágio:** Pré-lançamento (produto pronto) · **Âncora:** Coaph (Fortaleza/CE)

> **Nota de premissas:** Empresa em pré-lançamento, sem receita realizada. As estimativas de economia operacional partem de números informados pela Coaph (custo de prepostos ~R$ 240 mil/mês; plantão médico 12h = R$ 1.200) e de premissas conservadoras e **editáveis** sobre o gap (sinalizadas 🔹), a validar no piloto. Sobrepreço emergencial e penalidade por plantão descoberto são as premissas de maior peso — e o piloto existe para confirmá-las.

---

## 1. Sumário executivo

**O HealthMatch é uma camada de contingência para escalas de saúde.** Ele não gerencia toda a escala da cooperativa — ele resolve o **gap**: o plantão que não fecha, o no-show, a exceção de última hora. Usar a plataforma é a exceção, não a regra. É exatamente onde se concentram o maior custo, o maior risco e a maior dor operacional.

O cliente-âncora é a **Coaph**, que hoje sustenta uma operação manual de prepostos (~R$ 240 mil/mês) e arca com o custo do gap: horas de telefonema, sobrepreço de cobertura emergencial e penalidade/risco quando o plantão fica descoberto.

**Duas teses, separadas e honestas:**

| | Tese **defensiva** | Tese **ofensiva** |
|---|---|---|
| Lógica | Cortar o custo do gap **e** capturar receita de vagas ociosas na Coaph | Escalar a camada de contingência para outras cooperativas/hospitais |
| Métrica | Economia operacional + margem de vagas recuperadas | Receita recorrente (SaaS de prontidão + fee) |
| Papel | Justifica o **piloto** | Justifica a **rodada plena** (futura) |

**O que muda nesta revisão (após a reunião com a Coaph):**
- **Cobre o gap, não a escala inteira** → volume menor, foco maior.
- **Margem da cooperativa < 5%** → o "trade" da plataforma é fino. Monetização passa a ser **híbrida: SaaS de prontidão + fee por gap capado em ≤ 2%**. O take-rate gordo sobre GMV foi descartado.
- **O investimento foi redimensionado.** Como a economia interna não paga R$ 1,5 mi rapidamente, o *ask* agora é um **piloto de R$ 300 mil** que se paga em ~2,6 meses (realista) e **prova as premissas** antes de qualquer rodada maior.
- **Nova alavanca — receita incremental.** A Coaph executa só ~8.000 de 12.000 vagas contratadas (~1/3 ociosas). Preencher parte dessas vagas gera receita que hoje fica na mesa **e** protege a renovação dos contratos.

| Item | Resumo |
|---|---|
| Produto | Camada de contingência (gap-filling) com matching + IA no WhatsApp + financeiro |
| Cliente-âncora | Coaph — assina como cliente (ROI positivo desde o 1º mês) |
| Monetização | SaaS de prontidão (R$ 8 mil/mês) + fee por gap (≤ 2% do plantão) |
| **Ask atual** | **Piloto de R$ 300 mil** (payback ~2,6 meses) |
| Economia líquida (Coaph, realista) | ~R$ 114,7 mil/mês |
| Receita incremental (vagas ociosas) | +~R$ 36 mil/mês · ~R$ 3,6 mi/mês de GMV na mesa |
| Benefício total Coaph (realista) | ~R$ 169,5 mil/mês (economia + receita) |
| Rodada plena | R$ 1,5 mi **depois do piloto**, justificada pela escala (ofensiva) |

> **Enquadramento honesto:** como projeto de eficiência puro, a economia de prepostos sozinha **não** pagaria R$ 1,5 mi rápido (~40 meses). Por isso a decisão se divide: a Coaph **assina como cliente** (ganha desde já) e **financia um piloto enxuto** que valida o custo real do gap; a rodada de equity maior fica para depois, decidida com dados.

---

## 2. O problema: o gap, não a escala inteira

A maior parte dos plantões a cooperativa preenche pelo seu processo regular. O problema caro é a **exceção**:
- **Plantão que não fecha** → penalidade contratual + risco assistencial.
- **No-show** → cobertura emergencial de última hora, quase sempre com **sobrepreço**.
- **Horas de preposto** desproporcionais gastas justamente nessas exceções (o 20% de casos que consome 80% do esforço).

🔹 Na Coaph, estima-se que ~35% do custo de prepostos (R$ 240 mil/mês) esteja ligado a gaps/exceções, além do sobrepreço e das penalidades — valores que o piloto vai medir.

---

## 3. A solução: uma camada de contingência

O HealthMatch entra **só quando o processo normal falha**. Mantém um pool de contingência pronto e usa:
- **Matching** que cruza especialidade, CBO, credencial, no-show e conflito de agenda — e acha rápido quem pode cobrir.
- **IA no WhatsApp** que aborda, negocia e confirma o plantão de cobertura 24/7, com handoff humano em ações críticas.
- **Financeiro** que registra a cobertura e a margem com auditoria.

Resultado: o gap é coberto em **minutos**, de um pool pronto, **sem o sobrepreço da urgência** e sem horas de telefonema — reduzindo penalidade e risco.

**Produto:** funcionalmente completo e testado internamente (32/32 testes de API, 14/14 regras de negócio). Stack: NestJS + Prisma + PostgreSQL; Next.js; IA Anthropic; Twilio/WhatsApp; Docker. Lacunas para escala (roadmap): multi-tenancy, billing/split, observabilidade, ativação plena da IA.

---

## 4. A tese de investimento (defensiva + ofensiva)

**Defensiva (justifica o piloto):** reduzir o custo do gap na Coaph — tempo de preposto nas exceções + sobrepreço emergencial + penalidade por plantão descoberto. Mensurável e atacável já.

**Ofensiva (justifica a rodada plena, depois):** a mesma camada de contingência replicada para outras cooperativas e hospitais. É um **SaaS de contingência** — modesto e previsível (~R$ 226 mil/ano por cliente), não um marketplace de take-rate gordo.

**Regra de decisão:** a Coaph **assina como cliente** (ganha mensalmente) e **financia o piloto** (R$ 300 mil, payback ~2,6 meses). A rodada de equity de R$ 1,5 mi só entra **depois** que o piloto comprovar a economia — e aí justificada pela escala, não pela operação interna.

---

## 5. Business Case para a Coaph

> Premissas (realista, 🔹 a validar): gap ~600/mês; ticket ponderado R$ 900 (médico R$ 1.200, demais classes menores); 35% dos gaps com sobrepreço (R$ 250/plantão); 6% ficariam descobertos (penalidade R$ 1.200).

**Economia mensal da Coaph (3 camadas):**

| Camada de economia | Conservador | Realista | Otimista |
|---|---|---|---|
| 1) Tempo de preposto no gap | R$ 25,2 mil | R$ 37,8 mil | R$ 50,4 mil |
| 2) Sobrepreço emergencial evitado | R$ 35,0 mil | R$ 52,5 mil | R$ 87,5 mil |
| 3) Penalidade evitada | R$ 28,8 mil | R$ 43,2 mil | R$ 72,0 mil |
| **Economia bruta/mês** | **R$ 89,0 mil** | **R$ 133,5 mil** | **R$ 209,9 mil** |
| (–) Custo pago ao HealthMatch | (R$ 15,2 mil) | (R$ 18,8 mil) | (R$ 26,0 mil) |
| **Economia líquida/mês** | **R$ 73,8 mil** | **R$ 114,7 mil** | **R$ 183,9 mil** |

**Payback do investimento:**

| Investimento | Conservador | Realista | Otimista |
|---|---|---|---|
| **Piloto (R$ 300 mil) — ask atual** | ~4,1 meses | **~2,6 meses** | ~1,6 meses |
| Rodada plena (R$ 1,5 mi) — futura | ~20 meses | ~13 meses | ~8 meses |
| *Floor honesto: só prepostos paga R$ 1,5 mi em* | *~60 meses* | *~40 meses* | *~30 meses* |

- A economia depende sobretudo das camadas 2 e 3 (sobrepreço e penalidade) — **as premissas mais incertas, que o piloto valida**.
- Mesmo no conservador, o **piloto se paga em ~4 meses**.
- Como **cliente**, a Coaph é líquida-positiva todo mês (paga R$ 18,8 mil, economiza R$ 133,5 mil brutos) — assinar é um *no-brainer* operacional.

**Quarta dimensão — receita incremental (vagas ociosas):**

A Coaph tem **12.000 vagas contratadas e preenche ~8.000** — ~1/3 (**4.000/mês**) fica ociosa por falta de profissionais. Isso é **~R$ 3,6 mi/mês de GMV na mesa** (4.000 × R$ 900). A plataforma ajuda a capturar parte disso:

| Captura das ociosas | Conservador (15%) | Realista (25%) | Otimista (40%) |
|---|---|---|---|
| Vagas recuperadas/mês | 600 | 1.000 | 1.600 |
| Receita incremental Coaph (margem 4%)/mês | R$ 21,6 mil | **R$ 36,0 mil** | R$ 57,6 mil |

- **Honesto:** por ser cooperativa de **margem fina (<5%)**, o ganho próprio em R$ é modesto (~R$ 36 mil/mês realista). O maior valor é **estratégico**: a sub-execução crônica ameaça a **renovação dos contratos** — preencher protege a receita inteira, não só a margem incremental. Soma-se mais trabalho/renda aos cooperados.
- **Benefício total Coaph (realista):** economia R$ 133,5 mil + receita R$ 36 mil = **~R$ 169,5 mil/mês** — o que torna o piloto ainda mais barato de pagar. A defesa conservadora, porém, segue ancorada só na economia de custo.

---

## 6. Modelo de receita (margem-aware)

Dada a margem da cooperativa < 5%, a receita do HealthMatch é **híbrida e desacoplada do GMV**:

- **SaaS de prontidão:** mensalidade fixa pelo acesso ao pool de contingência (Coaph: 🔹 R$ 8 mil/mês). Previsível, não depende da margem fina.
- **Fee por gap preenchido:** pequena taxa por cobertura, **capada em ≤ 2%** do plantão (≈ R$ 24 num plantão médico de R$ 1.200). Alinha receita ao valor entregue.

Receita do HealthMatch vinda da Coaph: ~R$ 18,8 mil/mês (R$ 226 mil/ano) no realista. O take-rate gordo sobre GMV **não se aplica** neste mercado.

---

## 7. Mercado (upside da escala — tese ofensiva)

> Embasa a rodada plena (futura). A decisão do piloto não depende disto.

~562 mil médicos ativos (CFM, 2024); milhares de cooperativas e unidades. O gap (descobertas + no-shows) é universal e hoje resolvido na base do telefonema. Comps internacionais de staffing/contingência de saúde (Nomad, Trusted, Medely, ShiftMed; Patchwork no Reino Unido) validam a categoria. O concorrente nº 1 segue sendo o **processo manual**.

---

## 8. Go-to-Market

- **Fase 0 — Piloto Coaph (mês 0–6):** implantar a contingência em 1–2 unidades/especialidades; medir baseline e economia real do gap.
- **Fase 1 — Coaph plena + 2ª cooperativa (mês 6–18):** expandir o uso e abrir a primeira cooperativa adjacente com o case.
- **Fase 2 — Escala regional (mês 18–36):** mais cooperativas e hospitais do NE.

Canal principal: indicação da Coaph e da rede cooperativista. A base de cooperados é vantagem de oferta **uma vez operacionalizada** — não liquidez automática.

---

## 9. Estrutura operacional e equipe

Fundador solo (bootstrap), produto construído. O **piloto (R$ 300 mil)** financia: 1 eng. para hardening/integrações/LGPD, implantação na Coaph e a instrumentação dos KPIs (~6 meses). Contratações maiores (time comercial/CS) ficam para a rodada plena.

---

## 10. Plano financeiro do HealthMatch (escala — ofensiva)

> Cenário de upside (HealthMatch como empresa). Modesto e previsível — coerente com a margem fina. Não é a base da decisão do piloto.

| Receita HM (escala) | Ano 1 | Ano 2 | Ano 3 |
|---|---|---|---|
| Cooperativas/clientes ativos (média) | 1 | 5 | 15 |
| Receita/cliente/ano (realista) | R$ 226 mil | R$ 226 mil | R$ 226 mil |
| **Receita HM total/ano** | **R$ 226 mil** | **R$ 1,13 mi** | **R$ 3,38 mi** |

É um SaaS de nicho saudável, não um foguete de marketplace. A rodada plena de R$ 1,5 mi deve ser dimensionada a este plano — e só faz sentido **após** o piloto validar a economia e a adoção.

---

## 11. KPIs do piloto Coaph

O piloto mede a economia real do gap (não só o uso). Baseline antes; medição depois:

| KPI | Meta no piloto |
|---|---|
| Custo de cobertura emergencial (sobrepreço) | ↓ — validar a camada 2 |
| Nº de plantões descobertos / penalidades | ↓ — validar a camada 3 |
| Horas de preposto nas exceções | ↓ — validar a camada 1 |
| Tempo médio de cobertura do gap | de horas para minutos |
| % de gaps cobertos sem intervenção humana | ↑ a cada ciclo |
| Taxa de aceite via WhatsApp/IA | estabelecer e crescer |
| Nº de gaps processados e profissionais ativados | crescimento |
| NPS dos coordenadores | ≥ alvo acordado |
| **Economia operacional mensal (estimada × realizada)** | gatilho da rodada plena |

---

## 12. Análise SWOT

| Forças | Fraquezas |
|---|---|
| Ataca o ponto de maior dor/custo (o gap) | Economia depende de premissas a validar (sobrepreço/penalidade) |
| Produto construído e testado | Fundador solo; sem tração externa |
| Coaph como cliente-âncora alinhado | Dependência inicial da Coaph |
| Piloto barato com payback rápido | Receita por cliente modesta (margem fina) |

| Oportunidades | Ameaças |
|---|---|
| Replicar contingência para outras cooperativas | Coaph optar por resolver in-house |
| Hospitais e setor público | Margem fina limitar disposição a pagar |
| Categoria validada lá fora | Economia do gap não se confirmar no piloto |

---

## 13. Riscos e plano de mitigação

| Risco | Prob./Impacto | Mitigação |
|---|---|---|
| Economia do gap não se materializar | Médio/Alto | **Piloto barato (R$ 300k) existe para validar** antes de qualquer cheque maior; premissas conservadoras e editáveis |
| Virar software sob medida, não produto | Médio/Alto | Multi-tenant desde já; contrato de cliente separado do investimento |
| Dependência excessiva da Coaph | Médio/Alto | Abrir 2ª cooperativa após o piloto; dados/portabilidade garantidos |
| Margem fina limitar o que pagam | Médio/Médio | SaaS de prontidão desacoplado do GMV; fee capado e indolor |
| Resistência interna (prepostos) | Médio/Médio | Gestão de mudança; posicionar como apoio à exceção, não substituição total |
| Regulatório/trabalhista, LGPD | Médio/Alto | Jurídico especializado; cooperativa detém o vínculo; compliance no piloto |
| Fundador solo | Médio/Médio | Piloto financia 1ª contratação de eng.; cláusulas de IP/continuidade |

---

## 14. Recomendação de investimento (piloto-first)

**Decisão em duas camadas, desacopladas:**

1. **A Coaph deve assinar como cliente — agora.** Paga ~R$ 18,8 mil/mês e economiza ~R$ 133,5 mil/mês (bruto). É uma decisão operacional de baixo risco e ROI imediato.
2. **A Coaph deve financiar o piloto de R$ 300 mil — agora.** Payback ~2,6 meses (realista; ~4 meses no conservador). O piloto valida o custo real do gap (sobrepreço + penalidade) e gera o case.
3. **A rodada plena de R$ 1,5 mi — depois.** Só após o piloto comprovar a economia e a adoção, e justificada pela tese ofensiva (escala). Decidida com dados, não com promessa.

**Uso do piloto (R$ 300 mil):** hardening + integrações + LGPD; implantação na Coaph; instrumentação dos KPIs; 1 engenheiro por ~6 meses; comitê mensal Coaph + HealthMatch de acompanhamento do ROI.

**Gatilho para a rodada plena:** economia operacional realizada ≥ R$ 100 mil/mês comprovada no piloto.

---

## 15. Roadmap

**0–6 meses — Piloto Coaph (R$ 300 mil):** hardening/LGPD; implantar contingência; medir baseline e economia; comitê mensal de ROI.

**6–18 meses — Coaph plena + 2ª cooperativa:** expandir uso; abrir 1 cooperativa adjacente; preparar a rodada plena com o case comprovado.

**18–36 meses — Escala (ofensiva):** mais cooperativas/hospitais; rodada seed/plena com tração real.

> **Resumo da decisão:** assine como cliente (ganha já) + financie um piloto enxuto (paga-se em meses) para provar o custo do gap. Adie a rodada grande até ter dados. Pior cenário aceitável: o piloto se paga e a Coaph fica com uma operação de contingência mais barata — sem ter arriscado R$ 1,5 mi.
