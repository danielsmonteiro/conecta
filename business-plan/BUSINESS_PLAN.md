# HealthMatch — Business Plan
### Plataforma de gestão e alocação inteligente de força de trabalho em saúde

**Versão:** Captação Pre-seed · **Data:** Junho/2026 · **Estágio:** Pré-lançamento (produto pronto) · **Beachhead:** Fortaleza/CE

> **Nota de premissas:** A empresa está em pré-lançamento, sem receita realizada. Todas as projeções são estimativas baseadas em premissas de mercado (🔹) e benchmarks do setor de SaaS/marketplace no Brasil (2024–2025). Devem ser validadas no piloto com a cooperativa-âncora.

---

## 1. Sumário executivo

**HealthMatch** é uma plataforma B2B (SaaS + marketplace gerenciado) que resolve uma das dores mais caras e silenciosas da saúde brasileira: **preencher plantões e vagas com o profissional certo, credenciado e disponível, no tempo certo** — hoje feito à mão, por WhatsApp, planilhas e telefonemas.

A plataforma combina um **motor de matching** (que cruza especialidade, CBO, situação de credenciamento, histórico de comparecimento e conflito de agenda), um **agente de IA conversacional** que aborda e negocia plantões com profissionais via WhatsApp, e um **back-office financeiro de intermediação** (recebíveis do cliente, pagáveis ao profissional e margem da plataforma) — tudo com trilha de auditoria e gestão de documentos/credenciais.

**Diferencial de entrada (wedge):** o investidor-âncora é uma **grande cooperativa de saúde do Ceará com 55 mil cooperados**, que será simultaneamente (a) investidor estratégico, (b) primeiro cliente-âncora e (c) uma base massiva de oferta de profissionais já contratualizada. Isso elimina o problema clássico do "ovo e galinha" de marketplaces: **HealthMatch nasce com liquidez de oferta e demanda no dia 1**, com CAC de profissionais próximo de zero.

| Item | Resumo |
|---|---|
| **Modelo** | Híbrido: assinatura SaaS (MRR) + fee de intermediação (take-rate sobre GMV de plantões) |
| **Mercado (TAM Brasil)** | 🔹~R$ 15–20 bi/ano em GMV de plantões/escalas de saúde (estimativa bottom-up) |
| **Beachhead** | Cooperativas de saúde do Ceará/Nordeste → expansão para hospitais privados e setor público |
| **Status do produto** | Funcionalmente completo (já operou em produção; base de código reconstruída e auditada) |
| **Ask (pre-seed)** | **R$ 1,5 mi** para ~20 meses de runway até o break-even operacional |
| **Projeção realista** | Receita líquida Ano 1 ~R$ 1,1 mi → Ano 3 ~R$ 16,5 mi; break-even ~mês 20–22 |
| **Time** | Fundador solo (bootstrap); rodada financia as contratações-chave (eng, CS/Ops, comercial) |

**A tese:** o mercado de staffing de saúde tech-enabled está validado globalmente (Nomad Health, Trusted Health, Medely nos EUA; Patchwork/Locum's Nest no Reino Unido captaram centenas de milhões de dólares). No Brasil, o setor é gigante e ainda operado de forma artesanal. HealthMatch ataca esse mercado com um **canal de distribuição privilegiado** (a rede de cooperativas de saúde) e um **produto pronto**.

---

## 2. Descrição da plataforma

**Missão:** garantir que toda unidade de saúde tenha o profissional certo no plantão certo — com agilidade, conformidade e custo justo.

**Visão:** ser a camada de inteligência operacional do trabalho em saúde no Brasil — o "sistema operacional" que conecta profissionais, unidades, cooperativas e o poder público.

**Proposta de valor:**

| Para quem | Dor hoje | O que o HealthMatch entrega |
|---|---|---|
| **Cooperativas / intermediadoras** | Escala manual, WhatsApp, risco de plantão descoberto, baixa visibilidade financeira | Preenchimento automatizado, IA que negocia plantões 24/7, painel financeiro de margem em tempo real |
| **Hospitais / redes privadas** | Plantões descobertos, dependência de poucos plantonistas, credenciamento manual | Banco de plantonistas qualificados, matching com checagem de credencial e conflito de agenda |
| **Setor público (SUS / UPAs)** | Dificuldade de cobertura, controle de presença, conformidade | Gestão de escala com auditoria, controle de comparecimento e rastreabilidade para prestação de contas |
| **Profissionais de saúde** | Plantões via grupos informais, atrasos de pagamento, burocracia | Ofertas compatíveis com seu perfil via WhatsApp, transparência de pagamento |

**Capacidades já existentes no produto** (extraídas do código): cadastro regulatório-aware (conselhos CRM/COREN/CREFITO etc., CBO, RQE, especialidades); motor de matching com detecção de conflito de agenda e histórico de no-show; pipeline de vagas (rascunho → matching → contato → preenchida → concluída); candidaturas → alocações → escala com controle de presença; mensageria omnichannel (WhatsApp/SMS/e-mail) com **agente de IA** (Anthropic) e *handoff* humano para ações críticas; financeiro de intermediação com margem; auditoria completa; RBAC; e white-label.

---

## 3. Análise de mercado

### 3.1 Contexto

O Brasil tem **~562 mil médicos ativos** (CFM, 2024) e mais de **2,5 milhões de profissionais de saúde** no total (enfermeiros, técnicos, fisioterapeutas etc.). A demanda por plantões é estrutural e crescente: envelhecimento populacional, expansão de UPAs/UBS, judicialização da saúde e déficit crônico de cobertura em regiões fora dos grandes centros. **O preenchimento de plantões é hoje, majoritariamente, um processo manual** — grupos de WhatsApp, planilhas, agências locais e cooperativas operando com pouca tecnologia.

### 3.2 TAM / SAM / SOM (bottom-up)

> 🔹 Metodologia: GMV de plantões = nº de plantões/ano × ticket médio. Ticket médio assumido R$ 1.300/plantão (12h, média Brasil; Nordeste tende a ser menor que SP). A receita endereçável é uma fração do GMV (take-rate + SaaS).

| Camada | Definição | GMV estimado/ano | Pool de receita endereçável (≈10%) |
|---|---|---|---|
| **TAM** | Todo o GMV de plantões/escalas de saúde no Brasil | 🔹 R$ 15–20 bi | 🔹 R$ 1,5–2,0 bi |
| **SAM** | Nordeste + segmentos cooperativas/hospitais privados/público | 🔹 R$ 3–4 bi | 🔹 R$ 300–450 mi |
| **SOM (3–5 anos)** | CE + cooperativas adjacentes do NE efetivamente capturáveis | 🔹 R$ 150–300 mi GMV | 🔹 R$ 15–30 mi |

O SOM converge com a projeção financeira (Ano 3 realista ~R$ 16,5 mi de receita líquida), o que mantém o plano internamente consistente.

### 3.3 Tendências favoráveis
- **Digitalização tardia da saúde operacional** (a "última milha" — RH/escala — ainda é manual).
- **Maturação do WhatsApp Business + IA generativa**: viabiliza automação de recrutamento conversacional a custo marginal baixíssimo.
- **Pressão por eficiência e conformidade** no setor público (controle de presença, prestação de contas).
- **Modelo validado lá fora**: Nomad Health, Trusted Health, Medely, ShiftMed (EUA); Patchwork, Locum's Nest (Reino Unido) — staffing de saúde tech-enabled é uma categoria consolidada e bem capitalizada internacionalmente.

### 3.4 Concorrência (mapeamento)

| Categoria | Quem é | Força | Fraqueza (oportunidade p/ HealthMatch) |
|---|---|---|---|
| **Status quo informal** *(concorrente #1 real)* | Grupos de WhatsApp, planilhas, telefonemas, "donos de escala" | Custo zero, já existe, relacional | Não escala, sem auditoria, sem matching, sem controle financeiro |
| **Agências/cooperativas tradicionais de plantão** | Intermediadoras regionais, cooperativas médicas | Relacionamento, base de médicos | Pouca tecnologia, margens opacas, processos manuais |
| **Software de gestão hospitalar (HIS)** | Tasy/MV, Soul MV, ProDoctor | Implantados em hospitais | Não são especializados em matching+IA+marketplace de plantão |
| **Gestão de clínicas / agendamento** | iClinic, Feegow, Docplanner | Base instalada | Foco em agenda clínica, não em escala/staffing |
| **Marketplaces de saúde adjacentes** | Telemedicina (Conexa, Docway), marketplaces de serviços | Tração digital | Não atacam o problema de escala/plantão |
| **Comps internacionais (validação da tese)** | Nomad Health, Trusted Health, Medely, ShiftMed, Patchwork | Provam o modelo e o tamanho | Não operam no Brasil |

**Insight competitivo:** o concorrente a vencer não é outro software — é o **processo manual + agências locais**. HealthMatch ganha por ser **10x mais rápido e barato** que a operação manual, com **conformidade e dados** que o status quo não oferece, entrando por um **canal que ninguém mais tem** (a rede de cooperativas).

---

## 4. Público-alvo e personas

**ICP recomendado (beachhead):** começar **dentro da cooperativa-âncora** como design partner e primeiro cliente, usando seus 55 mil cooperados como oferta. Provar o modelo em Fortaleza, depois replicar para outras cooperativas de saúde do Nordeste, em seguida hospitais/redes privadas e, por fim, o setor público (UPAs/UBS).

> **Por que esse beachhead e não "hospitais" ou "público" direto:** a cooperativa entrega liquidez dos dois lados no dia 1 (demanda de plantões + oferta de profissionais) e um campeão interno com capital. Hospitais privados têm ciclo de venda consultivo mais longo; o setor público exige licitação e ciclos longos — ambos são expansão, não entrada.

**Personas:**
1. **Coordenador(a) de escala da cooperativa** (comprador/usuário-chave): vive apagando incêndio de plantão descoberto. Ganha automação e previsibilidade.
2. **Diretor(a) financeiro/operações da cooperativa** (decisor econômico): quer visibilidade de margem, redução de custo operacional e conformidade.
3. **Médico/profissional cooperado** (oferta): quer ofertas relevantes, sem burocracia e com pagamento transparente, pelo WhatsApp.
4. **Gestor público/OSS de saúde** (expansão): precisa cobrir UPAs/UBS com rastreabilidade para prestação de contas.

---

## 5. Produto e funcionalidades (base no repositório)

**Stack técnica:** Backend **NestJS + Prisma + PostgreSQL**; Frontend **Next.js (App Router) + Tailwind**; **IA via Anthropic** (modelo Haiku para custo marginal baixo); mensageria via **Twilio/WhatsApp/Meta/Zenvia**; auth por cookie httpOnly (access+refresh); deploy em **Docker**. Arquitetura modular (~20 módulos de domínio) e API REST padronizada.

**Módulos funcionais (já implementados e testados — 32/32 testes de API, 14/14 de regras de negócio):**

| Módulo | O que faz |
|---|---|
| **Matching** | Pontua profissional × vaga (LOW/MEDIUM/HIGH), detecta conflito de agenda e elegibilidade, lista razões |
| **Vagas & Contratos** | Pipeline completo de plantão (avulso, recorrente, cobertura, mensal, pool de reserva) |
| **Candidaturas → Alocações → Escala** | Aprovação gera alocação; controle de presença/ausência/atraso |
| **IA conversacional** | Aborda e negocia plantões via WhatsApp, com tool calls e handoff humano para ações críticas |
| **Financeiro** | Recebíveis (cliente/órgão público), pagáveis (profissional), taxa de plataforma e margem |
| **Credenciamento** | Conselhos, CBO, RQE, especialidades, documentos com validade e revisão |
| **Auditoria & RBAC** | Trilha de toda mutação; perfis Admin/Manager/Operator/Viewer |
| **White-label** | Branding por cliente (essencial para vender a cooperativas com marca própria) |

**Estágio de maturidade:** **MVP maduro / pronto para produção**. O produto já operou em produção (versão anterior) e foi reconstruído com paridade 1:1 validada. **Lacunas para escala** (no roadmap): multi-tenancy robusto, billing automatizado (gateway/split de pagamento), observabilidade e testes de carga, e ativação plena do agente de IA em produção.

---

## 6. Estratégia de marketing e vendas (Go-to-Market)

**Fase 0 — Âncora (mês 0–6):** fechar a cooperativa como **investidor + cliente-âncora**. Piloto em uma ou duas unidades/especialidades, com meta de provar redução de tempo de preenchimento e plantões descobertos. **Co-marketing**: o case da âncora vira a principal peça de venda.

**Fase 1 — Densidade regional (mês 6–18):** expandir dentro da âncora (mais unidades/especialidades) e abordar **outras cooperativas de saúde do Nordeste**. Canal: venda direta consultiva (founder-led sales → 1º comercial), indicação da âncora, presença em eventos do setor cooperativista de saúde.

**Fase 2 — Novos segmentos (mês 18–36):** hospitais e redes privadas do NE; piloto no **setor público** (UPAs/UBS via OSS, onde a auditoria é diferencial). Início de motor de inbound (conteúdo, SEO, indicações).

**Canais de aquisição e CAC esperado:**
- **Indicação/rede de cooperativas** (CAC mais baixo) — principal motor.
- **Venda direta consultiva** (founder-led → SDR/closer).
- **Marketing de conteúdo + eventos setoriais** (médio prazo).
- 🔹 **Aquisição de profissionais (oferta): CAC ≈ R$ 0** na âncora (base de 55 mil cooperados pré-existente) — vantagem competitiva central.

---

## 7. Estrutura operacional e equipe

**Hoje:** fundador solo (bootstrap), produto construído. **A rodada financia o time mínimo viável para operar e escalar.**

**Plano de contratação (uso da rodada):**

| Fase | Contratações | Racional |
|---|---|---|
| **Imediato (mês 0–3)** | 1 Eng. full-stack sênior · 1 Customer Success/Ops | Hardening do produto (multi-tenancy, billing) + onboarding da âncora e liquidez do marketplace |
| **Mês 3–9** | +1 Eng. · 1 Comercial (founder-led → closer) | Sustentar a âncora e abrir novas cooperativas |
| **Mês 9–18** | +1 Eng./Dados · +1 CS · suporte | Escala de IA/matching e múltiplos clientes |
| **Contínuo (PJ/fracionado)** | Design, Financeiro/Contábil, Jurídico/Compliance | Custo variável até justificar CLT |

**Estrutura jurídica/operacional:** PJ enxuta, contabilidade terceirizada, jurídico/LGPD e compliance regulatório (dados de saúde) como prioridade desde o início. Founder acumula CEO + Produto na fase pre-seed.

---

## 8. Plano financeiro SaaS

> 🔹 **Premissas-base** (a validar no piloto):
> - Ticket médio por plantão (GMV): **R$ 1.300**.
> - **Take-rate** sobre GMV: conservador **5%** · realista **7%** · otimista **8%**.
> - **SaaS** (assinatura institucional): ARPA blended ~R$ 4.000/conta/mês (mix de Essencial R$600 / Pro R$2,5k / Enterprise R$8–15k).
> - **Margem bruta blended:** 62% (cons.) / 68% (real.) / 72% (otim.) — já líquida de COGS de meios de pagamento (~1,8% do GMV), WhatsApp (~R$0,30/conversa) e infra/IA.
> - Encargos trabalhistas: custo total ≈ 1,75× salário bruto (CLT).

### 8.1 Drivers de volume (cenário realista)

| Driver | Ano 1 | Ano 2 | Ano 3 |
|---|---|---|---|
| Plantões intermediados (média/mês) | 800 | 4.500 | 12.000 |
| Plantões/ano | 9.600 | 54.000 | 144.000 |
| **GMV/ano** | **R$ 12,5 mi** | **R$ 70,2 mi** | **R$ 187,2 mi** |
| Contas SaaS pagantes (saída do ano) | ~10 | ~25 | ~55 |
| MRR (saída do ano) | R$ 35 mil | R$ 150 mil | R$ 420 mil |

### 8.2 Receita — 3 cenários (receita líquida = take-rate + SaaS)

| | Conservador | Realista | Otimista |
|---|---|---|---|
| **Ano 1** | R$ 0,43 mi | **R$ 1,09 mi** | R$ 1,98 mi |
| **Ano 2** | R$ 2,26 mi | **R$ 5,99 mi** | R$ 11,9 mi |
| **Ano 3** | R$ 6,38 mi | **R$ 16,5 mi** | R$ 33,3 mi |
| GMV Ano 3 | R$ 93,6 mi | R$ 187,2 mi | R$ 343,2 mi |

### 8.3 P&L resumido (cenário realista, R$ mil)

| Linha | Ano 1 | Ano 2 | Ano 3 |
|---|---|---|---|
| Receita líquida | 1.090 | 5.990 | 16.500 |
| (–) COGS | (350) | (1.917) | (5.280) |
| **Lucro bruto (≈68%)** | **740** | **4.073** | **11.220** |
| Pessoal | (1.100) | (2.400) | (4.800) |
| Marketing & Vendas | (150) | (600) | (1.800) |
| Infra/ferramentas | (120) | (300) | (700) |
| G&A / jurídico / contábil | (120) | (300) | (700) |
| **Opex total** | **(1.490)** | **(3.600)** | **(8.000)** |
| **EBITDA** | **(750)** | **+473** | **+3.220** |
| Margem EBITDA | –69% | +8% | +20% |

**Break-even operacional (realista): ~mês 20–22** (durante o Ano 2). Conservador: ~mês 30+ (pode exigir ponte/segunda rodada). Otimista: ~mês 14–16.

### 8.4 Métricas-chave SaaS

> 🔹 Métricas em **visão SaaS-only (conservadora)** — forma defensável de avaliar em pré-lançamento. A economia *blended* (SaaS + take-rate por cliente) é materialmente superior, mas limitada por **liquidez**, não por CAC.

| Métrica | Valor (realista, SaaS-only) | Benchmark Brasil | Leitura |
|---|---|---|---|
| **ARPA** | R$ 4.000/mês | — | Mix institucional |
| **CAC** (por conta institucional) | R$ 15.000 | — | Venda consultiva B2B saúde |
| **Churn anual (logo)** | 12% | 10–15% bom; <10% ótimo | Alto switching cost |
| **LTV** (margem, 36m capado) | ~R$ 115 mil | — | Conservador (sem take-rate) |
| **LTV/CAC** | **~7,7×** | >3 saudável | Forte — sobe no blended |
| **Payback de CAC** | **~4,7 meses** | <12m saudável | Excelente |
| **CAC de profissionais (oferta)** | ~R$ 0 na âncora | — | Vantagem estrutural |

### 8.5 Necessidade de investimento (o "ask")

**Captação pre-seed: R$ 1,5 milhão** para **~20 meses de runway**, cruzando o vale de burn do Ano 1 (~R$ 750 mil) com folga até o break-even.

**Uso dos recursos:**

| Destino | % | Valor | Para quê |
|---|---|---|---|
| Produto & Engenharia | 55% | R$ 825 mil | Time eng, multi-tenancy, billing/split, IA em produção |
| GTM (Vendas & Marketing) | 18% | R$ 270 mil | CS/Ops, comercial, co-marketing com a âncora |
| Infra & COGS iniciais | 10% | R$ 150 mil | Cloud, WhatsApp, meios de pagamento |
| Jurídico/Compliance/LGPD | 9% | R$ 135 mil | Dados de saúde, contratos, IP |
| Reserva/contingência | 8% | R$ 120 mil | Buffer |

**Recomendação estratégica:** estruturar a rodada **com a cooperativa-âncora como investidora estratégica** ("smart money"): além do capital, ela traz o primeiro contrato, a oferta de 55 mil profissionais e a porta para outras cooperativas. Idealmente um **SAFE / nota conversível** com teto e desconto — recomendo discutir teto na faixa de R$ 6–10 mi, a calibrar.

---

## 9. Análise SWOT

| Forças | Fraquezas |
|---|---|
| Produto pronto e já validado em produção | Fundador solo; sem time formado |
| Canal de distribuição único (rede de cooperativas) | Sem receita/tração comercial ainda |
| Liquidez de oferta no dia 1 (55k cooperados) | Dependência inicial de um único cliente-âncora |
| IA + matching + financeiro num só lugar | Multi-tenancy/billing ainda a construir |
| CAC de oferta ≈ 0 | Código é reconstrução (titularidade de IP a blindar) |

| Oportunidades | Ameaças |
|---|---|
| Mercado enorme e manual (R$ bi em GMV) | Cooperativa/cliente decidir construir in-house |
| Expansão para setor público (SUS/UPAs) | Mudança regulatória (CLT vs PJ, dados de saúde/LGPD) |
| Sistema cooperativista nacional como esteira | Players internacionais entrarem no Brasil |
| IA reduz custo operacional drasticamente | Concentração: perder a âncora seria crítico |

---

## 10. Riscos e mitigação

| Risco | Prob./Impacto | Mitigação |
|---|---|---|
| **Concentração na âncora** | Médio/Alto | Usar o piloto para abrir 2–3 cooperativas no Ano 1; contrato plurianual com a âncora |
| **Titularidade do código (reconstrução)** | Médio/Alto | Due diligence de IP: garantir cessão/propriedade limpa do código e dos dados antes da rodada |
| **Regulatório/trabalhista** (PJ × CLT) | Médio/Alto | Jurídico especializado; posicionar como ferramenta de gestão da cooperativa, que detém o vínculo |
| **LGPD / dados sensíveis de saúde** | Médio/Alto | Compliance desde o início; criptografia, RBAC, DPO terceirizado |
| **Custo de meios de pagamento erodir o take** | Médio/Médio | Negociar split/escrow; opção "track-only" reduz COGS |
| **Execução com time pequeno** | Médio/Médio | Contratações-chave logo na rodada; founder foca em produto + âncora |
| **Adoção pelos profissionais (oferta)** | Baixo/Médio | IA via WhatsApp reduz fricção; âncora já tem relacionamento com cooperados |

---

## 11. Roadmap e próximos passos (12–36 meses)

**0–6 meses — Fundação & Âncora**
- Fechar rodada pre-seed (com a cooperativa como investidora estratégica).
- Contratar Eng. sênior + CS/Ops. Blindar IP/LGPD.
- Hardening: multi-tenancy + billing/split + IA em produção.
- Piloto na âncora → métricas: tempo de preenchimento, % plantões descobertos, NPS do coordenador.

**6–18 meses — Densidade regional**
- Expandir dentro da âncora; abrir 2–3 cooperativas do NE.
- 1º comercial; co-marketing do case.
- Meta: MRR ~R$ 150 mil e GMV ~R$ 70 mi/ano (realista) → break-even ~mês 20–22.

**18–36 meses — Expansão de segmento**
- Hospitais/redes privadas do NE; piloto no setor público (UPAs/UBS).
- Motor de inbound (conteúdo/SEO) e indicações.
- Preparar rodada seed (com tração) para expansão nacional via sistema cooperativista.
- Meta: receita líquida ~R$ 16,5 mi e EBITDA positivo (~20%).

---

### Premissas críticas a validar no piloto
1. Ticket médio do plantão e take-rate aceito pela cooperativa (🔹R$1.300 / 7%).
2. Volume real de plantões que migram para a plataforma.
3. Disposição da âncora a pagar SaaS **e** fee (modelo híbrido) — ou se concentra em um.
4. Custo efetivo de meios de pagamento (define se vale operar o fluxo financeiro ou só "track-only").
5. Churn e expansão reais entre cooperativas.
