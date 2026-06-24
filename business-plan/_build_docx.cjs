const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, TabStopType,
} = require("./node_modules/docx");

let TOCPAGES = {};
try { TOCPAGES = require("./_toc_pages.json"); } catch (e) { TOCPAGES = {}; }

const NAVY = "0B2D5B", BLUE = "0B74D1", LIGHT = "DCE6F1", GREY = "F2F2F2", ACCENT = "1F6FB2";
const INK = "1A2B45", GREEN = "1E7A34", AMBER = "B45309", REDF = "FCE4E4";
const FONT = "Arial";
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const cellMargins = { top: 60, bottom: 60, left: 110, right: 110 };

function P(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, ...opts.run })];
  return new Paragraph({ children: runs, spacing: { after: opts.after ?? 120, line: 264 } });
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
    paras = content.map((t) => new Paragraph({ numbering: opts.bullets ? { reference: "tb", level: 0 } : undefined,
      spacing: { after: 30, line: 240 }, children: [new TextRun({ text: t, font: FONT, size: opts.size ?? 18, color: opts.color, bold: opts.bold })] }));
  } else {
    paras = [new Paragraph({ alignment: opts.align, spacing: { after: 0, line: 240 },
      children: [new TextRun({ text: content, font: FONT, size: opts.size ?? 18, color: opts.color, bold: opts.bold })] })];
  }
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
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
      return cell(co.v, widths[i], { bold: co.bold, fill: co.fill ?? (i === 0 && opts.firstBold ? LIGHT : zebra), color: co.color, align: co.align, size: co.size });
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
  P([new TextRun({ text: "Camada de contingência para escalas de saúde — começando pela Coaph", font: FONT, size: 24, color: "333333" })], { after: 560 }),
  table([3000, 6026], null, [
    [{ v: "Versão", bold: true, fill: LIGHT }, "Piloto + Pre-seed (revisão pós-reunião Coaph)"],
    [{ v: "Data", bold: true, fill: LIGHT }, "Junho / 2026"],
    [{ v: "Estágio", bold: true, fill: LIGHT }, "Pré-lançamento — produto funcionalmente pronto"],
    [{ v: "Âncora", bold: true, fill: LIGHT }, "Coaph (Fortaleza / CE) — cliente-âncora + financiador do piloto"],
    [{ v: "Produto", bold: true, fill: LIGHT }, "Gap-filling: cobre a exceção (descobertas/no-shows), não toda a escala"],
    [{ v: "Ask atual", bold: true, fill: LIGHT }, "Piloto de R$ 300 mil (rodada plena de R$ 1,5 mi depois do piloto)"],
  ]),
  spacer(360),
  note("Documento confidencial. Empresa em pré-lançamento, sem receita realizada. A economia parte de números informados pela Coaph (prepostos ~R$ 240 mil/mês; plantão médico 12h = R$ 1.200) e de premissas conservadoras e editáveis sobre o gap (🔹). Sobrepreço emergencial e penalidade são as premissas de maior peso — o piloto existe para validá-las."),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------- TOC
const TOC_ITEMS = [
  "1. Sumário executivo",
  "2. O problema: o gap, não a escala inteira",
  "3. A solução: uma camada de contingência",
  "4. A tese de investimento (defensiva + ofensiva)",
  "5. Business Case para a Coaph",
  "6. Modelo de receita",
  "7. Mercado (upside da escala)",
  "8. Estratégia de Go-to-Market",
  "9. Estrutura operacional e equipe",
  "10. Plano financeiro do HealthMatch (escala)",
  "11. KPIs do piloto Coaph",
  "12. Análise SWOT",
  "13. Riscos e plano de mitigação",
  "14. Recomendação de investimento",
  "15. Roadmap",
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

// ---------------------------------------------------------------- 1
const s1 = [
  H1("1. Sumário executivo"),
  lead("O HealthMatch é uma camada de contingência para escalas de saúde.", " Ele não gerencia toda a escala da cooperativa — resolve o gap: o plantão que não fecha, o no-show, a exceção de última hora. Usar a plataforma é a exceção, não a regra. É onde se concentram o maior custo, risco e dor."),
  lead("O cliente-âncora é a Coaph,", " que hoje sustenta uma operação manual de prepostos (~R$ 240 mil/mês) e arca com o custo do gap: telefonemas, sobrepreço de cobertura emergencial e penalidade/risco quando o plantão fica descoberto."),
  H2("Duas teses, separadas e honestas"),
  table([1700, 3663, 3663], ["", "Tese defensiva", "Tese ofensiva"], [
    [{ v: "Lógica", bold: true }, "Reduzir o custo do gap dentro da Coaph", "Escalar a contingência para outras cooperativas/hospitais"],
    [{ v: "Métrica", bold: true }, "Economia operacional mensal", "Receita recorrente (SaaS de prontidão + fee)"],
    [{ v: "Papel", bold: true }, "Justifica o PILOTO", "Justifica a rodada plena (futura)"],
  ], { firstBold: true }),
  spacer(80),
  H2("O que muda nesta revisão (após a reunião com a Coaph)"),
  bullet("Cobre o gap, não a escala inteira → volume menor, foco maior."),
  bullet("Margem da cooperativa < 5% → monetização híbrida: SaaS de prontidão + fee por gap capado em ≤ 2%. Take-rate gordo sobre GMV foi descartado."),
  bullet("Investimento redimensionado: o ask agora é um piloto de R$ 300 mil (payback ~2,6 meses, realista) que prova as premissas antes de qualquer rodada maior."),
  spacer(60),
  table([3200, 5826], ["Item", "Resumo"], [
    ["Produto", "Camada de contingência (gap-filling) com matching + IA no WhatsApp + financeiro"],
    ["Cliente-âncora", "Coaph — assina como cliente (ROI positivo desde o 1º mês)"],
    ["Monetização", "SaaS de prontidão (R$ 8 mil/mês) + fee por gap (≤ 2% do plantão)"],
    ["Ask atual", "Piloto de R$ 300 mil (payback ~2,6 meses)"],
    ["Economia líquida (Coaph, realista)", "~R$ 114,7 mil/mês"],
    ["Rodada plena", "R$ 1,5 mi depois do piloto, justificada pela escala (ofensiva)"],
  ], { firstBold: true }),
  spacer(80),
  note("Enquadramento honesto: como projeto de eficiência puro, a economia de prepostos sozinha não pagaria R$ 1,5 mi rápido (~40 meses). Por isso a decisão se divide: a Coaph assina como cliente (ganha já) e financia um piloto enxuto que valida o custo real do gap; a rodada de equity maior fica para depois, decidida com dados."),
];

// ---------------------------------------------------------------- 2
const s2 = [
  H1("2. O problema: o gap, não a escala inteira"),
  P("A maior parte dos plantões a cooperativa preenche pelo seu processo regular. O problema caro é a exceção:"),
  bullet("Plantão que não fecha → penalidade contratual + risco assistencial."),
  bullet("No-show → cobertura emergencial de última hora, quase sempre com sobrepreço."),
  bullet("Horas de preposto desproporcionais gastas nessas exceções (o 20% de casos que consome 80% do esforço)."),
  spacer(40),
  note("🔹 Na Coaph, estima-se que ~35% do custo de prepostos (R$ 240 mil/mês) esteja ligado a gaps/exceções, além do sobrepreço e das penalidades — valores que o piloto vai medir."),
];

// ---------------------------------------------------------------- 3
const s3 = [
  H1("3. A solução: uma camada de contingência"),
  P("O HealthMatch entra só quando o processo normal falha. Mantém um pool de contingência pronto e usa:"),
  bullet("Matching: cruza especialidade, CBO, credencial, no-show e conflito de agenda — e acha rápido quem pode cobrir."),
  bullet("IA no WhatsApp: aborda, negocia e confirma a cobertura 24/7, com handoff humano em ações críticas."),
  bullet("Financeiro: registra a cobertura e a margem com auditoria."),
  spacer(40),
  lead("Resultado: ", "o gap é coberto em minutos, de um pool pronto, sem o sobrepreço da urgência e sem horas de telefonema — reduzindo penalidade e risco."),
  lead("Produto: ", "funcionalmente completo e testado internamente (32/32 testes de API, 14/14 regras de negócio). Stack: NestJS + Prisma + PostgreSQL; Next.js; IA Anthropic; Twilio/WhatsApp; Docker. Lacunas para escala (roadmap): multi-tenancy, billing/split, observabilidade, ativação plena da IA."),
];

// ---------------------------------------------------------------- 4
const s4 = [
  H1("4. A tese de investimento (defensiva + ofensiva)"),
  lead("Defensiva (justifica o piloto): ", "reduzir o custo do gap na Coaph — tempo de preposto nas exceções + sobrepreço emergencial + penalidade por plantão descoberto. Mensurável e atacável já."),
  lead("Ofensiva (justifica a rodada plena, depois): ", "a mesma camada de contingência replicada para outras cooperativas e hospitais. É um SaaS de contingência — modesto e previsível (~R$ 226 mil/ano por cliente), não um marketplace de take-rate gordo."),
  lead("Regra de decisão: ", "a Coaph assina como cliente (ganha mensalmente) e financia o piloto (R$ 300 mil, payback ~2,6 meses). A rodada de equity de R$ 1,5 mi só entra depois que o piloto comprovar a economia — justificada pela escala, não pela operação interna."),
];

// ---------------------------------------------------------------- 5
const s5 = [
  H1("5. Business Case para a Coaph"),
  note("Premissas (realista, 🔹 a validar): gap ~600/mês; ticket ponderado R$ 900 (médico R$ 1.200, demais classes menores); 35% dos gaps com sobrepreço (R$ 250/plantão); 6% ficariam descobertos (penalidade R$ 1.200)."),
  H2("Economia mensal da Coaph (3 camadas)"),
  table([3326, 1900, 1900, 1900], ["Camada de economia", "Conservador", "Realista", "Otimista"], [
    ["1) Tempo de preposto no gap", "R$ 25,2 mil", "R$ 37,8 mil", "R$ 50,4 mil"],
    ["2) Sobrepreço emergencial evitado", "R$ 35,0 mil", "R$ 52,5 mil", "R$ 87,5 mil"],
    ["3) Penalidade evitada", "R$ 28,8 mil", "R$ 43,2 mil", "R$ 72,0 mil"],
    [{ v: "Economia bruta/mês", bold: true }, { v: "R$ 89,0 mil", bold: true }, { v: "R$ 133,5 mil", bold: true }, { v: "R$ 209,9 mil", bold: true }],
    ["(–) Custo pago ao HealthMatch", "(R$ 15,2 mil)", "(R$ 18,8 mil)", "(R$ 26,0 mil)"],
    [{ v: "Economia líquida/mês", bold: true, fill: LIGHT }, { v: "R$ 73,8 mil", bold: true, fill: LIGHT }, { v: "R$ 114,7 mil", bold: true, fill: LIGHT }, { v: "R$ 183,9 mil", bold: true, fill: LIGHT }],
  ], { firstBold: true, hsize: 17 }),
  H2("Payback do investimento"),
  table([3326, 1900, 1900, 1900], ["Investimento", "Conservador", "Realista", "Otimista"], [
    [{ v: "Piloto (R$ 300 mil) — ask atual", bold: true }, { v: "~4,1 meses", fill: LIGHT }, { v: "~2,6 meses", bold: true, fill: LIGHT }, { v: "~1,6 meses", fill: LIGHT }],
    ["Rodada plena (R$ 1,5 mi) — futura", "~20 meses", "~13 meses", "~8 meses"],
    [{ v: "Floor honesto: só prepostos paga R$ 1,5 mi", color: "B00020" }, { v: "~60 m", color: "B00020" }, { v: "~40 m", color: "B00020" }, { v: "~30 m", color: "B00020" }],
  ], { firstBold: true, hsize: 17 }),
  spacer(60),
  bullet("A economia depende sobretudo das camadas 2 e 3 (sobrepreço e penalidade) — as premissas mais incertas, que o piloto valida."),
  bullet("Mesmo no conservador, o piloto se paga em ~4 meses."),
  bullet("Como cliente, a Coaph é líquida-positiva todo mês (paga R$ 18,8 mil, economiza R$ 133,5 mil brutos) — assinar é um no-brainer operacional."),
];

// ---------------------------------------------------------------- 6
const s6 = [
  H1("6. Modelo de receita"),
  P("Dada a margem da cooperativa < 5%, a receita do HealthMatch é híbrida e desacoplada do GMV:"),
  lead("SaaS de prontidão: ", "mensalidade fixa pelo acesso ao pool de contingência (Coaph: 🔹 R$ 8 mil/mês). Previsível, não depende da margem fina."),
  lead("Fee por gap preenchido: ", "pequena taxa por cobertura, capada em ≤ 2% do plantão (≈ R$ 24 num plantão médico de R$ 1.200). Alinha receita ao valor entregue."),
  P("Receita do HealthMatch vinda da Coaph: ~R$ 18,8 mil/mês (R$ 226 mil/ano) no realista. O take-rate gordo sobre GMV não se aplica neste mercado."),
];

// ---------------------------------------------------------------- 7
const s7 = [
  H1("7. Mercado (upside da escala — tese ofensiva)"),
  note("Embasa a rodada plena (futura). A decisão do piloto não depende disto."),
  P("~562 mil médicos ativos (CFM, 2024); milhares de cooperativas e unidades. O gap (descobertas + no-shows) é universal e hoje resolvido na base do telefonema. Comps internacionais de staffing/contingência de saúde (Nomad, Trusted, Medely, ShiftMed; Patchwork no Reino Unido) validam a categoria. O concorrente nº 1 segue sendo o processo manual."),
];

// ---------------------------------------------------------------- 8
const s8 = [
  H1("8. Estratégia de Go-to-Market"),
  lead("Fase 0 — Piloto Coaph (mês 0–6): ", "implantar a contingência em 1–2 unidades/especialidades; medir baseline e economia real do gap."),
  lead("Fase 1 — Coaph plena + 2ª cooperativa (mês 6–18): ", "expandir o uso e abrir a primeira cooperativa adjacente com o case."),
  lead("Fase 2 — Escala regional (mês 18–36): ", "mais cooperativas e hospitais do NE."),
  P("Canal principal: indicação da Coaph e da rede cooperativista. A base de cooperados é vantagem de oferta uma vez operacionalizada — não liquidez automática."),
];

// ---------------------------------------------------------------- 9
const s9 = [
  H1("9. Estrutura operacional e equipe"),
  P("Fundador solo (bootstrap), produto construído. O piloto (R$ 300 mil) financia: 1 engenheiro para hardening/integrações/LGPD, implantação na Coaph e a instrumentação dos KPIs (~6 meses). Contratações maiores (comercial/CS) ficam para a rodada plena."),
];

// ---------------------------------------------------------------- 10
const s10 = [
  H1("10. Plano financeiro do HealthMatch (escala — ofensiva)"),
  note("Cenário de upside (HealthMatch como empresa). Modesto e previsível — coerente com a margem fina. Não é a base da decisão do piloto."),
  table([3326, 1900, 1900, 1900], ["Receita HM (escala)", "Ano 1", "Ano 2", "Ano 3"], [
    ["Cooperativas/clientes ativos (média)", "1", "5", "15"],
    ["Receita/cliente/ano (realista)", "R$ 226 mil", "R$ 226 mil", "R$ 226 mil"],
    [{ v: "Receita HM total/ano", bold: true }, { v: "R$ 226 mil", bold: true }, { v: "R$ 1,13 mi", bold: true }, { v: "R$ 3,38 mi", bold: true }],
  ], { firstBold: true }),
  spacer(60),
  P("É um SaaS de nicho saudável, não um foguete de marketplace. A rodada plena de R$ 1,5 mi deve ser dimensionada a este plano — e só faz sentido após o piloto validar a economia e a adoção."),
];

// ---------------------------------------------------------------- 11
const s11 = [
  H1("11. KPIs do piloto Coaph"),
  P("O piloto mede a economia real do gap (não só o uso). Baseline antes; medição depois:"),
  table([5500, 3526], ["KPI", "Meta no piloto"], [
    ["Custo de cobertura emergencial (sobrepreço)", "↓ — validar a camada 2"],
    ["Nº de plantões descobertos / penalidades", "↓ — validar a camada 3"],
    ["Horas de preposto nas exceções", "↓ — validar a camada 1"],
    ["Tempo médio de cobertura do gap", "de horas para minutos"],
    ["% de gaps cobertos sem intervenção humana", "↑ a cada ciclo"],
    ["Taxa de aceite via WhatsApp/IA", "estabelecer e crescer"],
    ["Nº de gaps processados e profissionais ativados", "crescimento"],
    ["NPS dos coordenadores", "≥ alvo acordado"],
    [{ v: "Economia operacional mensal (estimada × realizada)", bold: true }, { v: "gatilho da rodada plena", bold: true }],
  ], { firstBold: true, hsize: 17 }),
];

// ---------------------------------------------------------------- 12
const s12 = [
  H1("12. Análise SWOT"),
  new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [4513, 4513], borders, rows: [
    new TableRow({ children: [headCell("Forças", GREEN), headCell("Fraquezas", AMBER)] }),
    new TableRow({ children: [
      swotCol(["Ataca o ponto de maior dor/custo (o gap)", "Produto construído e testado", "Coaph como cliente-âncora alinhado", "Piloto barato com payback rápido"]),
      swotCol(["Economia depende de premissas a validar (sobrepreço/penalidade)", "Fundador solo; sem tração externa", "Dependência inicial da Coaph", "Receita por cliente modesta (margem fina)"]),
    ]}),
    new TableRow({ children: [headCell("Oportunidades", ACCENT), headCell("Ameaças", "9B1C1C")] }),
    new TableRow({ children: [
      swotCol(["Replicar contingência para outras cooperativas", "Hospitais e setor público", "Categoria validada lá fora"]),
      swotCol(["Coaph optar por resolver in-house", "Margem fina limitar disposição a pagar", "Economia do gap não se confirmar no piloto"]),
    ]}),
  ]}),
];

// ---------------------------------------------------------------- 13
const s13 = [
  H1("13. Riscos e plano de mitigação"),
  table([3200, 1500, 4326], ["Risco", "Prob./Imp.", "Mitigação"], [
    [{ v: "Economia do gap não se materializar", bold: true }, "Médio/Alto", "Piloto barato (R$ 300k) existe para validar antes de qualquer cheque maior; premissas conservadoras e editáveis"],
    [{ v: "Virar software sob medida, não produto", bold: true }, "Médio/Alto", "Multi-tenant desde já; contrato de cliente separado do investimento"],
    [{ v: "Dependência excessiva da Coaph", bold: true }, "Médio/Alto", "Abrir 2ª cooperativa após o piloto; dados/portabilidade garantidos"],
    [{ v: "Margem fina limitar o que pagam", bold: true }, "Médio/Médio", "SaaS de prontidão desacoplado do GMV; fee capado e indolor"],
    [{ v: "Resistência interna (prepostos)", bold: true }, "Médio/Médio", "Gestão de mudança; posicionar como apoio à exceção, não substituição total"],
    ["Regulatório/trabalhista, LGPD", "Médio/Alto", "Jurídico especializado; cooperativa detém o vínculo; compliance no piloto"],
    ["Fundador solo", "Médio/Médio", "Piloto financia 1ª contratação de eng.; cláusulas de IP/continuidade"],
  ], { firstBold: true, hsize: 17 }),
];

// ---------------------------------------------------------------- 14
const s14 = [
  H1("14. Recomendação de investimento (piloto-first)"),
  P([new TextRun({ text: "Decisão em camadas, desacopladas:", bold: true, font: FONT, size: 22, color: NAVY })]),
  num("A Coaph deve assinar como cliente — agora. Paga ~R$ 18,8 mil/mês e economiza ~R$ 133,5 mil/mês (bruto). Decisão operacional de baixo risco e ROI imediato."),
  num("A Coaph deve financiar o piloto de R$ 300 mil — agora. Payback ~2,6 meses (realista; ~4 no conservador). O piloto valida o custo real do gap (sobrepreço + penalidade) e gera o case."),
  num("A rodada plena de R$ 1,5 mi — depois. Só após o piloto comprovar a economia e a adoção, justificada pela tese ofensiva (escala). Decidida com dados, não com promessa."),
  spacer(40),
  lead("Uso do piloto (R$ 300 mil): ", "hardening + integrações + LGPD; implantação na Coaph; instrumentação dos KPIs; 1 engenheiro por ~6 meses; comitê mensal Coaph + HealthMatch de acompanhamento do ROI."),
  lead("Gatilho para a rodada plena: ", "economia operacional realizada ≥ R$ 100 mil/mês comprovada no piloto."),
];

// ---------------------------------------------------------------- 15
const s15 = [
  H1("15. Roadmap"),
  lead("0–6 meses — Piloto Coaph (R$ 300 mil): ", "hardening/LGPD; implantar contingência; medir baseline e economia; comitê mensal de ROI."),
  lead("6–18 meses — Coaph plena + 2ª cooperativa: ", "expandir uso; abrir 1 cooperativa adjacente; preparar a rodada plena com o case comprovado."),
  lead("18–36 meses — Escala (ofensiva): ", "mais cooperativas/hospitais; rodada seed/plena com tração real."),
  spacer(120),
  note("Resumo da decisão: assine como cliente (ganha já) + financie um piloto enxuto (paga-se em meses) para provar o custo do gap. Adie a rodada grande até ter dados. Pior cenário aceitável: o piloto se paga e a Coaph fica com uma operação de contingência mais barata — sem ter arriscado R$ 1,5 mi."),
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
