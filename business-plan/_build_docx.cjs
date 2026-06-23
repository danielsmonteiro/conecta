const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  TabStopType,
} = require("./node_modules/docx");

let TOCPAGES = {};
try { TOCPAGES = require("./_toc_pages.json"); } catch (e) { TOCPAGES = {}; }

const NAVY = "0B2D5B", BLUE = "0B74D1", LIGHT = "DCE6F1", GREY = "F2F2F2", ACCENT = "1F6FB2";
const INK = "1A2B45", GREEN = "1E7A34", AMBER = "B45309";
const FONT = "Arial";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };
const cellMargins = { top: 60, bottom: 60, left: 110, right: 110 };

function P(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, ...opts.run })];
  return new Paragraph({ children: runs, spacing: { after: opts.after ?? 120, line: 264 }, alignment: opts.align });
}
function lead(label, rest) {
  return new Paragraph({ spacing: { after: 120, line: 264 }, children: [
    new TextRun({ text: label, bold: true, font: FONT, size: 22, color: NAVY }),
    new TextRun({ text: rest, font: FONT, size: 22 }) ] });
}
function H1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(text)] }); }
function H2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function bullet(text) { return new Paragraph({ numbering: { reference: "b", level: 0 }, children: [new TextRun({ text })], spacing: { after: 60, line: 264 } }); }
function num(text) { return new Paragraph({ numbering: { reference: "n", level: 0 }, children: [new TextRun(text)], spacing: { after: 60, line: 264 } }); }
function spacer(after = 140) { return new Paragraph({ spacing: { after }, children: [] }); }
function note(text) {
  return new Paragraph({ spacing: { before: 80, after: 160, line: 252 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
    shading: { fill: "EEF4FA", type: ShadingType.CLEAR },
    children: [new TextRun({ text, italics: true, font: FONT, size: 18, color: "333333" })] });
}
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
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined, children: paras });
}
function table(widths, headerRow, dataRows, opts = {}) {
  const rows = [];
  if (headerRow) rows.push(new TableRow({ tableHeader: true, children: headerRow.map((h, i) =>
    cell(h, widths[i], { bold: true, color: "FFFFFF", fill: NAVY, align: AlignmentType.CENTER, size: opts.hsize ?? 18 })) }));
  dataRows.forEach((r, ri) => {
    rows.push(new TableRow({ children: r.map((c, i) => {
      const co = (typeof c === "object" && !Array.isArray(c)) ? c : { v: c };
      const zebra = ri % 2 === 1 ? GREY : undefined;
      return cell(co.v, widths[i], { bold: co.bold, fill: co.fill ?? (i === 0 && opts.firstBold ? LIGHT : zebra),
        bullets: co.bullets, color: co.color, align: co.align, size: co.size });
    }) }));
  });
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows, borders });
}
const headCell = (t, fill) => new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins,
  shading: { fill, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF", font: FONT, size: 20 })] })] });
const swotCol = (items) => new TableCell({ width: { size: 4513, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.TOP,
  children: items.map((t) => new Paragraph({ numbering: { reference: "tb", level: 0 }, spacing: { after: 30, line: 240 }, children: [new TextRun({ text: t, font: FONT, size: 18 })] })) });

// ---------------------------------------------------------------- COVER
const cover = [
  new Paragraph({ spacing: { before: 1700, after: 0 }, children: [new TextRun({ text: "HealthMatch", font: FONT, size: 72, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 6 } },
    children: [new TextRun({ text: "Business Plan", font: FONT, size: 40, color: BLUE })] }),
  P([new TextRun({ text: "Software estratégico de automação operacional para a Coaph — com opção de virar plataforma escalável", font: FONT, size: 24, color: "333333" })], { after: 560 }),
  table([3000, 6026], null, [
    [{ v: "Versão", bold: true, fill: LIGHT }, "Captação Pre-seed (revisão corporate venture)"],
    [{ v: "Data", bold: true, fill: LIGHT }, "Junho / 2026"],
    [{ v: "Estágio", bold: true, fill: LIGHT }, "Pré-lançamento — produto funcionalmente pronto"],
    [{ v: "Âncora", bold: true, fill: LIGHT }, "Coaph (Fortaleza / Ceará) — investidor-cliente âncora"],
    [{ v: "Tese", bold: true, fill: LIGHT }, "Defensiva (economia operacional da Coaph) + ofensiva (escala) — opcional"],
    [{ v: "Ask", bold: true, fill: LIGHT }, "R$ 1,5 milhão — trancheado por resultado"],
  ]),
  spacer(360),
  note("Documento confidencial. Empresa em pré-lançamento, sem receita realizada. As projeções de receita do HealthMatch (tese ofensiva) são premissas de mercado (🔹). A economia operacional da Coaph (tese defensiva) parte de um custo atual informado (~R$ 240 mil/mês) e de percentuais a validar no piloto. As duas lentes são separadas e não se somam."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------- TOC
const TOC_ITEMS = [
  "1. Sumário executivo",
  "2. A tese de investimento (defensiva + ofensiva)",
  "3. Business Case para a Coaph",
  "4. Descrição da plataforma",
  "5. Análise de mercado",
  "6. Público-alvo e personas",
  "7. Produto e funcionalidades",
  "8. Estratégia de marketing e vendas (Go-to-Market)",
  "9. Estrutura operacional e equipe",
  "10. Plano financeiro do HealthMatch (tese ofensiva)",
  "11. KPIs do piloto Coaph",
  "12. Análise SWOT",
  "13. Riscos e plano de mitigação",
  "14. Recomendação de investimento",
  "15. Roadmap e próximos passos",
];
function tocLine(text, i) {
  const pg = TOCPAGES["sec" + (i + 1)];
  return new Paragraph({ spacing: { after: 90, line: 264 }, tabStops: [{ type: TabStopType.RIGHT, position: 9026, leader: "dot" }],
    children: [ new TextRun({ text, font: FONT, size: 22, color: INK }), new TextRun({ text: "\t" + (pg ? String(pg) : ""), font: FONT, size: 22, color: NAVY, bold: true }) ] });
}
const toc = [
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Sumário", font: FONT, size: 32, bold: true, color: NAVY })] }),
  ...TOC_ITEMS.map((t, i) => tocLine(t, i)),
];

// ---------------------------------------------------------------- 1. SUMÁRIO EXECUTIVO
const s1 = [
  H1("1. Sumário executivo"),
  lead("HealthMatch é, antes de tudo, um software estratégico de automação operacional para a Coaph", " — que automatiza a gestão de plantões, escalas, contatos, confirmações e o back-office financeiro hoje feitos à mão. Em segundo plano, é uma plataforma com potencial de escalar para outras cooperativas, hospitais e o setor público."),
  lead("Hoje a Coaph gasta ~R$ 240 mil/mês (R$ 2,88 mi/ano) com prepostos", " dedicados à gestão manual de plantões. O HealthMatch ataca diretamente esse custo. É isso que sustenta o investimento — não a promessa de escala nacional."),
  H2("Duas teses, deliberadamente separadas"),
  table([1700, 3663, 3663], ["", "Tese defensiva (base da decisão)", "Tese ofensiva (upside opcional)"], [
    [{ v: "Lógica", bold: true }, "Reduzir o custo operacional da própria Coaph", "Virar plataforma para outras cooperativas, hospitais e setor público"],
    [{ v: "Métrica", bold: true }, "Economia mensal sobre os R$ 240 mil/mês", "Receita recorrente (SaaS) + take-rate (GMV)"],
    [{ v: "Quem ganha", bold: true }, "Coaph (como cliente)", "HealthMatch (como empresa) e investidores"],
    [{ v: "Papel", bold: true }, "Justifica o aporte sozinha", "Multiplica o retorno se acontecer"],
  ], { firstBold: true }),
  spacer(80),
  lead("O pior cenário aceitável: ", "o HealthMatch gerar, dentro da Coaph, economia operacional suficiente para pagar o investimento. A 50% de substituição (realista), a economia é de R$ 120 mil/mês → payback de R$ 1,5 mi em ~12,5 meses, sem depender de um único cliente externo."),
  spacer(40),
  table([2700, 6326], ["Item", "Resumo"], [
    ["Posicionamento", "Automação operacional para a Coaph (defensivo) + opção de plataforma escalável (ofensivo)"],
    ["Custo atacado (Coaph)", "~R$ 240 mil/mês · R$ 2,88 mi/ano com prepostos/operação manual"],
    ["Ask", "R$ 1,5 milhão, trancheado e condicionado a metas de adoção e economia"],
    ["Payback (defensivo, realista 50%)", "~12,5 meses só com a economia da Coaph"],
    ["Relação com a Coaph", "Investidor-cliente âncora (aporta capital e assina contrato como cliente)"],
    ["Status do produto", "Funcionalmente completo e testado internamente; pronto para o piloto"],
    ["Upside (ofensivo)", "Receita líquida Ano 3 ~R$ 16,5 mi (realista) se a escala externa acontecer"],
  ], { firstBold: true }),
  spacer(80),
  note("Enquadramento honesto: para um investidor financeiro puro, o HealthMatch ainda é cedo (pré-receita, fundador solo, sem tração externa). Para a Coaph, o investimento pode ser racional mesmo sem escala externa, porque existe uma economia operacional concreta e mensurável de até R$ 240 mil/mês sendo atacada. A escala externa é upside, não premissa."),
];

// ---------------------------------------------------------------- 2. TESE
const s2 = [
  H1("2. A tese de investimento (defensiva + ofensiva)"),
  lead("Tese defensiva — eficiência operacional da Coaph (a base). ", "A Coaph mantém prepostos que, manualmente, montam escalas, contatam profissionais, negociam plantões, confirmam presença e conciliam pagamentos — custo de ~R$ 240 mil/mês. O HealthMatch automatiza grande parte desse fluxo (matching + IA no WhatsApp + confirmações + financeiro). Mesmo que o produto nunca seja vendido a terceiros, ele se justifica se reduzir esse custo o suficiente para pagar o aporte. A defesa do investimento é uma conta de redução de custo, não de receita futura."),
  lead("Tese ofensiva — plataforma escalável (o upside). ", "A mesma plataforma pode ser oferecida a outras cooperativas, hospitais/redes privadas e ao setor público. Aí o HealthMatch vira uma empresa de SaaS + marketplace, com receita recorrente e take-rate sobre o GMV. Esse cenário transforma o aporte da Coaph em participação numa empresa de tecnologia — mas é opcional para a decisão."),
  lead("Regra de decisão: ", "a Coaph investe pela tese defensiva e trata a ofensiva como bônus. Se a escala não vier, o capital já terá sido justificado pela economia interna. Se vier, o retorno se multiplica."),
];

// ---------------------------------------------------------------- 3. BUSINESS CASE COAPH
const s3 = [
  H1("3. Business Case para a Coaph"),
  note("Premissas: custo atual R$ 240 mil/mês com prepostos; investimento R$ 1,5 mi. Esta análise é a economia da Coaph — não é receita do HealthMatch (ver §10) e as duas não se somam."),
  H2("Payback da economia operacional"),
  table([2126, 1700, 1300, 1300, 1300, 1300], ["Cenário", "Substituição", "Econ./mês", "Econ./ano", "Payback", "ROI anual"], [
    [{ v: "Conservador", bold: true }, "25%", "R$ 60 mil", "R$ 720 mil", "~25 m", "48%"],
    [{ v: "Realista", bold: true, fill: LIGHT }, { v: "50%", fill: LIGHT }, { v: "R$ 120 mil", fill: LIGHT, bold: true }, { v: "R$ 1,44 mi", fill: LIGHT }, { v: "~12,5 m", fill: LIGHT, bold: true }, { v: "96%", fill: LIGHT }],
    [{ v: "Otimista", bold: true }, "75%", "R$ 180 mil", "R$ 2,16 mi", "~8,3 m", "144%"],
    [{ v: "Teto teórico", color: "555555" }, { v: "100%", color: "555555" }, { v: "R$ 240 mil", color: "555555" }, { v: "R$ 2,88 mi", color: "555555" }, { v: "~6,3 m", color: "555555" }, { v: "192%", color: "555555" }],
  ], { firstBold: true, hsize: 17 }),
  spacer(60),
  bullet("25% é a base conservadora de defesa; 50% a realista; 75% a otimista."),
  bullet("100% não deve ser premissa — exigiria eliminar toda a operação manual e redesenhar processos, o que raramente ocorre."),
  bullet("Mesmo no conservador (25%), o investimento se paga em ~2 anos apenas com a economia interna, antes de qualquer real de receita externa."),
  spacer(40),
  lead("Condição para a economia se materializar: ", "automatizar tarefas não basta — é preciso redesenhar o processo (realocar/reduzir prepostos, eliminar retrabalho). Por isso o piloto tem metas de redução de horas/custo, não só de uso do sistema (ver §11 e §13)."),
];

// ---------------------------------------------------------------- 4. DESCRIÇÃO
const s4 = [
  H1("4. Descrição da plataforma"),
  lead("Missão: ", "garantir que toda unidade de saúde tenha o profissional certo no plantão certo — com agilidade, conformidade e custo justo."),
  lead("Visão: ", "ser a camada de inteligência operacional do trabalho em saúde no Brasil."),
  H2("Proposta de valor"),
  table([2300, 3363, 3363], ["Para quem", "Dor hoje", "O que o HealthMatch entrega"], [
    [{ v: "Coaph (âncora)", bold: true }, "~R$ 240 mil/mês em prepostos; escala manual; retrabalho", "Automação do fluxo de plantões → redução de custo operacional"],
    ["Outras cooperativas", "Mesmo problema, sem tecnologia", "Plataforma pronta, white-label"],
    ["Hospitais / redes privadas", "Plantões descobertos, credenciamento manual", "Banco de plantonistas, matching com checagem e conflito de agenda"],
    ["Setor público (SUS/UPAs)", "Cobertura difícil, controle de presença", "Escala com auditoria e rastreabilidade"],
    ["Profissionais de saúde", "Grupos informais, burocracia", "Ofertas compatíveis via WhatsApp, transparência"],
  ], { firstBold: true, hsize: 18 }),
  spacer(80),
  lead("Capacidades já existentes: ", "matching (especialidade, CBO, credencial, no-show, conflito de agenda); pipeline de vagas; candidaturas → alocações → escala com presença; mensageria omnichannel com agente de IA e handoff humano; financeiro de intermediação com margem; auditoria; RBAC; white-label."),
];

// ---------------------------------------------------------------- 5. MERCADO
const s5 = [
  H1("5. Análise de mercado"),
  note("A análise de mercado embasa a tese ofensiva (upside). A decisão de investimento da Coaph não depende dela."),
  P("O Brasil tem ~562 mil médicos ativos (CFM, 2024) e 2,5+ milhões de profissionais de saúde. O preenchimento de plantões é majoritariamente manual (WhatsApp, planilhas, agências, cooperativas com pouca tecnologia)."),
  H2("TAM / SAM / SOM (bottom-up)"),
  note("🔹 GMV de plantões = nº de plantões/ano × ticket médio (R$ 1.300). Receita endereçável ≈ 10% do GMV."),
  table([1500, 3526, 2000, 2000], ["Camada", "Definição", "GMV/ano", "Receita endereçável (≈10%)"], [
    ["TAM", "GMV de plantões/escalas de saúde no Brasil", "🔹 R$ 15–20 bi", "🔹 R$ 1,5–2,0 bi"],
    ["SAM", "Nordeste + cooperativas/hospitais/público", "🔹 R$ 3–4 bi", "🔹 R$ 300–450 mi"],
    ["SOM (3–5 anos)", "CE + cooperativas adjacentes do NE", "🔹 R$ 150–300 mi", "🔹 R$ 15–30 mi"],
  ], { firstBold: true }),
  spacer(80),
  lead("Concorrência: ", "o concorrente nº 1 é o processo manual (WhatsApp + planilhas + prepostos) — exatamente o que a tese defensiva ataca. Software hospitalar (Tasy/MV) e gestão de clínicas (iClinic/Feegow) não fazem matching+IA+marketplace de plantão. Comps internacionais (Nomad, Trusted, Medely, Patchwork) validam o modelo, mas não operam no Brasil."),
];

// ---------------------------------------------------------------- 6. PÚBLICO
const s6 = [
  H1("6. Público-alvo e personas"),
  lead("ICP de entrada: ", "a Coaph, como design partner, investidor e primeiro cliente. Expansão (upside): outras cooperativas do NE → hospitais/redes privadas → setor público."),
  H2("Personas"),
  num("Diretoria da Coaph (decisor econômico): quer reduzir o custo de R$ 240 mil/mês e ganhar controle/conformidade."),
  num("Coordenador(a) de escala (usuário-chave): vive apagando incêndio de plantão descoberto."),
  num("Preposto/operador (parte impactada): tarefas automatizadas — exige gestão de mudança (ver §13)."),
  num("Médico/profissional cooperado (oferta): quer ofertas relevantes via WhatsApp, sem burocracia."),
];

// ---------------------------------------------------------------- 7. PRODUTO
const s7 = [
  H1("7. Produto e funcionalidades"),
  lead("Stack técnica: ", "NestJS + Prisma + PostgreSQL; Next.js + Tailwind; IA via Anthropic (Haiku); mensageria Twilio/WhatsApp/Meta/Zenvia; Docker. ~20 módulos, API REST padronizada."),
  H2("Módulos funcionais (testados — 32/32 testes de API, 14/14 regras de negócio)"),
  table([2700, 6326], ["Módulo", "O que faz"], [
    ["Matching", "Pontua profissional × vaga, detecta conflito de agenda e elegibilidade"],
    ["Vagas & Contratos", "Pipeline de plantão (avulso, recorrente, cobertura, pool)"],
    ["Candidaturas → Alocações → Escala", "Aprovação gera alocação; controle de presença/no-show"],
    ["IA conversacional", "Aborda e negocia plantões via WhatsApp; handoff humano em ações críticas"],
    ["Financeiro", "Recebíveis, pagáveis, taxa de plataforma e margem"],
    ["Credenciamento", "Conselhos, CBO, RQE, documentos com validade"],
    ["Auditoria & RBAC", "Trilha de mutações; perfis de acesso"],
    ["White-label", "Branding por cliente"],
  ], { firstBold: true }),
  spacer(80),
  lead("Maturidade: ", "MVP construído e testado internamente, pronto para o piloto. Lacunas para escala (roadmap): multi-tenancy robusto, billing/split automatizado, observabilidade, testes de carga, ativação plena da IA."),
];

// ---------------------------------------------------------------- 8. GTM
const s8 = [
  H1("8. Estratégia de marketing e vendas (Go-to-Market)"),
  lead("Fase 0 — Coaph (mês 0–6): ", "implantar na Coaph como cliente-âncora; piloto com metas de redução de custo operacional (não só de uso). O case vira a principal peça de venda."),
  lead("Fase 1 — Densidade regional (mês 6–18): ", "outras cooperativas de saúde do NE, via indicação da âncora e eventos do setor cooperativista."),
  lead("Fase 2 — Novos segmentos (mês 18–36): ", "hospitais/redes privadas do NE; piloto no setor público."),
  spacer(40),
  lead("Sobre a base de 55 mil cooperados: ", "é uma vantagem de oferta uma vez operacionalizada — não liquidez automática. A adoção pelos profissionais e o redesenho do processo são pré-condições."),
];

// ---------------------------------------------------------------- 9. OPERAÇÃO
const s9 = [
  H1("9. Estrutura operacional e equipe"),
  P("Hoje: fundador solo (bootstrap), produto construído. A rodada (trancheada) financia o time mínimo:"),
  table([2100, 3463, 3463], ["Fase", "Contratações", "Racional"], [
    ["Imediato (mês 0–3)", "1 Eng. sênior · 1 CS/Ops", "Hardening + implantação na Coaph"],
    ["Mês 3–9", "+1 Eng. · 1 Comercial", "Sustentar a Coaph e abrir cooperativas"],
    ["Mês 9–18", "+1 Eng./Dados · +1 CS", "Escala de IA/matching"],
    ["Contínuo (PJ)", "Design, Contábil, Jurídico/LGPD", "Custo variável"],
  ], { firstBold: true }),
];

// ---------------------------------------------------------------- 10. FINANCEIRO (ofensiva)
const s10 = [
  H1("10. Plano financeiro do HealthMatch (tese ofensiva)"),
  note("⚠️ Esta seção é o cenário de upside (HealthMatch como empresa). A defesa do investimento pela Coaph não depende destes números — ela se sustenta no §3. Não somar a economia da Coaph (§3) à receita aqui."),
  P("🔹 Premissas: ticket/plantão R$ 1.300; take-rate 5/7/8%; ARPA SaaS ~R$ 4.000/mês; margem bruta blended ~68%."),
  H2("Receita líquida — 3 cenários (SaaS + take-rate)"),
  table([3026, 2000, 2000, 2000], ["Cenário", "Ano 1", "Ano 2", "Ano 3"], [
    ["Conservador", "R$ 0,43 mi", "R$ 2,26 mi", "R$ 6,38 mi"],
    [{ v: "Realista", bold: true }, { v: "R$ 1,09 mi", bold: true }, { v: "R$ 5,99 mi", bold: true }, { v: "R$ 16,5 mi", bold: true }],
    ["Otimista", "R$ 1,98 mi", "R$ 11,9 mi", "R$ 33,3 mi"],
  ], { firstBold: true }),
  H2("DRE resumida (realista, R$ mil)"),
  table([3026, 2000, 2000, 2000], ["Linha", "Ano 1", "Ano 2", "Ano 3"], [
    ["Receita líquida", "1.090", "5.990", "16.500"],
    [{ v: "Lucro bruto (~68%)", bold: true }, { v: "740", bold: true }, { v: "4.073", bold: true }, { v: "11.220", bold: true }],
    ["Opex total", "(1.490)", "(3.600)", "(8.000)"],
    [{ v: "EBITDA", bold: true, fill: LIGHT }, { v: "(750)", bold: true, fill: LIGHT }, { v: "+473", bold: true, fill: LIGHT }, { v: "+3.220", bold: true, fill: LIGHT }],
  ], { firstBold: true }),
  spacer(60),
  lead("Métricas SaaS (visão SaaS-only, conservadora): ", "ARPA R$ 4.000/mês · CAC R$ 15.000 · churn 12%/ano · LTV/CAC ~7,7× · payback de CAC ~4,7 meses. Break-even ofensivo ~mês 20–22."),
  note("Comparação das duas lentes: a tese defensiva (§3) entrega payback em ~12,5 meses (realista) com um único cliente. A tese ofensiva precisa de tração externa para entregar os R$ 16,5 mi de receita no Ano 3. A primeira é a âncora da decisão; a segunda é o prêmio."),
];

// ---------------------------------------------------------------- 11. KPIs
const s11 = [
  H1("11. KPIs do piloto Coaph"),
  P("O piloto é desenhado para provar a economia operacional, não apenas o uso do software. Métricas medidas antes (baseline) e depois:"),
  table([3000, 3526, 2500], ["KPI", "Como medir", "Meta no piloto"], [
    ["Custo mensal com prepostos", "Folha + encargos da operação manual", "↓ –25% a –50%"],
    ["Horas manuais eliminadas/mês", "Time-tracking da equipe operacional", "↓ progressiva"],
    ["% de plantões preenchidos sem intervenção humana", "Logs da plataforma", "↑ a cada ciclo"],
    ["Tempo médio de preenchimento de plantão", "Abertura → confirmação", "↓ de horas p/ minutos"],
    ["Taxa de aceite via WhatsApp/IA", "Aceites IA ÷ ofertas", "Baseline + crescer"],
    ["% de confirmações automatizadas", "Confirmações sem operador", "↑"],
    ["Redução de retrabalho operacional", "Reaberturas/correções de escala", "↓"],
    ["Redução de erros de escala", "Conflitos/no-shows não detectados", "↓"],
    ["Profissionais ativados", "Cadastros ativos", "Crescimento"],
    ["Plantões processados", "Volume pela plataforma", "Crescimento"],
    ["NPS dos coordenadores", "Pesquisa periódica", "≥ alvo acordado"],
    [{ v: "Economia operacional mensal", bold: true }, { v: "Estimada × realizada", bold: true }, { v: "Gatilho das tranches", bold: true }],
  ], { firstBold: true, hsize: 17 }),
];

// ---------------------------------------------------------------- 12. SWOT
const s12 = [
  H1("12. Análise SWOT"),
  new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [4513, 4513], borders, rows: [
    new TableRow({ children: [headCell("Forças", GREEN), headCell("Fraquezas", AMBER)] }),
    new TableRow({ children: [
      swotCol(["Tese defensiva ataca custo concreto (R$ 240 mil/mês)", "Produto construído e testado, pronto para piloto", "Coaph como investidor-cliente âncora alinhado", "IA + matching + financeiro num só lugar", "Acesso à base de 55k cooperados (via Coaph)"]),
      swotCol(["Fundador solo; sem time formado", "Sem receita/tração externa ainda", "Forte dependência da Coaph", "Economia só se realiza com redesenho de processo", "Multi-tenancy/billing ainda a construir"]),
    ]}),
    new TableRow({ children: [headCell("Oportunidades", ACCENT), headCell("Ameaças", "9B1C1C")] }),
    new TableRow({ children: [
      swotCol(["Replicar o case para outras cooperativas", "Expansão para hospitais e setor público", "Sistema cooperativista nacional como esteira", "IA reduz custo operacional drasticamente"]),
      swotCol(["Coaph optar por construir/contratar in-house", "Resistência interna de prepostos/coordenadores", "Economia não se materializar no % esperado", "Mudança regulatória (CLT × PJ, LGPD)"]),
    ]}),
  ]}),
];

// ---------------------------------------------------------------- 13. RISCOS
const s13 = [
  H1("13. Riscos e plano de mitigação"),
  table([3200, 1500, 4326], ["Risco", "Prob./Imp.", "Mitigação"], [
    [{ v: "Virar software customizado p/ a Coaph, não startup escalável", bold: true }, "Médio/Alto", "Arquitetura multi-tenant desde o início; contrato separa licença de investimento; roadmap de produto, não de consultoria"],
    [{ v: "Dependência excessiva da Coaph", bold: true }, "Alto/Alto", "Abrir 1–2 cooperativas no Ano 1; contrato plurianual; investimento trancheado dilui o risco no tempo"],
    [{ v: "Economia não se materializar no % esperado", bold: true }, "Médio/Alto", "Base conservadora de 25%; piloto com baseline e metas; tranches liberadas só contra economia comprovada"],
    [{ v: "Resistência interna (prepostos, coordenadores)", bold: true }, "Médio/Alto", "Gestão de mudança; envolver coordenadores como co-desenhadores; comunicar realocação, não só corte"],
    [{ v: "Automação parcial exigir manter equipe humana", bold: true }, "Médio/Médio", "Implantação por fases; medir horas eliminadas, não uso; metas realistas (25–50%, não 100%)"],
    [{ v: "Substituir tarefas sem reduzir custo real", bold: true }, "Médio/Alto", "Redesenho operacional explícito no escopo; KPI = economia realizada, não teórica"],
    ["Regulatório/trabalhista (PJ × CLT)", "Médio/Alto", "Jurídico especializado; plataforma de gestão da cooperativa, que detém o vínculo"],
    ["LGPD / dados sensíveis de saúde", "Médio/Alto", "Compliance desde o início; criptografia, RBAC, DPO"],
    ["Execução com time pequeno", "Médio/Médio", "Contratações-chave na Tranche 1; founder foca em produto + Coaph"],
  ], { firstBold: true, hsize: 17 }),
  spacer(80),
  lead("Princípios de mitigação: ", "piloto com metas objetivas · implantação por fases · KPIs de redução de horas manuais · contrato comercial separado do investimento · tranches condicionadas à economia gerada · comitê mensal Coaph + HealthMatch para acompanhar o ROI."),
];

// ---------------------------------------------------------------- 14. RECOMENDAÇÃO
const s14 = [
  H1("14. Recomendação de investimento"),
  P([new TextRun({ text: "A Coaph deve investir somente se TODAS as condições abaixo forem atendidas:", bold: true, font: FONT, size: 22, color: NAVY })]),
  num("Assinar contrato como cliente-âncora (licença/serviço), separado do instrumento de investimento."),
  num("O investimento for trancheado (não desembolso único)."),
  num("A liberação de cada tranche estiver vinculada a metas reais de adoção e economia operacional."),
  num("Existirem métricas de sucesso claras (os KPIs do §11) e um comitê mensal de acompanhamento."),
  H2("Estrutura de tranches sugerida (total R$ 1,5 mi)"),
  table([1700, 1600, 3026, 2700], ["Tranche", "Valor", "Gatilho de liberação", "Uso"], [
    [{ v: "Tranche 1", bold: true }, "R$ 300–500 mil", "Assinatura do contrato + início", "Piloto, implantação, hardening, LGPD, integrações"],
    [{ v: "Tranche 2", bold: true }, "~R$ 500 mil", "Economia comprovada ≥ R$ 50 mil/mês", "Expansão de uso na Coaph; 1as contratações"],
    [{ v: "Tranche 3", bold: true }, "~R$ 600 mil", "Economia ≥ R$ 100 mil/mês (ou volume equivalente)", "Escala interna + preparo da expansão externa"],
  ], { firstBold: true, hsize: 17 }),
  spacer(80),
  lead("Por que assim: ", "o trancheamento converte uma aposta de R$ 1,5 mi num investimento escalonado pelo resultado — a Coaph só compromete capital adicional após ver a economia real. Alinha incentivos, reduz o risco de software de gaveta e mantém o foco em valor mensurável."),
];

// ---------------------------------------------------------------- 15. ROADMAP
const s15 = [
  H1("15. Roadmap e próximos passos"),
  H2("0–6 meses — Implantação na Coaph (Tranche 1)"),
  bullet("Assinar contrato (cliente) + instrumento de investimento (tranches)."),
  bullet("Hardening (multi-tenancy, billing, LGPD) + integrações."),
  bullet("Piloto com baseline e metas de economia; comitê mensal de ROI."),
  H2("6–18 meses — Provar economia e abrir o 2º cliente (Tranches 2–3)"),
  bullet("Atingir ≥ R$ 50 mil/mês e depois ≥ R$ 100 mil/mês de economia."),
  bullet("Abrir 1–2 cooperativas do NE com o case da Coaph."),
  H2("18–36 meses — Escala (tese ofensiva)"),
  bullet("Hospitais/redes privadas; piloto no setor público."),
  bullet("Preparar rodada seed com tração real."),
  spacer(120),
  note("Resumo da decisão: a Coaph investe pela economia operacional (defensiva); a escala externa é upside. Mesmo no cenário conservador (25%), o capital se paga em ~2 anos só com a economia interna."),
];

const children = [...cover, ...toc, ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9, ...s10, ...s11, ...s12, ...s13, ...s14, ...s15];

const doc = new Document({
  creator: "HealthMatch", title: "HealthMatch — Business Plan",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: ACCENT },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    { reference: "tb", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } } } }] },
    { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
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
