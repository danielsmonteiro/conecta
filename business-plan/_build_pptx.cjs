const pptxgen = require("./node_modules/pptxgenjs");
const p = new pptxgen();
p.defineLayout({ name: "W", width: 13.333, height: 7.5 });
p.layout = "W";
p.author = "HealthMatch";
p.title = "HealthMatch — Pitch Pre-seed";

const NAVY = "0B2D5B", BLUE = "0B74D1", TEAL = "02C39A", MINT = "12B886",
      INK = "1A2B45", MUT = "6B7A90", BG = "F4F8FC", CARD = "FFFFFF", LINE = "DDE6F0",
      AMBER = "E8A23D", RED = "D85A5A";
const F = "Arial";
const W = 13.333, H = 7.5, M = 0.6;

function bg(s, c) { s.background = { color: c }; }
function kicker(s, t, color = TEAL, x = M, y = 0.5) {
  s.addText(t.toUpperCase(), { x, y, w: 8, h: 0.3, fontFace: F, fontSize: 12, bold: true, color, charSpacing: 2 });
}
function title(s, t, opts = {}) {
  s.addText(t, { x: opts.x ?? M, y: opts.y ?? 0.78, w: opts.w ?? 12.1, h: opts.h ?? 0.9,
    fontFace: F, fontSize: opts.fs ?? 30, bold: true, color: opts.color ?? NAVY, align: "left" });
}
function card(s, x, y, w, h, opts = {}) {
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08,
    fill: { color: opts.fill ?? CARD }, line: { color: opts.line ?? LINE, width: 1 },
    shadow: opts.shadow === false ? undefined : { type: "outer", blur: 6, offset: 2, angle: 90, color: "BBC8D8", opacity: 0.35 } });
}
function iconCircle(s, x, y, d, color, glyph) {
  s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color } });
  s.addText(glyph, { x, y, w: d, h: d, align: "center", valign: "middle", fontFace: F, fontSize: d * 26, bold: true, color: "FFFFFF" });
}
function pageFoot(s, n) {
  s.addText([{ text: "HealthMatch", options: { bold: true, color: NAVY } }, { text: "  ·  Confidencial", options: { color: MUT } }],
    { x: M, y: H - 0.42, w: 6, h: 0.3, fontFace: F, fontSize: 9 });
  s.addText(String(n), { x: W - 1.1, y: H - 0.42, w: 0.5, h: 0.3, fontFace: F, fontSize: 9, color: MUT, align: "right" });
}

// ============================================================ 1 COVER
let s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 9.2, y: -2.2, w: 6.5, h: 6.5, fill: { color: "12386B" } });
s.addShape(p.ShapeType.ellipse, { x: 11.0, y: 3.6, w: 5.5, h: 5.5, fill: { color: "0E315E" } });
s.addText("✚", { x: M, y: 0.7, w: 1, h: 1, fontFace: F, fontSize: 44, bold: true, color: TEAL });
s.addText("HealthMatch", { x: M, y: 2.35, w: 11, h: 1.1, fontFace: F, fontSize: 60, bold: true, color: "FFFFFF" });
s.addText("A camada de inteligência operacional do trabalho em saúde no Brasil",
  { x: M, y: 3.5, w: 9.6, h: 0.7, fontFace: F, fontSize: 20, color: "CADCFC" });
s.addText([
  { text: "Gestão e alocação inteligente de plantões  ", options: { color: TEAL, bold: true } },
  { text: "·  SaaS + marketplace com IA", options: { color: "9FB6D6" } }],
  { x: M, y: 4.25, w: 11, h: 0.5, fontFace: F, fontSize: 14 });
s.addText([
  { text: "Captação Pre-seed · R$ 1,5 mi", options: { bold: true, color: "FFFFFF" } },
  { text: "      Junho 2026  ·  Beachhead: Fortaleza/CE", options: { color: "9FB6D6" } }],
  { x: M, y: 6.4, w: 12, h: 0.4, fontFace: F, fontSize: 14 });

// ============================================================ 2 PROBLEMA
s = p.addSlide(); bg(s, BG); kicker(s, "O problema"); title(s, "Preencher um plantão ainda é um processo manual e caro");
const probs = [
  ["⚠", RED, "Plantão descoberto", "Vagas que ninguém preenche a tempo viram risco assistencial e multa contratual."],
  ["⌚", AMBER, "Horas no WhatsApp", "Coordenadores caçam profissionais em grupos, planilhas e telefonemas, um a um."],
  ["❓", BLUE, "Sem checagem", "Credencial vencida, especialidade errada e conflito de agenda passam despercebidos."],
  ["R$", NAVY, "Margem opaca", "Quem paga e quem recebe quanto? Sem dados, a operação perde dinheiro silenciosamente."],
];
probs.forEach((c, i) => {
  const x = M + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.35;
  card(s, x, y, 5.85, 2.05);
  iconCircle(s, x + 0.3, y + 0.32, 0.7, c[1], c[0]);
  s.addText(c[2], { x: x + 1.2, y: y + 0.3, w: 4.4, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: NAVY });
  s.addText(c[3], { x: x + 1.2, y: y + 0.78, w: 4.45, h: 1.1, fontFace: F, fontSize: 13, color: MUT });
});
s.addText("O concorrente nº 1 não é um software — é a planilha e o grupo de WhatsApp.",
  { x: M, y: 6.7, w: 12, h: 0.4, fontFace: F, fontSize: 14, italic: true, color: INK });
pageFoot(s, 2);

// ============================================================ 3 SOLUÇÃO
s = p.addSlide(); bg(s, BG); kicker(s, "A solução"); title(s, "Uma plataforma que preenche o plantão certo, sozinha");
const sol = [
  ["🎯", TEAL, "Matching inteligente", "Cruza especialidade, CBO, credencial, no-show e conflito de agenda — e ranqueia quem pode assumir."],
  ["🤖", BLUE, "IA que negocia 24/7", "Um agente conversa pelo WhatsApp, oferece o plantão e confirma — com humano no controle das ações críticas."],
  ["💳", MINT, "Financeiro de margem", "Recebíveis do cliente, pagáveis ao profissional e a margem da plataforma, com auditoria ponta a ponta."],
];
sol.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.1, 3.85, 3.7);
  iconCircle(s, x + 0.35, 2.45, 0.85, c[1], c[0]);
  s.addText(c[2], { x: x + 0.3, y: 3.45, w: 3.3, h: 0.5, fontFace: F, fontSize: 17, bold: true, color: NAVY });
  s.addText(c[3], { x: x + 0.3, y: 4.0, w: 3.3, h: 1.6, fontFace: F, fontSize: 13, color: MUT });
});
s.addText([{ text: "Resultado:  ", options: { bold: true, color: TEAL } },
  { text: "do plantão descoberto ao profissional confirmado em minutos, não em horas.", options: { color: INK } }],
  { x: M, y: 6.2, w: 12, h: 0.5, fontFace: F, fontSize: 15 });
pageFoot(s, 3);

// ============================================================ 4 PRODUTO
s = p.addSlide(); bg(s, BG); kicker(s, "Produto"); title(s, "Não é uma ideia: o produto já está construído e testado");
card(s, M, 1.95, 5.55, 4.55, { fill: NAVY });
s.addText("Já construído e testado", { x: M + 0.4, y: 2.25, w: 4.8, h: 0.5, fontFace: F, fontSize: 18, bold: true, color: "FFFFFF" });
[["32/32", "testes de API aprovados"], ["14/14", "regras de negócio validadas"], ["~20", "módulos de domínio"], ["Pronto", "para o primeiro piloto"]].forEach((r, i) => {
  const y = 2.95 + i * 0.82;
  s.addText(r[0], { x: M + 0.4, y, w: 1.5, h: 0.6, fontFace: F, fontSize: 26, bold: true, color: TEAL });
  s.addText(r[1], { x: M + 2.0, y: y + 0.1, w: 3.3, h: 0.5, fontFace: F, fontSize: 13, color: "CADCFC" });
});
const feats = [["Pipeline de vagas e contratos","avulso, recorrente, cobertura, pool"],
  ["Candidaturas → alocações → escala","com controle de presença e no-show"],
  ["Credenciamento regulatório","CRM/COREN, CBO, RQE, documentos"],
  ["Omnichannel + auditoria + RBAC","WhatsApp/SMS/e-mail, white-label"]];
feats.forEach((c, i) => {
  const y = 1.95 + i * 1.16; card(s, 6.5, y, 6.2, 1.0);
  s.addShape(p.ShapeType.ellipse, { x: 6.78, y: y + 0.33, w: 0.34, h: 0.34, fill: { color: TEAL } });
  s.addText("✓", { x: 6.78, y: y + 0.33, w: 0.34, h: 0.34, align: "center", valign: "middle", fontFace: F, fontSize: 12, bold: true, color: "FFFFFF" });
  s.addText(c[0], { x: 7.3, y: y + 0.14, w: 5.2, h: 0.4, fontFace: F, fontSize: 14.5, bold: true, color: NAVY });
  s.addText(c[1], { x: 7.3, y: y + 0.54, w: 5.2, h: 0.35, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("Stack: NestJS · Next.js · PostgreSQL · IA Anthropic · Twilio/WhatsApp · Docker",
  { x: M, y: 6.75, w: 12, h: 0.35, fontFace: F, fontSize: 12, italic: true, color: MUT });
pageFoot(s, 4);

// ============================================================ 5 POR QUE AGORA
s = p.addSlide(); bg(s, BG); kicker(s, "Por que agora"); title(s, "A janela abriu — e o modelo já é provado lá fora");
const now = [
  ["📉", "Saúde operacional ainda manual", "A “última milha” do RH em saúde — escala e plantão — segue em planilhas."],
  ["💬", "WhatsApp + IA maduros", "Recrutamento conversacional automatizado a custo marginal quase zero."],
  ["🏛", "Pressão por conformidade", "Setor público exige controle de presença e prestação de contas."],
  ["🌎", "Tese validada globalmente", "Nomad, Trusted, Medely (EUA) e Patchwork (UK) captaram centenas de US$ mi."],
];
now.forEach((c, i) => {
  const x = M + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.3;
  card(s, x, y, 5.85, 2.0);
  iconCircle(s, x + 0.32, y + 0.34, 0.72, BLUE, c[0]);
  s.addText(c[1], { x: x + 1.25, y: y + 0.3, w: 4.4, h: 0.45, fontFace: F, fontSize: 16.5, bold: true, color: NAVY });
  s.addText(c[2], { x: x + 1.25, y: y + 0.82, w: 4.45, h: 1.0, fontFace: F, fontSize: 12.5, color: MUT });
});
pageFoot(s, 5);

// ============================================================ 6 MERCADO
s = p.addSlide(); bg(s, BG); kicker(s, "Mercado"); title(s, "Um mercado de bilhões, hoje sem dono digital");
const tam = [["TAM", "R$ 15–20 bi", "GMV de plantões/escalas de saúde no Brasil", "0E315E", 6.4, 26],
  ["SAM", "R$ 3–4 bi", "Nordeste + cooperativas, hospitais privados e público", "155A9C", 5.0, 26],
  ["SOM", "R$ 150–300 mi", "CE + cooperativas do NE capturáveis (3–5 anos)", BLUE, 3.7, 22]];
tam.forEach((t, i) => {
  const w = t[4], x = M + (6.4 - w) / 2, y = 1.9 + i * 1.55;
  s.addShape(p.ShapeType.roundRect, { x, y, w, h: 1.35, rectRadius: 0.06, fill: { color: t[3] } });
  s.addText(t[0], { x: x + 0.25, y: y + 0.16, w: 1.4, h: 0.4, fontFace: F, fontSize: 15, bold: true, color: TEAL });
  s.addText(t[1], { x: x + 0.25, y: y + 0.56, w: w - 0.45, h: 0.6, fontFace: F, fontSize: t[5], bold: true, color: "FFFFFF" });
});
tam.forEach((t, i) => s.addText(t[2], { x: 7.1, y: 2.05 + i * 1.55, w: 5.6, h: 1.0, fontFace: F, fontSize: 13, color: MUT, valign: "top" }));
s.addText("🔹 Estimativa bottom-up: nº de plantões × ticket médio (R$ 1.300). Receita endereçável ≈ 10% do GMV (take-rate + SaaS).",
  { x: M, y: 6.75, w: 12.1, h: 0.4, fontFace: F, fontSize: 11.5, italic: true, color: MUT });
pageFoot(s, 6);

// ============================================================ 7 MODELO
s = p.addSlide(); bg(s, BG); kicker(s, "Modelo de negócio"); title(s, "Híbrido: recorrência previsível + upside de marketplace");
card(s, M, 2.0, 5.95, 3.5);
iconCircle(s, M + 0.35, 2.35, 0.8, BLUE, "↻");
s.addText("SaaS — assinatura", { x: M + 1.35, y: 2.45, w: 4.3, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: NAVY });
s.addText("MRR por conta institucional (cooperativa, hospital, órgão público).",
  { x: M + 0.4, y: 3.4, w: 5.15, h: 0.7, fontFace: F, fontSize: 13.5, color: MUT });
s.addText([{ text: "~R$ 4.000", options: { bold: true, color: BLUE, fontSize: 30 } }, { text: "  /conta/mês (ARPA)", options: { color: MUT, fontSize: 13 } }],
  { x: M + 0.4, y: 4.25, w: 5.15, h: 0.6, fontFace: F });
s.addText("Tiers: Essencial · Pro · Enterprise (white-label)", { x: M + 0.4, y: 4.95, w: 5.15, h: 0.4, fontFace: F, fontSize: 11.5, italic: true, color: MUT });
card(s, 6.75, 2.0, 5.95, 3.5, { fill: NAVY });
iconCircle(s, 7.1, 2.35, 0.8, TEAL, "%");
s.addText("Fee — intermediação", { x: 8.1, y: 2.45, w: 4.3, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: "FFFFFF" });
s.addText("Take-rate sobre o GMV de cada plantão transacionado na plataforma.",
  { x: 7.15, y: 3.4, w: 5.15, h: 0.7, fontFace: F, fontSize: 13.5, color: "CADCFC" });
s.addText([{ text: "5–8%", options: { bold: true, color: TEAL, fontSize: 30 } }, { text: "  do GMV (cons.→otim.)", options: { color: "CADCFC", fontSize: 13 } }],
  { x: 7.15, y: 4.25, w: 5.15, h: 0.6, fontFace: F });
s.addText("GMV médio por plantão 🔹 R$ 1.300", { x: 7.15, y: 4.95, w: 5.15, h: 0.4, fontFace: F, fontSize: 11.5, italic: true, color: "9FB6D6" });
s.addText("MRR dá previsibilidade ao investidor; o take-rate captura o crescimento do volume.",
  { x: M, y: 5.95, w: 12, h: 0.5, fontFace: F, fontSize: 14.5, italic: true, color: INK, align: "center" });
pageFoot(s, 7);

// ============================================================ 8 WEDGE (killer)
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 10.4, y: -2.0, w: 6, h: 6, fill: { color: "12386B" } });
kicker(s, "O diferencial", TEAL);
title(s, "Nascemos com liquidez: a cooperativa-âncora", { color: "FFFFFF" });
s.addText("55.000", { x: M, y: 2.0, w: 5.4, h: 1.3, fontFace: F, fontSize: 72, bold: true, color: TEAL });
s.addText("cooperados já contratualizados como oferta no dia 1", { x: M, y: 3.25, w: 5.5, h: 0.9, fontFace: F, fontSize: 17, color: "CADCFC" });
const wedge = [["💰", "Investidor estratégico", "Capital pre-seed + smart money do setor"],
  ["🤝", "Cliente-âncora", "Primeiro contrato e case de validação"],
  ["👥", "Oferta pronta", "CAC de profissionais ≈ R$ 0"]];
wedge.forEach((c, i) => {
  const y = 1.95 + i * 1.45; card(s, 6.5, y, 6.25, 1.28, { fill: "0E335F", line: "1C4A82" });
  iconCircle(s, 6.8, y + 0.32, 0.64, TEAL, c[0]);
  s.addText(c[1], { x: 7.65, y: y + 0.22, w: 4.9, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: "FFFFFF" });
  s.addText(c[2], { x: 7.65, y: y + 0.66, w: 4.9, h: 0.4, fontFace: F, fontSize: 12.5, color: "9FB6D6" });
});
s.addText("Resolve o “ovo e galinha” do marketplace — e abre a porta do sistema cooperativista nacional.",
  { x: M, y: 6.7, w: 12, h: 0.4, fontFace: F, fontSize: 13.5, italic: true, color: TEAL });

// ============================================================ 9 CONCORRÊNCIA
s = p.addSlide(); bg(s, BG); kicker(s, "Concorrência"); title(s, "Fragmentado, manual e sem um player de tecnologia");
const rows = [["Status quo (WhatsApp/planilha)", "✓", "✗", "✗", "✗"],
  ["Agências/cooperativas tradicionais", "✓", "△", "✗", "✗"],
  ["Software hospitalar (HIS)", "△", "✗", "△", "✗"],
  ["Marketplaces de saúde adjacentes", "✗", "✗", "△", "△"],
  ["HealthMatch", "✓", "✓", "✓", "✓"]];
const cols = ["", "Relacionamento", "Matching + IA", "Financeiro/margem", "Marketplace"];
const cw = [4.7, 1.95, 1.95, 1.95, 1.95];
let cx = M; const ty = 2.05;
cols.forEach((c, i) => { s.addText(c, { x: cx, y: ty, w: cw[i], h: 0.5, fontFace: F, fontSize: 12.5, bold: true, color: NAVY, align: i === 0 ? "left" : "center", valign: "middle" }); cx += cw[i]; });
rows.forEach((r, ri) => {
  const y = 2.6 + ri * 0.74, hl = r[0] === "HealthMatch";
  s.addShape(p.ShapeType.roundRect, { x: M, y, w: 12.55, h: 0.64, rectRadius: 0.05, fill: { color: hl ? NAVY : (ri % 2 ? "EAF1F8" : CARD) }, line: { color: LINE, width: 1 } });
  let x = M;
  r.forEach((v, ci) => {
    const isTxt = ci === 0;
    const col = hl ? (isTxt ? "FFFFFF" : TEAL) : (v === "✓" ? MINT : v === "✗" ? "C7CFD9" : AMBER);
    s.addText(v, { x: x + (isTxt ? 0.2 : 0), y, w: cw[ci] - (isTxt ? 0.2 : 0), h: 0.64, fontFace: F, fontSize: isTxt ? 13 : 16, bold: isTxt || hl, color: col, align: isTxt ? "left" : "center", valign: "middle" });
    x += cw[ci];
  });
});
s.addText("✓ forte   △ parcial   ✗ ausente", { x: M, y: 6.75, w: 8, h: 0.3, fontFace: F, fontSize: 11, color: MUT });
pageFoot(s, 9);

// ============================================================ 10 FINANCEIRO (chart)
s = p.addSlide(); bg(s, BG); kicker(s, "Projeções"); title(s, "Receita líquida e caminho ao break-even");
s.addChart(p.ChartType.bar, [
  { name: "Conservador", labels: ["Ano 1", "Ano 2", "Ano 3"], values: [0.43, 2.26, 6.38] },
  { name: "Realista", labels: ["Ano 1", "Ano 2", "Ano 3"], values: [1.09, 5.99, 16.5] },
  { name: "Otimista", labels: ["Ano 1", "Ano 2", "Ano 3"], values: [1.98, 11.9, 33.3] },
], { x: M, y: 1.95, w: 7.4, h: 4.6, barDir: "col", chartColors: [MUT, BLUE, TEAL],
  showLegend: true, legendPos: "t", legendFontFace: F, legendFontSize: 11,
  showValue: true, dataLabelFontFace: F, dataLabelFontSize: 9, dataLabelColor: INK, dataLabelPosition: "outEnd",
  valAxisHidden: true, valAxisMaxVal: 36, catAxisLabelFontFace: F, catAxisLabelFontSize: 11, catAxisLabelColor: INK,
  showTitle: true, title: "Receita líquida (R$ mi)", titleFontFace: F, titleFontSize: 12, titleColor: NAVY });
const kpi = [["Break-even", "~mês 20–22", MINT], ["EBITDA Ano 3", "+R$ 3,2 mi (20%)", BLUE], ["GMV Ano 3", "R$ 187 mi", NAVY], ["Margem bruta", "~68%", TEAL]];
kpi.forEach((k, i) => {
  const y = 2.05 + i * 1.12; card(s, 8.35, y, 4.35, 0.98);
  s.addText(k[1], { x: 8.6, y: y + 0.12, w: 4.0, h: 0.5, fontFace: F, fontSize: 21, bold: true, color: k[2] });
  s.addText(k[0], { x: 8.6, y: y + 0.62, w: 4.0, h: 0.3, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("🔹 Cenário realista. Pré-lançamento: premissas de mercado a validar no piloto.",
  { x: M, y: 6.75, w: 12, h: 0.35, fontFace: F, fontSize: 11, italic: true, color: MUT });
pageFoot(s, 10);

// ============================================================ 11 UNIT ECONOMICS
s = p.addSlide(); bg(s, BG); kicker(s, "Unit economics"); title(s, "Economia saudável — mesmo na visão SaaS-only");
const ue = [["~7,7×", "LTV / CAC", "benchmark saudável > 3", TEAL],
  ["~4,7", "Payback de CAC (meses)", "benchmark saudável < 12", BLUE],
  ["12%", "Churn anual (logo)", "alto switching cost", NAVY],
  ["R$ 0", "CAC de profissionais", "via a cooperativa-âncora", MINT]];
ue.forEach((k, i) => {
  const x = M + (i % 2) * 6.15, y = 1.95 + Math.floor(i / 2) * 2.3;
  card(s, x, y, 5.85, 2.0);
  s.addText(k[0], { x: x + 0.4, y: y + 0.3, w: 5.0, h: 0.9, fontFace: F, fontSize: 44, bold: true, color: k[3] });
  s.addText(k[1], { x: x + 0.4, y: y + 1.2, w: 5.1, h: 0.4, fontFace: F, fontSize: 15, bold: true, color: NAVY });
  s.addText(k[2], { x: x + 0.4, y: y + 1.58, w: 5.1, h: 0.35, fontFace: F, fontSize: 12, color: MUT });
});
s.addText("Reporto SaaS-only para ser defensável; com o take-rate por cliente, a economia blended é muito maior.",
  { x: M, y: 6.7, w: 12, h: 0.4, fontFace: F, fontSize: 12.5, italic: true, color: INK });
pageFoot(s, 11);

// ============================================================ 12 ROADMAP
s = p.addSlide(); bg(s, BG); kicker(s, "Roadmap"); title(s, "Do piloto ao break-even em ~24 meses");
const ph = [["0–6 m", "Fundação & Âncora", ["Fechar pre-seed","Eng + CS/Ops; blindar IP/LGPD","Hardening: multi-tenancy + billing","Piloto na cooperativa-âncora"], TEAL],
  ["6–18 m", "Densidade regional", ["Expandir dentro da âncora","Abrir 2–3 cooperativas do NE","1º comercial + co-marketing","Break-even ~mês 20–22"], BLUE],
  ["18–36 m", "Expansão de segmento", ["Hospitais e redes privadas","Piloto no setor público (UPAs)","Inbound + indicações","Preparar rodada seed"], NAVY]];
ph.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.0, 3.85, 4.4);
  s.addShape(p.ShapeType.roundRect, { x, y: 2.0, w: 3.85, h: 0.95, rectRadius: 0.08, fill: { color: c[4] } });
  s.addText(c[0], { x: x + 0.3, y: 2.12, w: 3.3, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: "FFFFFF" });
  s.addText(c[1], { x: x + 0.3, y: 2.45, w: 3.3, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: "FFFFFF" });
  c[2].forEach((t, j) => {
    const y = 3.2 + j * 0.78;
    s.addShape(p.ShapeType.ellipse, { x: x + 0.32, y: y + 0.04, w: 0.16, h: 0.16, fill: { color: c[4] } });
    s.addText(t, { x: x + 0.62, y: y - 0.1, w: 3.05, h: 0.7, fontFace: F, fontSize: 12.5, color: INK, valign: "top" });
  });
});
pageFoot(s, 12);

// ============================================================ 13 ASK / USO
s = p.addSlide(); bg(s, BG); kicker(s, "A oportunidade"); title(s, "Captamos R$ 1,5 mi para ~20 meses de runway");
s.addShape(p.ShapeType.roundRect, { x: M, y: 2.0, w: 5.5, h: 4.4, rectRadius: 0.08, fill: { color: NAVY } });
s.addText("R$ 1,5 mi", { x: M + 0.45, y: 2.4, w: 4.6, h: 1.0, fontFace: F, fontSize: 50, bold: true, color: TEAL });
s.addText("Pre-seed · SAFE com teto", { x: M + 0.45, y: 3.5, w: 4.6, h: 0.4, fontFace: F, fontSize: 14, color: "CADCFC" });
const use = [["55%", "Produto & Engenharia"], ["18%", "GTM (Vendas & Marketing)"], ["10%", "Infra & COGS"], ["9%", "Jurídico / Compliance"], ["8%", "Reserva"]];
use.forEach((u, i) => {
  const y = 4.05 + i * 0.46;
  s.addText(u[0], { x: M + 0.45, y, w: 0.95, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: TEAL });
  s.addText(u[1], { x: M + 1.5, y, w: 3.6, h: 0.4, fontFace: F, fontSize: 13, color: "FFFFFF" });
});
const why = [["Produto pronto","construído e testado, pronto para implantar"],
  ["Distribuição única","a rede de cooperativas de saúde como esteira"],
  ["Liquidez no dia 1","55k cooperados de oferta, CAC ≈ 0"],
  ["Founder técnico","executa o roadmap; rodada monta o time"]];
why.forEach((c, i) => {
  const y = 2.0 + i * 1.13; card(s, 6.35, y, 6.4, 1.0);
  iconCircle(s, 6.62, y + 0.27, 0.46, TEAL, "✓");
  s.addText(c[0], { x: 7.25, y: y + 0.13, w: 5.3, h: 0.4, fontFace: F, fontSize: 14.5, bold: true, color: NAVY });
  s.addText(c[1], { x: 7.25, y: y + 0.52, w: 5.3, h: 0.4, fontFace: F, fontSize: 11.5, color: MUT });
});
pageFoot(s, 13);

// ============================================================ 14 FECHAMENTO
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: -2.2, y: 3.4, w: 6, h: 6, fill: { color: "0E315E" } });
s.addShape(p.ShapeType.ellipse, { x: 10.4, y: -2.4, w: 6.5, h: 6.5, fill: { color: "12386B" } });
s.addText("✚", { x: M, y: 1.7, w: 1, h: 1, fontFace: F, fontSize: 40, bold: true, color: TEAL });
s.addText("O sistema operacional do\ntrabalho em saúde no Brasil", { x: M, y: 2.7, w: 11.5, h: 1.8, fontFace: F, fontSize: 38, bold: true, color: "FFFFFF", lineSpacingMultiple: 1.05 });
s.addText("Produto pronto · canal único · liquidez no dia 1.  Vamos construir a categoria juntos.",
  { x: M, y: 4.7, w: 11, h: 0.6, fontFace: F, fontSize: 17, color: "CADCFC" });
s.addText([{ text: "HealthMatch", options: { bold: true, color: "FFFFFF" } },
  { text: "   ·   Captação Pre-seed R$ 1,5 mi   ·   Fortaleza/CE   ·   2026", options: { color: "9FB6D6" } }],
  { x: M, y: 6.5, w: 12, h: 0.4, fontFace: F, fontSize: 13 });

p.writeFile({ fileName: "/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_Pitch_Deck.pptx" })
  .then((f) => console.log("pptx written:", f));
