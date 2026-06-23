const pptxgen = require("./node_modules/pptxgenjs");
const p = new pptxgen();
p.defineLayout({ name: "W", width: 13.333, height: 7.5 });
p.layout = "W";
p.author = "HealthMatch";
p.title = "HealthMatch — Pitch Coaph (Pre-seed)";

const NAVY = "0B2D5B", BLUE = "0B74D1", TEAL = "02C39A", MINT = "12B886",
      INK = "1A2B45", MUT = "6B7A90", BG = "F4F8FC", CARD = "FFFFFF", LINE = "DDE6F0",
      AMBER = "E8A23D", RED = "D85A5A";
const F = "Arial";
const W = 13.333, H = 7.5, M = 0.6;

function bg(s, c) { s.background = { color: c }; }
function kicker(s, t, color = TEAL, x = M, y = 0.5) {
  s.addText(t.toUpperCase(), { x, y, w: 11, h: 0.3, fontFace: F, fontSize: 12, bold: true, color, charSpacing: 2 });
}
function title(s, t, opts = {}) {
  s.addText(t, { x: opts.x ?? M, y: opts.y ?? 0.78, w: opts.w ?? 12.1, h: opts.h ?? 0.9,
    fontFace: F, fontSize: opts.fs ?? 29, bold: true, color: opts.color ?? NAVY, align: "left" });
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
function pageFoot(s, n, dark) {
  const brand = dark ? "FFFFFF" : NAVY, mut = dark ? "9FB6D6" : MUT;
  s.addText([{ text: "HealthMatch", options: { bold: true, color: brand } }, { text: "  ·  Confidencial", options: { color: mut } }],
    { x: M, y: H - 0.42, w: 6, h: 0.3, fontFace: F, fontSize: 9 });
  s.addText(String(n), { x: W - 1.1, y: H - 0.42, w: 0.5, h: 0.3, fontFace: F, fontSize: 9, color: mut, align: "right" });
}
let s;

// ============================================================ 1 COVER
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 9.2, y: -2.2, w: 6.5, h: 6.5, fill: { color: "12386B" } });
s.addShape(p.ShapeType.ellipse, { x: 11.0, y: 3.6, w: 5.5, h: 5.5, fill: { color: "0E315E" } });
s.addText("✚", { x: M, y: 0.7, w: 1, h: 1, fontFace: F, fontSize: 44, bold: true, color: TEAL });
s.addText("HealthMatch", { x: M, y: 2.2, w: 11, h: 1.1, fontFace: F, fontSize: 58, bold: true, color: "FFFFFF" });
s.addText("Automação operacional para a Coaph — com opção de virar plataforma escalável",
  { x: M, y: 3.35, w: 10.2, h: 0.8, fontFace: F, fontSize: 19, color: "CADCFC" });
s.addText([
  { text: "Tese defensiva: cortar custo operacional  ", options: { color: TEAL, bold: true } },
  { text: "·  Tese ofensiva: escalar (upside)", options: { color: "9FB6D6" } }],
  { x: M, y: 4.25, w: 11, h: 0.5, fontFace: F, fontSize: 14 });
s.addText([
  { text: "Captação Pre-seed · R$ 1,5 mi (trancheado)", options: { bold: true, color: "FFFFFF" } },
  { text: "      Junho 2026  ·  Fortaleza/CE", options: { color: "9FB6D6" } }],
  { x: M, y: 6.4, w: 12, h: 0.4, fontFace: F, fontSize: 14 });

// ============================================================ 2 PROBLEMA
s = p.addSlide(); bg(s, BG); kicker(s, "O problema"); title(s, "Gerir plantões à mão custa caro — e a Coaph sente isso");
const probs = [
  ["⚠", RED, "Plantão descoberto", "Vagas não preenchidas a tempo viram risco assistencial e multa."],
  ["⌚", AMBER, "Horas no WhatsApp", "Prepostos caçam profissionais em grupos, planilhas e telefonemas."],
  ["❓", BLUE, "Sem checagem", "Credencial vencida, especialidade errada e conflito de agenda passam."],
  ["R$", NAVY, "Custo operacional alto", "Uma equipe inteira dedicada a um processo que dá para automatizar."],
];
probs.forEach((c, i) => {
  const x = M + (i % 2) * 6.15, y = 1.9 + Math.floor(i / 2) * 2.05;
  card(s, x, y, 5.85, 1.85);
  iconCircle(s, x + 0.3, y + 0.32, 0.66, c[1], c[0]);
  s.addText(c[2], { x: x + 1.15, y: y + 0.26, w: 4.5, h: 0.4, fontFace: F, fontSize: 16.5, bold: true, color: NAVY });
  s.addText(c[3], { x: x + 1.15, y: y + 0.74, w: 4.55, h: 0.95, fontFace: F, fontSize: 12.5, color: MUT });
});
s.addShape(p.ShapeType.roundRect, { x: M, y: 6.15, w: 12.13, h: 0.82, rectRadius: 0.06, fill: { color: NAVY } });
s.addText([{ text: "Na Coaph, esse trabalho manual custa ~", options: { color: "CADCFC" } },
  { text: "R$ 240 mil/mês", options: { color: TEAL, bold: true } },
  { text: " em prepostos — o alvo direto do HealthMatch.", options: { color: "CADCFC" } }],
  { x: M + 0.3, y: 6.15, w: 11.5, h: 0.82, fontFace: F, fontSize: 15, valign: "middle" });
pageFoot(s, 2);

// ============================================================ 3 SOLUÇÃO
s = p.addSlide(); bg(s, BG); kicker(s, "A solução"); title(s, "Uma plataforma que preenche o plantão certo, sozinha");
const sol = [
  ["🎯", TEAL, "Matching inteligente", "Cruza especialidade, CBO, credencial, no-show e conflito de agenda — e ranqueia quem pode assumir."],
  ["🤖", BLUE, "IA que negocia 24/7", "Um agente conversa pelo WhatsApp, oferece o plantão e confirma — com humano no controle das ações críticas."],
  ["💳", MINT, "Financeiro de margem", "Recebíveis, pagáveis e margem com auditoria ponta a ponta — menos conciliação manual."],
];
sol.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.1, 3.85, 3.7);
  iconCircle(s, x + 0.35, 2.45, 0.85, c[1], c[0]);
  s.addText(c[2], { x: x + 0.3, y: 3.45, w: 3.3, h: 0.5, fontFace: F, fontSize: 17, bold: true, color: NAVY });
  s.addText(c[3], { x: x + 0.3, y: 4.0, w: 3.3, h: 1.6, fontFace: F, fontSize: 13, color: MUT });
});
s.addText([{ text: "Resultado:  ", options: { bold: true, color: TEAL } },
  { text: "menos horas de preposto por plantão, e menos plantão descoberto.", options: { color: INK } }],
  { x: M, y: 6.2, w: 12, h: 0.5, fontFace: F, fontSize: 15 });
pageFoot(s, 3);

// ============================================================ 4 PRODUTO
s = p.addSlide(); bg(s, BG); kicker(s, "Produto"); title(s, "Não é uma ideia: o produto já está construído e testado");
card(s, M, 1.95, 5.55, 4.55, { fill: NAVY });
s.addText("Já construído e testado", { x: M + 0.4, y: 2.25, w: 4.8, h: 0.5, fontFace: F, fontSize: 18, bold: true, color: "FFFFFF" });
[["32/32", "testes de API aprovados"], ["14/14", "regras de negócio validadas"], ["~20", "módulos de domínio"], ["Pronto", "para o piloto na Coaph"]].forEach((r, i) => {
  const y = 2.95 + i * 0.82;
  s.addText(r[0], { x: M + 0.4, y, w: 1.5, h: 0.6, fontFace: F, fontSize: 26, bold: true, color: TEAL });
  s.addText(r[1], { x: M + 2.0, y: y + 0.1, w: 3.3, h: 0.5, fontFace: F, fontSize: 13, color: "CADCFC" });
});
const feats = [["Pipeline de vagas e contratos", "avulso, recorrente, cobertura, pool"],
  ["Candidaturas → alocações → escala", "com controle de presença e no-show"],
  ["Credenciamento regulatório", "CRM/COREN, CBO, RQE, documentos"],
  ["Omnichannel + auditoria + RBAC", "WhatsApp/SMS/e-mail, white-label"]];
feats.forEach((c, i) => {
  const y = 1.95 + i * 1.16; card(s, 6.5, y, 6.2, 1.0);
  iconCircle(s, 6.78, y + 0.33, 0.34, TEAL, "✓");
  s.addText(c[0], { x: 7.3, y: y + 0.14, w: 5.2, h: 0.4, fontFace: F, fontSize: 14.5, bold: true, color: NAVY });
  s.addText(c[1], { x: 7.3, y: y + 0.54, w: 5.2, h: 0.35, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("Stack: NestJS · Next.js · PostgreSQL · IA Anthropic · Twilio/WhatsApp · Docker",
  { x: M, y: 6.75, w: 12, h: 0.35, fontFace: F, fontSize: 12, italic: true, color: MUT });
pageFoot(s, 4);

// ============================================================ 5 TESE DEFENSIVA + OFENSIVA
s = p.addSlide(); bg(s, BG); kicker(s, "A tese"); title(s, "Duas teses — e a decisão se apoia na defensiva");
card(s, M, 1.95, 5.95, 4.0, { fill: NAVY });
s.addText("TESE DEFENSIVA · base da decisão", { x: M + 0.4, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 12.5, bold: true, color: TEAL });
s.addText("Reduzir o custo operacional da própria Coaph", { x: M + 0.4, y: 2.6, w: 5.2, h: 0.7, fontFace: F, fontSize: 17, bold: true, color: "FFFFFF" });
s.addText([{ text: "R$ 240 mil/mês", options: { fontSize: 30, bold: true, color: TEAL } }, { text: "  atacados", options: { fontSize: 14, color: "CADCFC" } }],
  { x: M + 0.4, y: 3.5, w: 5.2, h: 0.6, fontFace: F });
s.addText("Paga-se sozinha pela economia — mesmo sem nenhum cliente externo.", { x: M + 0.4, y: 4.4, w: 5.2, h: 1.2, fontFace: F, fontSize: 13.5, color: "CADCFC" });
card(s, 6.78, 1.95, 5.95, 4.0);
s.addText("TESE OFENSIVA · upside opcional", { x: 7.18, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 12.5, bold: true, color: BLUE });
s.addText("Virar plataforma para cooperativas, hospitais e setor público", { x: 7.18, y: 2.6, w: 5.2, h: 0.7, fontFace: F, fontSize: 17, bold: true, color: NAVY });
s.addText([{ text: "Receita recorrente + take-rate", options: { fontSize: 19, bold: true, color: BLUE } }],
  { x: 7.18, y: 3.5, w: 5.2, h: 0.6, fontFace: F });
s.addText("Multiplica o retorno se a escala acontecer — mas não é premissa da decisão.", { x: 7.18, y: 4.4, w: 5.2, h: 1.2, fontFace: F, fontSize: 13.5, color: MUT });
s.addText("A Coaph investe pela defensiva. A escala externa é bônus.",
  { x: M, y: 6.25, w: 12.13, h: 0.5, fontFace: F, fontSize: 15, italic: true, bold: true, color: INK, align: "center" });
pageFoot(s, 5);

// ============================================================ 6 ROI ESTRATÉGICO COAPH
s = p.addSlide(); bg(s, BG); kicker(s, "ROI estratégico para a Coaph"); title(s, "A economia interna paga o investimento");
const roi = [["25%", "Conservador", "R$ 60 mil", "~25 meses", "48%", MUT, false],
  ["50%", "Realista", "R$ 120 mil", "~12,5 meses", "96%", BLUE, true],
  ["75%", "Otimista", "R$ 180 mil", "~8,3 meses", "144%", TEAL, false],
  ["100%", "Teto teórico", "R$ 240 mil", "~6,3 meses", "192%", "9AA7B6", false]];
roi.forEach((c, i) => {
  const x = M + i * 3.08, y = 1.95, w = 2.85;
  card(s, x, y, w, 4.15, { fill: c[6] ? NAVY : CARD });
  s.addShape(p.ShapeType.roundRect, { x, y, w, h: 1.0, rectRadius: 0.08, fill: { color: c[5] } });
  s.addText(c[0], { x, y: y + 0.12, w, h: 0.6, fontFace: F, fontSize: 30, bold: true, color: "FFFFFF", align: "center" });
  s.addText(c[1], { x, y: y + 0.68, w, h: 0.3, fontFace: F, fontSize: 11.5, color: "FFFFFF", align: "center" });
  const tc = c[6] ? "FFFFFF" : NAVY, sc = c[6] ? "CADCFC" : MUT;
  const rows = [["Economia/mês", c[2]], ["Payback", c[3]], ["ROI anual", c[4]]];
  rows.forEach((r, j) => {
    const ry = y + 1.25 + j * 0.92;
    s.addText(r[0], { x: x + 0.2, y: ry, w: w - 0.4, h: 0.3, fontFace: F, fontSize: 10.5, color: sc, align: "center" });
    s.addText(r[1], { x: x + 0.2, y: ry + 0.28, w: w - 0.4, h: 0.5, fontFace: F, fontSize: 18, bold: true, color: tc, align: "center" });
  });
});
s.addText("🔹 Custo atual R$ 240 mil/mês · investimento R$ 1,5 mi. Base de defesa: 25% (cons.) a 50% (real.). 100% é teto teórico, não premissa.",
  { x: M, y: 6.35, w: 12.13, h: 0.5, fontFace: F, fontSize: 11.5, italic: true, color: MUT, align: "center" });
pageFoot(s, 6);

// ============================================================ 7 PIOR CENÁRIO AINDA ATRATIVO
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 10.2, y: -2.2, w: 6.5, h: 6.5, fill: { color: "12386B" } });
kicker(s, "Pior cenário ainda atrativo", TEAL);
title(s, "O piso da tese já justifica o investimento", { color: "FFFFFF" });
s.addText("Mesmo a 25%", { x: M, y: 2.1, w: 5.6, h: 0.5, fontFace: F, fontSize: 18, color: "CADCFC" });
s.addText("~25 meses", { x: M, y: 2.55, w: 5.8, h: 1.2, fontFace: F, fontSize: 64, bold: true, color: TEAL });
s.addText("de payback no cenário conservador — só com a economia interna da Coaph (R$ 720 mil/ano).",
  { x: M, y: 3.85, w: 5.6, h: 1.4, fontFace: F, fontSize: 15, color: "CADCFC" });
const pc = [["Downside limitado", "A economia interna sozinha justifica o aporte — não dependemos de escala nacional."],
  ["Upside aberto", "Se virar plataforma para outras cooperativas e hospitais, o retorno se multiplica."],
  ["Risco escalonado", "Tranches liberadas contra economia comprovada reduzem a exposição."]];
pc.forEach((c, i) => {
  const y = 1.95 + i * 1.45; card(s, 6.85, y, 5.9, 1.28, { fill: "0E335F", line: "1C4A82" });
  iconCircle(s, 7.15, y + 0.32, 0.62, TEAL, ["▼", "▲", "≋"][i]);
  s.addText(c[0], { x: 7.95, y: y + 0.2, w: 4.6, h: 0.4, fontFace: F, fontSize: 15.5, bold: true, color: "FFFFFF" });
  s.addText(c[1], { x: 7.95, y: y + 0.6, w: 4.6, h: 0.6, fontFace: F, fontSize: 11.5, color: "9FB6D6" });
});
pageFoot(s, 7, true);

// ============================================================ 8 INVESTIMENTO TRANCHEADO
s = p.addSlide(); bg(s, BG); kicker(s, "Estrutura do investimento"); title(s, "Investimento trancheado por resultado");
const tr = [["Tranche 1", "R$ 300–500 mil", "Assinatura + início do piloto", "Implantação, hardening, LGPD, integrações", TEAL],
  ["Tranche 2", "~R$ 500 mil", "Economia ≥ R$ 50 mil/mês comprovada", "Expansão de uso na Coaph; 1as contratações", BLUE],
  ["Tranche 3", "~R$ 600 mil", "Economia ≥ R$ 100 mil/mês (ou volume equiv.)", "Escala interna + preparo da expansão", NAVY]];
tr.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.0, 3.85, 4.05);
  s.addShape(p.ShapeType.roundRect, { x, y: 2.0, w: 3.85, h: 1.15, rectRadius: 0.08, fill: { color: c[4] } });
  s.addText(c[0], { x: x + 0.3, y: 2.16, w: 3.3, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: "FFFFFF" });
  s.addText(c[1], { x: x + 0.3, y: 2.55, w: 3.3, h: 0.5, fontFace: F, fontSize: 22, bold: true, color: "FFFFFF" });
  s.addText("GATILHO", { x: x + 0.3, y: 3.35, w: 3.3, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: c[4] });
  s.addText(c[2], { x: x + 0.3, y: 3.62, w: 3.25, h: 0.9, fontFace: F, fontSize: 13, bold: true, color: NAVY });
  s.addText("USO", { x: x + 0.3, y: 4.7, w: 3.3, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: MUT });
  s.addText(c[3], { x: x + 0.3, y: 4.97, w: 3.25, h: 0.95, fontFace: F, fontSize: 12, color: MUT });
});
s.addText("A Coaph só compromete capital adicional depois de ver a economia real. Capital escalonado pelo resultado.",
  { x: M, y: 6.35, w: 12.13, h: 0.5, fontFace: F, fontSize: 13.5, italic: true, color: INK, align: "center" });
pageFoot(s, 8);

// ============================================================ 9 KPIs DO PILOTO
s = p.addSlide(); bg(s, BG); kicker(s, "Como medimos sucesso"); title(s, "KPIs do piloto Coaph — economia, não só uso");
const kpis = [["💰", "Custo com prepostos", "antes × depois"], ["⌚", "Horas manuais eliminadas", "por mês"],
  ["⚡", "Plantões sem intervenção", "% automatizado"], ["⏱", "Tempo de preenchimento", "horas → minutos"],
  ["🤝", "Confirmações automatizadas", "% via IA/WhatsApp"], ["📉", "Economia operacional", "estimada × realizada"]];
kpis.forEach((c, i) => {
  const x = M + (i % 3) * 4.08, y = 2.0 + Math.floor(i / 3) * 1.95;
  card(s, x, y, 3.85, 1.7);
  iconCircle(s, x + 0.3, y + 0.32, 0.62, i === 5 ? MINT : BLUE, c[0]);
  s.addText(c[1], { x: x + 1.1, y: y + 0.28, w: 2.65, h: 0.6, fontFace: F, fontSize: 14, bold: true, color: NAVY });
  s.addText(c[2], { x: x + 1.1, y: y + 0.88, w: 2.65, h: 0.4, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("Baseline medido antes do piloto · comitê mensal Coaph + HealthMatch acompanha o ROI e libera as tranches.",
  { x: M, y: 6.35, w: 12.13, h: 0.5, fontFace: F, fontSize: 12.5, italic: true, color: INK, align: "center" });
pageFoot(s, 9);

// ============================================================ 10 MERCADO (upside)
s = p.addSlide(); bg(s, BG); kicker(s, "Upside · mercado"); title(s, "Se escalar: um mercado de bilhões, sem dono digital");
const tam = [["TAM", "R$ 15–20 bi", "GMV de plantões/escalas de saúde no Brasil", "0E315E", 6.4, 26],
  ["SAM", "R$ 3–4 bi", "Nordeste + cooperativas, hospitais e público", "155A9C", 5.0, 26],
  ["SOM", "R$ 150–300 mi", "CE + cooperativas do NE (3–5 anos)", BLUE, 3.7, 22]];
tam.forEach((t, i) => {
  const w = t[4], x = M + (6.4 - w) / 2, y = 1.9 + i * 1.5;
  s.addShape(p.ShapeType.roundRect, { x, y, w, h: 1.3, rectRadius: 0.06, fill: { color: t[3] } });
  s.addText(t[0], { x: x + 0.25, y: y + 0.14, w: 1.4, h: 0.4, fontFace: F, fontSize: 15, bold: true, color: TEAL });
  s.addText(t[1], { x: x + 0.25, y: y + 0.54, w: w - 0.45, h: 0.6, fontFace: F, fontSize: t[5], bold: true, color: "FFFFFF" });
});
tam.forEach((t, i) => s.addText(t[2], { x: 7.1, y: 2.02 + i * 1.5, w: 5.6, h: 1.0, fontFace: F, fontSize: 13, color: MUT, valign: "top" }));
s.addText("🔹 Upside (tese ofensiva), não a base da decisão. Bottom-up: nº de plantões × ticket (R$ 1.300); receita ≈ 10% do GMV.",
  { x: M, y: 6.55, w: 12.13, h: 0.5, fontFace: F, fontSize: 11.5, italic: true, color: MUT });
pageFoot(s, 10);

// ============================================================ 11 MODELO (upside)
s = p.addSlide(); bg(s, BG); kicker(s, "Upside · modelo de negócio"); title(s, "Se escalar: híbrido (recorrência + marketplace)");
card(s, M, 2.0, 5.95, 3.4);
iconCircle(s, M + 0.35, 2.35, 0.8, BLUE, "↻");
s.addText("SaaS — assinatura", { x: M + 1.35, y: 2.45, w: 4.3, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: NAVY });
s.addText("MRR por conta institucional (cooperativa, hospital, órgão público).", { x: M + 0.4, y: 3.35, w: 5.15, h: 0.7, fontFace: F, fontSize: 13.5, color: MUT });
s.addText([{ text: "~R$ 4.000", options: { bold: true, color: BLUE, fontSize: 28 } }, { text: "  /conta/mês (ARPA)", options: { color: MUT, fontSize: 13 } }], { x: M + 0.4, y: 4.2, w: 5.15, h: 0.6, fontFace: F });
card(s, 6.78, 2.0, 5.95, 3.4, { fill: NAVY });
iconCircle(s, 7.13, 2.35, 0.8, TEAL, "%");
s.addText("Fee — intermediação", { x: 8.13, y: 2.45, w: 4.3, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: "FFFFFF" });
s.addText("Take-rate sobre o GMV de cada plantão transacionado.", { x: 7.18, y: 3.35, w: 5.15, h: 0.7, fontFace: F, fontSize: 13.5, color: "CADCFC" });
s.addText([{ text: "5–8%", options: { bold: true, color: TEAL, fontSize: 28 } }, { text: "  do GMV (cons.→otim.)", options: { color: "CADCFC", fontSize: 13 } }], { x: 7.18, y: 4.2, w: 5.15, h: 0.6, fontFace: F });
s.addText("Para a Coaph, o modelo começa como economia de custo; a receita externa é o estágio seguinte.",
  { x: M, y: 5.85, w: 12, h: 0.5, fontFace: F, fontSize: 14, italic: true, color: INK, align: "center" });
pageFoot(s, 11);

// ============================================================ 12 PROJEÇÕES (upside)
s = p.addSlide(); bg(s, BG); kicker(s, "Upside · projeções"); title(s, "Receita do HealthMatch — se a escala acontecer");
s.addChart(p.ChartType.bar, [
  { name: "Conservador", labels: ["Ano 1", "Ano 2", "Ano 3"], values: [0.43, 2.26, 6.38] },
  { name: "Realista", labels: ["Ano 1", "Ano 2", "Ano 3"], values: [1.09, 5.99, 16.5] },
  { name: "Otimista", labels: ["Ano 1", "Ano 2", "Ano 3"], values: [1.98, 11.9, 33.3] },
], { x: M, y: 1.95, w: 7.4, h: 4.5, barDir: "col", chartColors: [MUT, BLUE, TEAL],
  showLegend: true, legendPos: "t", legendFontFace: F, legendFontSize: 11,
  showValue: true, dataLabelFontFace: F, dataLabelFontSize: 9, dataLabelColor: INK, dataLabelPosition: "outEnd",
  valAxisHidden: true, valAxisMaxVal: 36, catAxisLabelFontFace: F, catAxisLabelFontSize: 11, catAxisLabelColor: INK,
  showTitle: true, title: "Receita líquida (R$ mi)", titleFontFace: F, titleFontSize: 12, titleColor: NAVY });
const k2 = [["Break-even", "~mês 20–22", MINT], ["EBITDA Ano 3", "+R$ 3,2 mi (20%)", BLUE], ["LTV / CAC", "~7,7×", NAVY], ["Margem bruta", "~68%", TEAL]];
k2.forEach((k, i) => {
  const y = 2.0 + i * 1.1; card(s, 8.35, y, 4.35, 0.96);
  s.addText(k[1], { x: 8.6, y: y + 0.12, w: 4.0, h: 0.5, fontFace: F, fontSize: 20, bold: true, color: k[2] });
  s.addText(k[0], { x: 8.6, y: y + 0.6, w: 4.0, h: 0.3, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("🔹 Tese ofensiva (upside). A decisão da Coaph se apoia no ROI operacional (slide 6), não nestes números.",
  { x: M, y: 6.7, w: 12, h: 0.35, fontFace: F, fontSize: 11, italic: true, color: MUT });
pageFoot(s, 12);

// ============================================================ 13 CONCORRÊNCIA
s = p.addSlide(); bg(s, BG); kicker(s, "Concorrência"); title(s, "O concorrente nº 1 é o processo manual");
const rows = [["Status quo (WhatsApp/planilha/preposto)", "✓", "✗", "✗", "✗"],
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
    s.addText(v, { x: x + (isTxt ? 0.2 : 0), y, w: cw[ci] - (isTxt ? 0.2 : 0), h: 0.64, fontFace: F, fontSize: isTxt ? 12.5 : 16, bold: isTxt || hl, color: col, align: isTxt ? "left" : "center", valign: "middle" });
    x += cw[ci];
  });
});
s.addText("✓ forte   △ parcial   ✗ ausente", { x: M, y: 6.75, w: 8, h: 0.3, fontFace: F, fontSize: 11, color: MUT });
pageFoot(s, 13);

// ============================================================ 14 ROADMAP
s = p.addSlide(); bg(s, BG); kicker(s, "Roadmap"); title(s, "Do piloto à economia comprovada — e à escala");
const ph = [["0–6 m · T1", "Implantação na Coaph", ["Contrato + Tranche 1", "Hardening + LGPD", "Piloto com baseline", "Comitê mensal de ROI"], TEAL],
  ["6–18 m · T2–T3", "Provar economia", ["≥ R$ 50 mil/mês", "depois ≥ R$ 100 mil/mês", "Abrir 1–2 cooperativas", "Case da Coaph"], BLUE],
  ["18–36 m", "Escala (ofensiva)", ["Hospitais e redes", "Setor público (UPAs)", "Rodada seed com tração", "Expansão nacional"], NAVY]];
ph.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.0, 3.85, 4.4);
  s.addShape(p.ShapeType.roundRect, { x, y: 2.0, w: 3.85, h: 0.95, rectRadius: 0.08, fill: { color: c[4] } });
  s.addText(c[0], { x: x + 0.3, y: 2.12, w: 3.3, h: 0.35, fontFace: F, fontSize: 12.5, bold: true, color: "FFFFFF" });
  s.addText(c[1], { x: x + 0.3, y: 2.45, w: 3.3, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: "FFFFFF" });
  c[2].forEach((t, j) => {
    const y = 3.2 + j * 0.78;
    s.addShape(p.ShapeType.ellipse, { x: x + 0.32, y: y + 0.04, w: 0.16, h: 0.16, fill: { color: c[4] } });
    s.addText(t, { x: x + 0.62, y: y - 0.1, w: 3.05, h: 0.7, fontFace: F, fontSize: 12.5, color: INK, valign: "top" });
  });
});
pageFoot(s, 14);

// ============================================================ 15 RECOMENDAÇÃO (honesta)
s = p.addSlide(); bg(s, BG); kicker(s, "A recomendação"); title(s, "Quando a Coaph deve investir — e quando não");
card(s, M, 1.95, 5.95, 4.5, { fill: NAVY });
s.addText("INVESTIR — se TODAS forem atendidas", { x: M + 0.4, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: TEAL });
[["Assinar contrato como cliente-âncora"], ["Investimento trancheado (não único)"], ["Tranches ligadas a economia comprovada"], ["KPIs claros + comitê mensal de ROI"]].forEach((t, i) => {
  const y = 2.7 + i * 0.78;
  iconCircle(s, M + 0.4, y, 0.4, TEAL, "✓");
  s.addText(t[0], { x: M + 0.95, y: y - 0.04, w: 4.55, h: 0.55, fontFace: F, fontSize: 13.5, color: "FFFFFF", valign: "middle" });
});
s.addText("Sem essas condições → não investir agora.", { x: M + 0.4, y: 5.9, w: 5.2, h: 0.4, fontFace: F, fontSize: 12.5, italic: true, color: "9FB6D6" });
card(s, 6.78, 1.95, 5.95, 4.5);
s.addText("O enquadramento honesto", { x: 7.18, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: NAVY });
s.addText([
  { text: "Para um investidor financeiro puro, o HealthMatch ainda é cedo", options: { bold: true, color: INK } },
  { text: " — pré-receita, fundador solo, sem tração externa.\n\n", options: { color: MUT } },
  { text: "Para a Coaph, o investimento pode ser racional mesmo sem escala", options: { bold: true, color: INK } },
  { text: ", porque ataca uma economia concreta de até R$ 240 mil/mês. ", options: { color: MUT } },
  { text: "A escala externa é upside, não premissa.", options: { bold: true, color: BLUE } }],
  { x: 7.18, y: 2.65, w: 5.2, h: 3.6, fontFace: F, fontSize: 14, color: MUT, valign: "top", lineSpacingMultiple: 1.05 });
pageFoot(s, 15);

// ============================================================ 16 FECHAMENTO
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: -2.2, y: 3.4, w: 6, h: 6, fill: { color: "0E315E" } });
s.addShape(p.ShapeType.ellipse, { x: 10.4, y: -2.4, w: 6.5, h: 6.5, fill: { color: "12386B" } });
s.addText("✚", { x: M, y: 1.7, w: 1, h: 1, fontFace: F, fontSize: 40, bold: true, color: TEAL });
s.addText("Eficiência operacional agora,\nplataforma escalável depois", { x: M, y: 2.7, w: 11.5, h: 1.8, fontFace: F, fontSize: 36, bold: true, color: "FFFFFF", lineSpacingMultiple: 1.05 });
s.addText("A economia interna paga o investimento. A escala externa é o prêmio.",
  { x: M, y: 4.7, w: 11, h: 0.6, fontFace: F, fontSize: 17, color: "CADCFC" });
s.addText([{ text: "HealthMatch", options: { bold: true, color: "FFFFFF" } },
  { text: "   ·   Pre-seed R$ 1,5 mi (trancheado)   ·   Coaph · Fortaleza/CE   ·   2026", options: { color: "9FB6D6" } }],
  { x: M, y: 6.5, w: 12, h: 0.4, fontFace: F, fontSize: 13 });

p.writeFile({ fileName: "/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_Pitch_Deck.pptx" })
  .then((f) => console.log("pptx written:", f));
