const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TableOfContents, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  TabStopType, InternalHyperlink, Bookmark,
} = require("./node_modules/docx");

// Page numbers for the manual TOC (measured from a render pass; see _toc_pages.json)
let TOCPAGES = {};
try { TOCPAGES = require("./_toc_pages.json"); } catch (e) { TOCPAGES = {}; }

const NAVY = "0B2D5B", BLUE = "0B74D1", LIGHT = "DCE6F1", GREY = "F2F2F2", ACCENT = "1F6FB2";
const CW = 9026; // A4 content width @1" margins
const FONT = "Arial";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };
const cellMargins = { top: 60, bottom: 60, left: 110, right: 110 };

function P(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, ...opts.run })];
  return new Paragraph({ children: runs, spacing: { after: opts.after ?? 120, line: 264 },
    alignment: opts.align, ...opts.p });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
    children: [new TextRun(text)] });
}
function H2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function bullet(text, run = {}) {
  return new Paragraph({ numbering: { reference: "b", level: 0 },
    children: [new TextRun({ text, ...run })], spacing: { after: 60, line: 264 } });
}
function num(text) {
  return new Paragraph({ numbering: { reference: "n", level: 0 },
    children: [new TextRun(text)], spacing: { after: 60, line: 264 } });
}

// cell content: string | array of strings (each a paragraph). opts: {bold, fill, color, size, align, bullets}
function cell(content, w, opts = {}) {
  let paras;
  if (Array.isArray(content)) {
    paras = content.map((t) => opts.bullets
      ? new Paragraph({ numbering: { reference: "tb", level: 0 }, spacing: { after: 30, line: 240 },
          children: [new TextRun({ text: t, font: FONT, size: opts.size ?? 18, color: opts.color, bold: opts.bold })] })
      : new Paragraph({ spacing: { after: 30, line: 240 }, alignment: opts.align,
          children: [new TextRun({ text: t, font: FONT, size: opts.size ?? 18, color: opts.color, bold: opts.bold })] }));
  } else {
    paras = [new Paragraph({ alignment: opts.align, spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: content, font: FONT, size: opts.size ?? 18, color: opts.color, bold: opts.bold })] })];
  }
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: paras });
}

function table(widths, headerRow, dataRows, opts = {}) {
  const rows = [];
  if (headerRow) {
    rows.push(new TableRow({ tableHeader: true, children: headerRow.map((h, i) =>
      cell(h, widths[i], { bold: true, color: "FFFFFF", fill: NAVY, align: AlignmentType.CENTER, size: opts.hsize ?? 18 })) }));
  }
  dataRows.forEach((r, ri) => {
    rows.push(new TableRow({ children: r.map((c, i) => {
      const co = (typeof c === "object" && !Array.isArray(c)) ? c : { v: c };
      const zebra = ri % 2 === 1 ? GREY : undefined;
      return cell(co.v, widths[i], { bold: co.bold, fill: co.fill ?? (i === 0 && opts.firstBold ? LIGHT : zebra),
        bullets: co.bullets, color: co.color, align: co.align, size: co.size });
    }) }));
  });
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths, rows, borders });
}
function spacer(after = 160) { return new Paragraph({ spacing: { after }, children: [] }); }
function note(text) {
  return new Paragraph({ spacing: { before: 80, after: 160, line: 252 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
    shading: { fill: "EEF4FA", type: ShadingType.CLEAR },
    children: [new TextRun({ text, italics: true, font: FONT, size: 18, color: "333333" })] });
}

// ---------------------------------------------------------------- COVER
const cover = [
  new Paragraph({ spacing: { before: 1800, after: 0 }, children: [
    new TextRun({ text: "HealthMatch", font: FONT, size: 72, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 6 } },
    children: [new TextRun({ text: "Business Plan", font: FONT, size: 40, color: BLUE })] }),
  P([new TextRun({ text: "Plataforma de gestão e alocação inteligente de força de trabalho em saúde",
    font: FONT, size: 26, color: "333333" })], { after: 600 }),
  table([3000, 6026], null, [
    [{ v: "Versão", bold: true, fill: LIGHT }, "Captação Pre-seed"],
    [{ v: "Data", bold: true, fill: LIGHT }, "Junho / 2026"],
    [{ v: "Estágio", bold: true, fill: LIGHT }, "Pré-lançamento — produto funcionalmente pronto"],
    [{ v: "Beachhead", bold: true, fill: LIGHT }, "Fortaleza / Ceará"],
    [{ v: "Modelo", bold: true, fill: LIGHT }, "Híbrido: SaaS (MRR) + fee de intermediação (take-rate)"],
    [{ v: "Captação-alvo", bold: true, fill: LIGHT }, "R$ 1,5 milhão (pre-seed)"],
  ]),
  spacer(400),
  note("Documento confidencial. Em pré-lançamento, sem receita realizada: todas as projeções são premissas de mercado, sinalizadas com 🔹, baseadas em benchmarks de SaaS/marketplace no Brasil (2024–2025) e a validar no piloto com a cooperativa-âncora."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------- TOC (manual, com nº de página real)
const TOC_ITEMS = [
  "1. Sumário executivo",
  "2. Descrição da plataforma",
  "3. Análise de mercado",
  "4. Público-alvo e personas",
  "5. Produto e funcionalidades",
  "6. Estratégia de marketing e vendas (Go-to-Market)",
  "7. Estrutura operacional e equipe",
  "8. Plano financeiro SaaS",
  "9. Análise SWOT",
  "10. Riscos e plano de mitigação",
  "11. Roadmap e próximos passos (12–36 meses)",
];
function tocLine(text, i) {
  const pg = TOCPAGES["sec" + (i + 1)];
  const pageStr = pg ? String(pg) : "";
  return new Paragraph({
    spacing: { after: 100, line: 276 },
    tabStops: [{ type: TabStopType.RIGHT, position: 9026, leader: "dot" }],
    children: [
      new TextRun({ text, font: FONT, size: 22, color: INK }),
      new TextRun({ text: "\t" + pageStr, font: FONT, size: 22, color: NAVY, bold: true }),
    ],
  });
}
const INK = "1A2B45";
const toc = [
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Sumário", font: FONT, size: 32, bold: true, color: NAVY })] }),
  ...TOC_ITEMS.map((t, i) => tocLine(t, i)),
];

// ---------------------------------------------------------------- 1. SUMÁRIO EXECUTIVO
const s1 = [
  H1("1. Sumário executivo"),
  P("HealthMatch é uma plataforma B2B (SaaS + marketplace gerenciado) que resolve uma das dores mais caras e silenciosas da saúde brasileira: preencher plantões e vagas com o profissional certo, credenciado e disponível, no tempo certo — hoje feito à mão, por WhatsApp, planilhas e telefonemas."),
  P("A plataforma combina um motor de matching (especialidade, CBO, situação de credenciamento, histórico de comparecimento e conflito de agenda), um agente de IA conversacional que aborda e negocia plantões via WhatsApp, e um back-office financeiro de intermediação (recebíveis do cliente, pagáveis ao profissional e margem da plataforma) — com trilha de auditoria e gestão de documentos."),
  P([new TextRun({ text: "Diferencial de entrada (wedge): ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "o investidor-âncora é uma grande cooperativa de saúde do Ceará com 55 mil cooperados, que será simultaneamente (a) investidor estratégico, (b) primeiro cliente-âncora e (c) base massiva de oferta de profissionais. Isso elimina o problema do “ovo e galinha” de marketplaces: o HealthMatch nasce com liquidez de oferta e demanda no dia 1, com CAC de profissionais próximo de zero.", font: FONT, size: 22 })]),
  spacer(80),
  table([2400, 6626], ["Item", "Resumo"], [
    ["Modelo", "Híbrido: assinatura SaaS (MRR) + fee de intermediação (take-rate sobre GMV de plantões)"],
    ["Mercado (TAM Brasil)", "🔹 ~R$ 15–20 bi/ano em GMV de plantões/escalas de saúde (estimativa bottom-up)"],
    ["Beachhead", "Cooperativas de saúde do Ceará/Nordeste → hospitais privados → setor público"],
    ["Status do produto", "Funcionalmente completo (já operou em produção; base de código reconstruída e auditada)"],
    ["Ask (pre-seed)", "R$ 1,5 mi para ~20 meses de runway até o break-even operacional"],
    ["Projeção realista", "Receita líquida Ano 1 ~R$ 1,1 mi → Ano 3 ~R$ 16,5 mi; break-even ~mês 20–22"],
    ["Time", "Fundador solo (bootstrap); a rodada financia eng, CS/Ops e comercial"],
  ], { firstBold: true }),
  spacer(100),
  P([new TextRun({ text: "A tese: ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "o staffing de saúde tech-enabled está validado globalmente (Nomad Health, Trusted Health, Medely nos EUA; Patchwork e Locum’s Nest no Reino Unido captaram centenas de milhões de dólares). No Brasil, o setor é gigante e ainda artesanal. O HealthMatch ataca esse mercado com um canal de distribuição privilegiado (a rede de cooperativas de saúde) e um produto pronto.", font: FONT, size: 22 })]),
];

// ---------------------------------------------------------------- 2. DESCRIÇÃO
const s2 = [
  H1("2. Descrição da plataforma"),
  P([new TextRun({ text: "Missão: ", bold: true, font: FONT, size: 22, color: NAVY }), new TextRun({ text: "garantir que toda unidade de saúde tenha o profissional certo no plantão certo — com agilidade, conformidade e custo justo.", font: FONT, size: 22 })]),
  P([new TextRun({ text: "Visão: ", bold: true, font: FONT, size: 22, color: NAVY }), new TextRun({ text: "ser a camada de inteligência operacional do trabalho em saúde no Brasil — o “sistema operacional” que conecta profissionais, unidades, cooperativas e o poder público.", font: FONT, size: 22 })]),
  H2("Proposta de valor"),
  table([2300, 3363, 3363], ["Para quem", "Dor hoje", "O que o HealthMatch entrega"], [
    ["Cooperativas / intermediadoras", "Escala manual, WhatsApp, plantão descoberto, baixa visibilidade financeira", "Preenchimento automatizado, IA que negocia plantões 24/7, painel de margem em tempo real"],
    ["Hospitais / redes privadas", "Plantões descobertos, dependência de poucos plantonistas, credenciamento manual", "Banco de plantonistas qualificados, matching com checagem de credencial e conflito de agenda"],
    ["Setor público (SUS / UPAs)", "Dificuldade de cobertura, controle de presença, conformidade", "Gestão de escala com auditoria, controle de comparecimento e rastreabilidade"],
    ["Profissionais de saúde", "Plantões via grupos informais, atrasos de pagamento, burocracia", "Ofertas compatíveis com o perfil via WhatsApp e transparência de pagamento"],
  ], { firstBold: true, hsize: 18 }),
  spacer(100),
  P([new TextRun({ text: "Capacidades já existentes no produto: ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "cadastro regulatório-aware (conselhos CRM/COREN/CREFITO, CBO, RQE, especialidades); matching com detecção de conflito de agenda e no-show; pipeline de vagas; candidaturas → alocações → escala com controle de presença; mensageria omnichannel (WhatsApp/SMS/e-mail) com agente de IA e handoff humano; financeiro de intermediação com margem; auditoria completa; RBAC; e white-label.", font: FONT, size: 22 })]),
];

// ---------------------------------------------------------------- 3. MERCADO
const s3 = [
  H1("3. Análise de mercado"),
  H2("3.1 Contexto"),
  P("O Brasil tem ~562 mil médicos ativos (CFM, 2024) e mais de 2,5 milhões de profissionais de saúde no total. A demanda por plantões é estrutural e crescente: envelhecimento populacional, expansão de UPAs/UBS, judicialização da saúde e déficit crônico de cobertura fora dos grandes centros. O preenchimento de plantões é, hoje, majoritariamente manual — grupos de WhatsApp, planilhas, agências locais e cooperativas com pouca tecnologia."),
  H2("3.2 TAM / SAM / SOM (bottom-up)"),
  note("🔹 Metodologia: GMV de plantões = nº de plantões/ano × ticket médio (assumido R$ 1.300/plantão de 12h; Nordeste tende a ser menor que SP). A receita endereçável é uma fração do GMV (take-rate + SaaS)."),
  table([1500, 3526, 2000, 2000], ["Camada", "Definição", "GMV/ano", "Receita endereçável (≈10%)"], [
    ["TAM", "Todo o GMV de plantões/escalas de saúde no Brasil", "🔹 R$ 15–20 bi", "🔹 R$ 1,5–2,0 bi"],
    ["SAM", "Nordeste + cooperativas/hospitais privados/público", "🔹 R$ 3–4 bi", "🔹 R$ 300–450 mi"],
    ["SOM (3–5 anos)", "CE + cooperativas adjacentes do NE capturáveis", "🔹 R$ 150–300 mi", "🔹 R$ 15–30 mi"],
  ], { firstBold: true }),
  spacer(80),
  P("O SOM converge com a projeção financeira (Ano 3 realista ~R$ 16,5 mi de receita líquida), mantendo o plano internamente consistente."),
  H2("3.3 Tendências favoráveis"),
  bullet("Digitalização tardia da saúde operacional — a “última milha” (RH/escala) ainda é manual."),
  bullet("Maturação do WhatsApp Business + IA generativa: automação de recrutamento conversacional a custo marginal baixíssimo."),
  bullet("Pressão por eficiência e conformidade no setor público (controle de presença, prestação de contas)."),
  bullet("Modelo validado lá fora: Nomad Health, Trusted Health, Medely, ShiftMed (EUA); Patchwork, Locum’s Nest (Reino Unido)."),
  H2("3.4 Concorrência"),
  table([2400, 2400, 2113, 2113], ["Categoria", "Quem é", "Força", "Fraqueza (oportunidade)"], [
    [{ v: "Status quo informal (concorrente #1)", bold: true }, "WhatsApp, planilhas, telefonemas, “donos de escala”", "Custo zero, já existe", "Não escala, sem auditoria, sem matching"],
    ["Agências/cooperativas tradicionais", "Intermediadoras regionais, cooperativas médicas", "Relacionamento, base de médicos", "Pouca tecnologia, margens opacas"],
    ["Software hospitalar (HIS)", "Tasy/MV, Soul MV, ProDoctor", "Implantados em hospitais", "Sem foco em matching, IA e plantão"],
    ["Gestão de clínicas / agenda", "iClinic, Feegow, Docplanner", "Base instalada", "Foco em agenda clínica, não em escala"],
    ["Marketplaces de saúde adjacentes", "Conexa, Docway (telemedicina)", "Tração digital", "Não atacam escala/plantão"],
    ["Comps internacionais (validação)", "Nomad, Trusted, Medely, Patchwork", "Provam o modelo e o tamanho", "Não operam no Brasil"],
  ], { firstBold: true, hsize: 17 }),
  spacer(80),
  P([new TextRun({ text: "Insight competitivo: ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "o concorrente a vencer não é outro software — é o processo manual + agências locais. O HealthMatch ganha por ser ~10x mais rápido e barato que a operação manual, com conformidade e dados que o status quo não oferece, entrando por um canal que ninguém mais tem (a rede de cooperativas).", font: FONT, size: 22 })]),
];

// ---------------------------------------------------------------- 4. PÚBLICO
const s4 = [
  H1("4. Público-alvo e personas"),
  P([new TextRun({ text: "ICP recomendado (beachhead): ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "começar dentro da cooperativa-âncora como design partner e primeiro cliente, usando seus 55 mil cooperados como oferta. Provar o modelo em Fortaleza, replicar para outras cooperativas do Nordeste, depois hospitais/redes privadas e, por fim, o setor público (UPAs/UBS).", font: FONT, size: 22 })]),
  note("Por que esse beachhead e não “hospitais” ou “público” direto: a cooperativa entrega liquidez dos dois lados no dia 1 (demanda + oferta) e um campeão interno com capital. Hospitais privados têm venda consultiva mais longa; o setor público exige licitação e ciclos longos — ambos são expansão, não entrada."),
  H2("Personas"),
  num("Coordenador(a) de escala da cooperativa (comprador/usuário-chave): vive apagando incêndio de plantão descoberto. Ganha automação e previsibilidade."),
  num("Diretor(a) financeiro/operações (decisor econômico): quer visibilidade de margem, redução de custo operacional e conformidade."),
  num("Médico/profissional cooperado (oferta): quer ofertas relevantes, sem burocracia e com pagamento transparente, pelo WhatsApp."),
  num("Gestor público/OSS de saúde (expansão): precisa cobrir UPAs/UBS com rastreabilidade para prestação de contas."),
];

// ---------------------------------------------------------------- 5. PRODUTO
const s5 = [
  H1("5. Produto e funcionalidades"),
  P([new TextRun({ text: "Stack técnica: ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "Backend NestJS + Prisma + PostgreSQL; Frontend Next.js (App Router) + Tailwind; IA via Anthropic (modelo Haiku para custo marginal baixo); mensageria via Twilio/WhatsApp/Meta/Zenvia; auth por cookie httpOnly; deploy em Docker. Arquitetura modular (~20 módulos) e API REST padronizada.", font: FONT, size: 22 })]),
  H2("Módulos funcionais (implementados e testados — 32/32 testes de API, 14/14 de regras de negócio)"),
  table([2700, 6326], ["Módulo", "O que faz"], [
    ["Matching", "Pontua profissional × vaga (LOW/MEDIUM/HIGH), detecta conflito de agenda e elegibilidade, lista razões"],
    ["Vagas & Contratos", "Pipeline completo de plantão (avulso, recorrente, cobertura, mensal, pool de reserva)"],
    ["Candidaturas → Alocações → Escala", "Aprovação gera alocação; controle de presença/ausência/atraso"],
    ["IA conversacional", "Aborda e negocia plantões via WhatsApp, com tool calls e handoff humano para ações críticas"],
    ["Financeiro", "Recebíveis (cliente/órgão público), pagáveis (profissional), taxa de plataforma e margem"],
    ["Credenciamento", "Conselhos, CBO, RQE, especialidades, documentos com validade e revisão"],
    ["Auditoria & RBAC", "Trilha de toda mutação; perfis Admin/Manager/Operator/Viewer"],
    ["White-label", "Branding por cliente (essencial para vender a cooperativas com marca própria)"],
  ], { firstBold: true }),
  spacer(100),
  P([new TextRun({ text: "Maturidade: ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "MVP maduro / pronto para produção. O produto já operou em produção e foi reconstruído com paridade 1:1 validada. Lacunas para escala (no roadmap): multi-tenancy robusto, billing automatizado (gateway/split), observabilidade, testes de carga e ativação plena da IA em produção.", font: FONT, size: 22 })]),
];

// ---------------------------------------------------------------- 6. GTM
const s6 = [
  H1("6. Estratégia de marketing e vendas (Go-to-Market)"),
  P([new TextRun({ text: "Fase 0 — Âncora (mês 0–6): ", bold: true, font: FONT, size: 22, color: NAVY }), new TextRun({ text: "fechar a cooperativa como investidor + cliente-âncora. Piloto em 1–2 unidades/especialidades, provando redução de tempo de preenchimento e de plantões descobertos. O case da âncora vira a principal peça de venda (co-marketing).", font: FONT, size: 22 })]),
  P([new TextRun({ text: "Fase 1 — Densidade regional (mês 6–18): ", bold: true, font: FONT, size: 22, color: NAVY }), new TextRun({ text: "expandir dentro da âncora e abordar outras cooperativas de saúde do Nordeste. Canal: venda direta consultiva (founder-led → 1º comercial), indicação da âncora e eventos do setor cooperativista.", font: FONT, size: 22 })]),
  P([new TextRun({ text: "Fase 2 — Novos segmentos (mês 18–36): ", bold: true, font: FONT, size: 22, color: NAVY }), new TextRun({ text: "hospitais e redes privadas do NE; piloto no setor público (UPAs/UBS via OSS); início de motor de inbound (conteúdo, SEO, indicações).", font: FONT, size: 22 })]),
  H2("Canais de aquisição e CAC esperado"),
  bullet("Indicação/rede de cooperativas (CAC mais baixo) — principal motor."),
  bullet("Venda direta consultiva (founder-led → SDR/closer)."),
  bullet("Marketing de conteúdo + eventos setoriais (médio prazo)."),
  bullet("🔹 Aquisição de profissionais (oferta): CAC ≈ R$ 0 na âncora (55 mil cooperados pré-existentes) — vantagem competitiva central."),
];

// ---------------------------------------------------------------- 7. OPERAÇÃO
const s7 = [
  H1("7. Estrutura operacional e equipe"),
  P("Hoje: fundador solo (bootstrap), produto construído. A rodada financia o time mínimo viável para operar e escalar."),
  H2("Plano de contratação (uso da rodada)"),
  table([2100, 3463, 3463], ["Fase", "Contratações", "Racional"], [
    ["Imediato (mês 0–3)", "1 Eng. full-stack sênior · 1 Customer Success/Ops", "Hardening (multi-tenancy, billing) + onboarding da âncora e liquidez do marketplace"],
    ["Mês 3–9", "+1 Eng. · 1 Comercial (founder-led → closer)", "Sustentar a âncora e abrir novas cooperativas"],
    ["Mês 9–18", "+1 Eng./Dados · +1 CS · suporte", "Escala de IA/matching e múltiplos clientes"],
    ["Contínuo (PJ/fracionado)", "Design, Financeiro/Contábil, Jurídico/Compliance", "Custo variável até justificar CLT"],
  ], { firstBold: true }),
  spacer(80),
  P("Estrutura jurídica/operacional: PJ enxuta, contabilidade terceirizada, jurídico/LGPD e compliance regulatório (dados de saúde) como prioridade desde o início. O founder acumula CEO + Produto na fase pre-seed."),
];

// ---------------------------------------------------------------- 8. FINANCEIRO
const m = (n) => n.toLocaleString("pt-BR");
const s8 = [
  H1("8. Plano financeiro SaaS"),
  note("🔹 Premissas-base (a validar no piloto): ticket médio por plantão R$ 1.300; take-rate 5% (cons.) / 7% (real.) / 8% (otim.); ARPA SaaS ~R$ 4.000/conta/mês; margem bruta blended 62%/68%/72% (líquida de meios de pagamento ~1,8% do GMV, WhatsApp ~R$0,30/conversa e infra/IA); encargos trabalhistas ≈ 1,75× salário bruto."),
  H2("8.1 Drivers de volume (cenário realista)"),
  table([3626, 1800, 1800, 1800], ["Driver", "Ano 1", "Ano 2", "Ano 3"], [
    ["Plantões intermediados (média/mês)", "800", "4.500", "12.000"],
    ["Plantões/ano", "9.600", "54.000", "144.000"],
    [{ v: "GMV/ano", bold: true }, { v: "R$ 12,5 mi", bold: true }, { v: "R$ 70,2 mi", bold: true }, { v: "R$ 187,2 mi", bold: true }],
    ["Contas SaaS pagantes (saída do ano)", "~10", "~25", "~55"],
    ["MRR (saída do ano)", "R$ 35 mil", "R$ 150 mil", "R$ 420 mil"],
  ], { firstBold: true }),
  H2("8.2 Receita — 3 cenários (receita líquida = take-rate + SaaS)"),
  table([3026, 2000, 2000, 2000], ["Cenário", "Ano 1", "Ano 2", "Ano 3"], [
    ["Conservador", "R$ 0,43 mi", "R$ 2,26 mi", "R$ 6,38 mi"],
    [{ v: "Realista", bold: true }, { v: "R$ 1,09 mi", bold: true }, { v: "R$ 5,99 mi", bold: true }, { v: "R$ 16,5 mi", bold: true }],
    ["Otimista", "R$ 1,98 mi", "R$ 11,9 mi", "R$ 33,3 mi"],
    [{ v: "GMV (Ano 3)", color: "555555" }, { v: "—", color: "555555" }, { v: "—", color: "555555" }, { v: "R$ 187,2 mi", color: "555555" }],
  ], { firstBold: true }),
  H2("8.3 DRE resumida (cenário realista, R$ mil)"),
  table([3026, 2000, 2000, 2000], ["Linha", "Ano 1", "Ano 2", "Ano 3"], [
    ["Receita líquida", "1.090", "5.990", "16.500"],
    ["(–) COGS", "(350)", "(1.917)", "(5.280)"],
    [{ v: "Lucro bruto (≈68%)", bold: true }, { v: "740", bold: true }, { v: "4.073", bold: true }, { v: "11.220", bold: true }],
    ["Pessoal", "(1.100)", "(2.400)", "(4.800)"],
    ["Marketing & Vendas", "(150)", "(600)", "(1.800)"],
    ["Infra / ferramentas", "(120)", "(300)", "(700)"],
    ["G&A / jurídico / contábil", "(120)", "(300)", "(700)"],
    [{ v: "Opex total", bold: true }, { v: "(1.490)", bold: true }, { v: "(3.600)", bold: true }, { v: "(8.000)", bold: true }],
    [{ v: "EBITDA", bold: true, fill: LIGHT }, { v: "(750)", bold: true, fill: LIGHT }, { v: "+473", bold: true, fill: LIGHT }, { v: "+3.220", bold: true, fill: LIGHT }],
    ["Margem EBITDA", "–69%", "+8%", "+20%"],
  ], { firstBold: true }),
  spacer(60),
  P([new TextRun({ text: "Break-even operacional (realista): ~mês 20–22 ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "(durante o Ano 2). Conservador: ~mês 30+ (pode exigir ponte). Otimista: ~mês 14–16.", font: FONT, size: 22 })]),
  H2("8.4 Métricas-chave SaaS (visão SaaS-only, conservadora)"),
  note("🔹 Reporto a visão SaaS-only para ser defensável em pré-lançamento. A economia blended (SaaS + take-rate por cliente) é materialmente superior, mas limitada por liquidez, não por CAC."),
  table([2926, 2200, 1900, 2000], ["Métrica", "Valor", "Benchmark BR", "Leitura"], [
    ["ARPA", "R$ 4.000/mês", "—", "Mix institucional"],
    ["CAC (conta institucional)", "R$ 15.000", "—", "Venda consultiva B2B saúde"],
    ["Churn anual (logo)", "12%", "10–15% bom", "Alto switching cost"],
    ["LTV (36m capado)", "~R$ 115 mil", "—", "Conservador (sem take)"],
    [{ v: "LTV / CAC", bold: true }, { v: "~7,7×", bold: true }, ">3 saudável", "Forte; sobe no blended"],
    [{ v: "Payback de CAC", bold: true }, { v: "~4,7 meses", bold: true }, "<12m saudável", "Excelente"],
    ["CAC de profissionais", "≈ R$ 0 na âncora", "—", "Vantagem estrutural"],
  ], { firstBold: true, hsize: 17 }),
  H2("8.5 Necessidade de investimento (o “ask”)"),
  P([new TextRun({ text: "Captação pre-seed: R$ 1,5 milhão ", bold: true, font: FONT, size: 22, color: NAVY }),
     new TextRun({ text: "para ~20 meses de runway, cruzando o vale de burn do Ano 1 (~R$ 750 mil) com folga até o break-even.", font: FONT, size: 22 })]),
  table([3563, 1200, 1800, 2463], ["Destino", "%", "Valor", "Para quê"], [
    ["Produto & Engenharia", "55%", "R$ 825 mil", "Eng, multi-tenancy, billing/split, IA em produção"],
    ["GTM (Vendas & Marketing)", "18%", "R$ 270 mil", "CS/Ops, comercial, co-marketing"],
    ["Infra & COGS iniciais", "10%", "R$ 150 mil", "Cloud, WhatsApp, meios de pagamento"],
    ["Jurídico/Compliance/LGPD", "9%", "R$ 135 mil", "Dados de saúde, contratos, IP"],
    ["Reserva/contingência", "8%", "R$ 120 mil", "Buffer"],
  ], { firstBold: true, hsize: 17 }),
  spacer(80),
  note("Recomendação estratégica: estruturar a rodada com a cooperativa-âncora como investidora estratégica (“smart money”) — capital + primeiro contrato + oferta de 55 mil profissionais + porta para outras cooperativas. Idealmente um SAFE / nota conversível com teto (sugiro discutir a faixa de R$ 6–10 mi) e desconto, evitando travar valuation cedo."),
];

// ---------------------------------------------------------------- 9. SWOT
const swotCell = (title, items, fill) => cell([title, ...items], 4513, { fill, bullets: false, bold: false });
function swotBox(title, color, items) {
  const paras = [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, color: "FFFFFF", font: FONT, size: 20 })] })];
  items.forEach((t) => paras.push(new Paragraph({ numbering: { reference: "tb", level: 0 }, spacing: { after: 30, line: 240 },
    children: [new TextRun({ text: t, font: FONT, size: 18 })] })));
  return new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.TOP,
    children: paras });
}
const headCell = (t, fill) => new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins,
  shading: { fill, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF", font: FONT, size: 20 })] })] });
const s9 = [
  H1("9. Análise SWOT"),
  new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [4513, 4513], borders, rows: [
    new TableRow({ children: [headCell("Forças", "1E7A34"), headCell("Fraquezas", "B45309")] }),
    new TableRow({ children: [
      new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.TOP, children:
        ["Produto pronto e já validado em produção","Canal de distribuição único (rede de cooperativas)","Liquidez de oferta no dia 1 (55k cooperados)","IA + matching + financeiro num só lugar","CAC de oferta ≈ 0"].map((t)=>new Paragraph({ numbering:{reference:"tb",level:0}, spacing:{after:30,line:240}, children:[new TextRun({text:t,font:FONT,size:18})]})) }),
      new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.TOP, children:
        ["Fundador solo; sem time formado","Sem receita/tração comercial ainda","Dependência inicial de um único cliente-âncora","Multi-tenancy/billing ainda a construir","Código é reconstrução (titularidade de IP a blindar)"].map((t)=>new Paragraph({ numbering:{reference:"tb",level:0}, spacing:{after:30,line:240}, children:[new TextRun({text:t,font:FONT,size:18})]})) }),
    ]}),
    new TableRow({ children: [headCell("Oportunidades", "1F6FB2"), headCell("Ameaças", "9B1C1C")] }),
    new TableRow({ children: [
      new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.TOP, children:
        ["Mercado enorme e manual (R$ bi em GMV)","Expansão para o setor público (SUS/UPAs)","Sistema cooperativista nacional como esteira","IA reduz custo operacional drasticamente"].map((t)=>new Paragraph({ numbering:{reference:"tb",level:0}, spacing:{after:30,line:240}, children:[new TextRun({text:t,font:FONT,size:18})]})) }),
      new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.TOP, children:
        ["Cooperativa/cliente decidir construir in-house","Mudança regulatória (CLT × PJ, LGPD)","Players internacionais entrarem no Brasil","Concentração: perder a âncora seria crítico"].map((t)=>new Paragraph({ numbering:{reference:"tb",level:0}, spacing:{after:30,line:240}, children:[new TextRun({text:t,font:FONT,size:18})]})) }),
    ]}),
  ]}),
];

// ---------------------------------------------------------------- 10. RISCOS
const s10 = [
  H1("10. Riscos e plano de mitigação"),
  table([3000, 1800, 4226], ["Risco", "Prob./Impacto", "Mitigação"], [
    ["Concentração na âncora", "Médio/Alto", "Usar o piloto para abrir 2–3 cooperativas no Ano 1; contrato plurianual com a âncora"],
    ["Titularidade do código (reconstrução)", "Médio/Alto", "Due diligence de IP: garantir cessão/propriedade limpa do código e dos dados antes da rodada"],
    ["Regulatório/trabalhista (PJ × CLT)", "Médio/Alto", "Jurídico especializado; posicionar como ferramenta de gestão da cooperativa, que detém o vínculo"],
    ["LGPD / dados sensíveis de saúde", "Médio/Alto", "Compliance desde o início; criptografia, RBAC, DPO terceirizado"],
    ["Meios de pagamento erodirem o take", "Médio/Médio", "Negociar split/escrow; opção “track-only” reduz COGS"],
    ["Execução com time pequeno", "Médio/Médio", "Contratações-chave logo na rodada; founder foca em produto + âncora"],
    ["Adoção pelos profissionais (oferta)", "Baixo/Médio", "IA via WhatsApp reduz fricção; âncora já tem relacionamento com cooperados"],
  ], { firstBold: true }),
];

// ---------------------------------------------------------------- 11. ROADMAP
const s11 = [
  H1("11. Roadmap e próximos passos (12–36 meses)"),
  H2("0–6 meses — Fundação & Âncora"),
  bullet("Fechar rodada pre-seed (com a cooperativa como investidora estratégica)."),
  bullet("Contratar Eng. sênior + CS/Ops. Blindar IP/LGPD."),
  bullet("Hardening: multi-tenancy + billing/split + IA em produção."),
  bullet("Piloto na âncora → métricas: tempo de preenchimento, % plantões descobertos, NPS do coordenador."),
  H2("6–18 meses — Densidade regional"),
  bullet("Expandir dentro da âncora; abrir 2–3 cooperativas do NE."),
  bullet("1º comercial; co-marketing do case."),
  bullet("Meta: MRR ~R$ 150 mil e GMV ~R$ 70 mi/ano (realista) → break-even ~mês 20–22."),
  H2("18–36 meses — Expansão de segmento"),
  bullet("Hospitais/redes privadas do NE; piloto no setor público (UPAs/UBS)."),
  bullet("Motor de inbound (conteúdo/SEO) e indicações."),
  bullet("Preparar rodada seed (com tração) para expansão nacional via sistema cooperativista."),
  bullet("Meta: receita líquida ~R$ 16,5 mi e EBITDA positivo (~20%)."),
  spacer(160),
  H2("Premissas críticas a validar no piloto"),
  num("Ticket médio do plantão e take-rate aceito pela cooperativa (🔹 R$ 1.300 / 7%)."),
  num("Volume real de plantões que migram para a plataforma."),
  num("Disposição da âncora a pagar SaaS e fee (modelo híbrido) — ou se concentra em um."),
  num("Custo efetivo de meios de pagamento (define operar o fluxo financeiro ou só “track-only”)."),
  num("Churn e expansão reais entre cooperativas."),
];

const children = [...cover, ...toc, ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9, ...s10, ...s11];

const doc = new Document({
  creator: "HealthMatch", title: "HealthMatch — Business Plan",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: ACCENT },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    { reference: "tb", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 300, hanging: 220 } } } }] },
    { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      tabStops: [{ type: "right", position: 9026 }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 } },
      children: [new TextRun({ text: "HealthMatch — Business Plan", font: FONT, size: 16, color: "888888" }),
                 new TextRun({ text: "\tConfidencial", font: FONT, size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Página ", font: FONT, size: 16, color: "888888" }),
                 new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "888888" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_Business_Plan.docx", buf);
  console.log("docx written", buf.length, "bytes");
});
