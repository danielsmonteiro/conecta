const pptxgen = require("./node_modules/pptxgenjs");
const p = new pptxgen();
p.defineLayout({ name: "W", width: 13.333, height: 7.5 });
p.layout = "W";
p.author = "HealthMatch";
p.title = "HealthMatch — Pitch Coaph (piloto + pre-seed)";

const NAVY = "0B2D5B", BLUE = "0B74D1", TEAL = "02C39A", MINT = "12B886",
      INK = "1A2B45", MUT = "6B7A90", BG = "F4F8FC", CARD = "FFFFFF", LINE = "DDE6F0",
      AMBER = "E8A23D", RED = "D85A5A";
const F = "Arial";
const W = 13.333, H = 7.5, M = 0.6;

function bg(s, c) { s.background = { color: c }; }
function kicker(s, t, color = TEAL) { s.addText(t.toUpperCase(), { x: M, y: 0.5, w: 11, h: 0.3, fontFace: F, fontSize: 12, bold: true, color, charSpacing: 2 }); }
function title(s, t, o = {}) { s.addText(t, { x: M, y: o.y ?? 0.78, w: o.w ?? 12.1, h: 0.9, fontFace: F, fontSize: o.fs ?? 29, bold: true, color: o.color ?? NAVY }); }
function card(s, x, y, w, h, o = {}) {
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: o.fill ?? CARD }, line: { color: o.line ?? LINE, width: 1 },
    shadow: o.shadow === false ? undefined : { type: "outer", blur: 6, offset: 2, angle: 90, color: "BBC8D8", opacity: 0.35 } });
}
function iconCircle(s, x, y, d, color, glyph) {
  s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color } });
  s.addText(glyph, { x, y, w: d, h: d, align: "center", valign: "middle", fontFace: F, fontSize: d * 26, bold: true, color: "FFFFFF" });
}
function foot(s, n, dark) {
  const b = dark ? "FFFFFF" : NAVY, m = dark ? "9FB6D6" : MUT;
  s.addText([{ text: "HealthMatch", options: { bold: true, color: b } }, { text: "  ·  Confidencial", options: { color: m } }], { x: M, y: H - 0.42, w: 6, h: 0.3, fontFace: F, fontSize: 9 });
  s.addText(String(n), { x: W - 1.1, y: H - 0.42, w: 0.5, h: 0.3, fontFace: F, fontSize: 9, color: m, align: "right" });
}
let s;

// 1 COVER
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 9.2, y: -2.2, w: 6.5, h: 6.5, fill: { color: "12386B" } });
s.addShape(p.ShapeType.ellipse, { x: 11.0, y: 3.6, w: 5.5, h: 5.5, fill: { color: "0E315E" } });
s.addText("✚", { x: M, y: 0.7, w: 1, h: 1, fontFace: F, fontSize: 44, bold: true, color: TEAL });
s.addText("HealthMatch", { x: M, y: 2.2, w: 11, h: 1.1, fontFace: F, fontSize: 58, bold: true, color: "FFFFFF" });
s.addText("A camada de contingência para escalas de saúde", { x: M, y: 3.35, w: 10.5, h: 0.7, fontFace: F, fontSize: 20, color: "CADCFC" });
s.addText([{ text: "Cobre o gap — não a escala inteira  ", options: { color: TEAL, bold: true } }, { text: "·  começando pela Coaph", options: { color: "9FB6D6" } }],
  { x: M, y: 4.2, w: 11, h: 0.5, fontFace: F, fontSize: 14 });
s.addText([{ text: "Piloto R$ 300 mil (rodada plena depois)", options: { bold: true, color: "FFFFFF" } }, { text: "      Junho 2026  ·  Fortaleza/CE", options: { color: "9FB6D6" } }],
  { x: M, y: 6.4, w: 12, h: 0.4, fontFace: F, fontSize: 14 });

// 2 PROBLEMA
s = p.addSlide(); bg(s, BG); kicker(s, "O problema"); title(s, "O caro não é a escala — é o gap");
const probs = [
  ["⚠", RED, "Plantão descoberto", "Penalidade contratual + risco assistencial quando ninguém cobre."],
  ["🔄", AMBER, "No-show", "Cobertura de última hora, quase sempre com sobrepreço."],
  ["⌚", BLUE, "Horas de preposto", "As exceções consomem o grosso do esforço da equipe."],
  ["🎯", NAVY, "Exceção, não regra", "A maior parte fecha no processo normal; o gap é onde dói."],
];
probs.forEach((c, i) => {
  const x = M + (i % 2) * 6.15, y = 1.9 + Math.floor(i / 2) * 2.05;
  card(s, x, y, 5.85, 1.85); iconCircle(s, x + 0.3, y + 0.32, 0.66, c[1], c[0]);
  s.addText(c[2], { x: x + 1.15, y: y + 0.26, w: 4.5, h: 0.4, fontFace: F, fontSize: 16.5, bold: true, color: NAVY });
  s.addText(c[3], { x: x + 1.15, y: y + 0.74, w: 4.55, h: 0.95, fontFace: F, fontSize: 12.5, color: MUT });
});
s.addShape(p.ShapeType.roundRect, { x: M, y: 6.15, w: 12.13, h: 0.82, rectRadius: 0.06, fill: { color: NAVY } });
s.addText([{ text: "Na Coaph: ", options: { color: "CADCFC" } }, { text: "~R$ 240 mil/mês", options: { color: TEAL, bold: true } },
  { text: " em prepostos + sobrepreço de cobertura + penalidades — tudo concentrado no gap.", options: { color: "CADCFC" } }],
  { x: M + 0.3, y: 6.15, w: 11.5, h: 0.82, fontFace: F, fontSize: 14.5, valign: "middle" });
foot(s, 2);

// 3 SOLUÇÃO
s = p.addSlide(); bg(s, BG); kicker(s, "A solução"); title(s, "Uma camada de contingência que entra só quando falha");
const sol = [
  ["🎯", TEAL, "Matching", "Cruza especialidade, CBO, credencial, no-show e conflito de agenda — acha rápido quem cobre."],
  ["🤖", BLUE, "IA no WhatsApp", "Aborda, negocia e confirma a cobertura 24/7, com humano nas ações críticas."],
  ["💳", MINT, "Financeiro", "Registra a cobertura e a margem com auditoria — sem conciliação manual."],
];
sol.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.1, 3.85, 3.5); iconCircle(s, x + 0.35, 2.45, 0.85, c[1], c[0]);
  s.addText(c[2], { x: x + 0.3, y: 3.45, w: 3.3, h: 0.5, fontFace: F, fontSize: 17, bold: true, color: NAVY });
  s.addText(c[3], { x: x + 0.3, y: 4.0, w: 3.3, h: 1.5, fontFace: F, fontSize: 13, color: MUT });
});
s.addText([{ text: "Resultado:  ", options: { bold: true, color: TEAL } }, { text: "gap coberto em minutos, de um pool pronto, sem o sobrepreço da urgência.", options: { color: INK } }],
  { x: M, y: 6.1, w: 12, h: 0.5, fontFace: F, fontSize: 15 });
foot(s, 3);

// 4 PRODUTO
s = p.addSlide(); bg(s, BG); kicker(s, "Produto"); title(s, "Não é uma ideia: já está construído e testado");
card(s, M, 1.95, 5.55, 4.55, { fill: NAVY });
s.addText("Já construído e testado", { x: M + 0.4, y: 2.25, w: 4.8, h: 0.5, fontFace: F, fontSize: 18, bold: true, color: "FFFFFF" });
[["32/32", "testes de API aprovados"], ["14/14", "regras de negócio validadas"], ["~20", "módulos de domínio"], ["Pronto", "para o piloto na Coaph"]].forEach((r, i) => {
  const y = 2.95 + i * 0.82;
  s.addText(r[0], { x: M + 0.4, y, w: 1.5, h: 0.6, fontFace: F, fontSize: 26, bold: true, color: TEAL });
  s.addText(r[1], { x: M + 2.0, y: y + 0.1, w: 3.3, h: 0.5, fontFace: F, fontSize: 13, color: "CADCFC" });
});
const feats = [["Matching + conflito de agenda", "especialidade, CBO, credencial, no-show"],
  ["IA conversacional no WhatsApp", "aborda, negocia e confirma a cobertura"],
  ["Financeiro + auditoria", "registro da cobertura e da margem"],
  ["Omnichannel + RBAC + white-label", "pronto para multi-tenant no roadmap"]];
feats.forEach((c, i) => {
  const y = 1.95 + i * 1.16; card(s, 6.5, y, 6.2, 1.0); iconCircle(s, 6.78, y + 0.33, 0.34, TEAL, "✓");
  s.addText(c[0], { x: 7.3, y: y + 0.14, w: 5.2, h: 0.4, fontFace: F, fontSize: 14.5, bold: true, color: NAVY });
  s.addText(c[1], { x: 7.3, y: y + 0.54, w: 5.2, h: 0.35, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("Stack: NestJS · Next.js · PostgreSQL · IA Anthropic · Twilio/WhatsApp · Docker", { x: M, y: 6.75, w: 12, h: 0.35, fontFace: F, fontSize: 12, italic: true, color: MUT });
foot(s, 4);

// 5 TESE DUPLA
s = p.addSlide(); bg(s, BG); kicker(s, "A tese"); title(s, "Defensiva paga o piloto; ofensiva paga a rodada");
card(s, M, 1.95, 5.95, 4.0, { fill: NAVY });
s.addText("DEFENSIVA · justifica o PILOTO", { x: M + 0.4, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 12.5, bold: true, color: TEAL });
s.addText("Reduzir o custo do gap na Coaph", { x: M + 0.4, y: 2.6, w: 5.2, h: 0.6, fontFace: F, fontSize: 17, bold: true, color: "FFFFFF" });
s.addText("Tempo de preposto + sobrepreço emergencial + penalidade evitada. Mensurável já.", { x: M + 0.4, y: 3.3, w: 5.2, h: 1.0, fontFace: F, fontSize: 13.5, color: "CADCFC" });
s.addText([{ text: "Piloto R$ 300 mil", options: { fontSize: 24, bold: true, color: TEAL } }, { text: "  · paga-se em ~2,6 meses", options: { fontSize: 13, color: "CADCFC" } }],
  { x: M + 0.4, y: 4.7, w: 5.2, h: 0.8, fontFace: F });
card(s, 6.78, 1.95, 5.95, 4.0);
s.addText("OFENSIVA · justifica a RODADA PLENA", { x: 7.18, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 12.5, bold: true, color: BLUE });
s.addText("Escalar a contingência", { x: 7.18, y: 2.6, w: 5.2, h: 0.6, fontFace: F, fontSize: 17, bold: true, color: NAVY });
s.addText("Mesma camada para outras cooperativas e hospitais. SaaS de contingência — modesto e previsível.", { x: 7.18, y: 3.3, w: 5.2, h: 1.0, fontFace: F, fontSize: 13.5, color: MUT });
s.addText([{ text: "R$ 1,5 mi DEPOIS", options: { fontSize: 22, bold: true, color: BLUE } }, { text: "  · após o piloto", options: { fontSize: 13, color: MUT } }],
  { x: 7.18, y: 4.7, w: 5.2, h: 0.6, fontFace: F });
s.addText("A Coaph assina como cliente (ganha já) + financia o piloto. A rodada grande fica para depois, com dados.",
  { x: M, y: 6.25, w: 12.13, h: 0.5, fontFace: F, fontSize: 14.5, italic: true, bold: true, color: INK, align: "center" });
foot(s, 5);

// 6 BUSINESS CASE — economia 3 camadas
s = p.addSlide(); bg(s, BG); kicker(s, "Business case · Coaph"); title(s, "A economia do gap vem de três camadas");
const lay = [["Tempo de preposto no gap", "R$ 38 mil", BLUE], ["Sobrepreço emergencial evitado", "R$ 53 mil", TEAL], ["Penalidade evitada", "R$ 43 mil", MINT]];
lay.forEach((c, i) => {
  const y = 1.95 + i * 1.0; card(s, M, y, 7.0, 0.85);
  s.addShape(p.ShapeType.roundRect, { x: M, y, w: 0.16, h: 0.85, rectRadius: 0.02, fill: { color: c[2] } });
  s.addText(c[0], { x: M + 0.35, y, w: 4.6, h: 0.85, fontFace: F, fontSize: 14.5, color: INK, valign: "middle" });
  s.addText(c[1], { x: M + 4.9, y, w: 1.9, h: 0.85, fontFace: F, fontSize: 20, bold: true, color: c[2], align: "right", valign: "middle" });
});
card(s, 8.0, 1.95, 4.73, 2.9, { fill: NAVY });
s.addText("Economia bruta/mês", { x: 8.3, y: 2.2, w: 4.1, h: 0.4, fontFace: F, fontSize: 13, color: "CADCFC" });
s.addText("R$ 134 mil", { x: 8.3, y: 2.6, w: 4.1, h: 0.8, fontFace: F, fontSize: 36, bold: true, color: TEAL });
s.addText("(–) pago ao HealthMatch  R$ 19 mil", { x: 8.3, y: 3.5, w: 4.1, h: 0.4, fontFace: F, fontSize: 12.5, color: "9FB6D6" });
s.addText([{ text: "Líquida: ", options: { color: "CADCFC" } }, { text: "R$ 115 mil/mês", options: { bold: true, color: "FFFFFF" } }], { x: 8.3, y: 3.95, w: 4.1, h: 0.5, fontFace: F, fontSize: 16 });
s.addText("Cenário realista (gap ~600/mês). Como cliente, a Coaph é líquida-positiva todo mês — antes de qualquer investimento.",
  { x: M, y: 5.3, w: 12.13, h: 0.5, fontFace: F, fontSize: 13.5, italic: true, color: INK });
s.addText("🔹 Sobrepreço e penalidade são as premissas de maior peso — o piloto existe para medi-las.",
  { x: M, y: 6.55, w: 12.13, h: 0.4, fontFace: F, fontSize: 11.5, italic: true, color: MUT });
foot(s, 6);

// 7 RECEITA / VAGAS OCIOSAS
s = p.addSlide(); bg(s, BG); kicker(s, "Receita incremental"); title(s, "Dinheiro na mesa: 1/3 das vagas fica ocioso");
card(s, M, 1.95, 5.55, 4.55, { fill: NAVY });
s.addText("12.000 contratadas → 8.000 preenchidas", { x: M + 0.4, y: 2.25, w: 4.8, h: 0.5, fontFace: F, fontSize: 15, color: "CADCFC" });
s.addText("4.000", { x: M + 0.4, y: 2.8, w: 4.8, h: 1.0, fontFace: F, fontSize: 58, bold: true, color: TEAL });
s.addText("vagas ociosas/mês (33%) por falta de profissionais", { x: M + 0.4, y: 3.95, w: 4.8, h: 0.7, fontFace: F, fontSize: 14, color: "CADCFC" });
s.addText([{ text: "R$ 3,6 mi/mês", options: { bold: true, color: "FFFFFF", fontSize: 22 } }, { text: "  de GMV na mesa", options: { color: "9FB6D6", fontSize: 13 } }], { x: M + 0.4, y: 5.05, w: 4.8, h: 0.6, fontFace: F });
const rv = [["💵", MINT, "Receita incremental", "Captura realista (25%) → ~R$ 36 mil/mês de margem para a Coaph."],
  ["🛡", BLUE, "Retenção de contrato", "O maior valor: a sub-execução crônica ameaça a renovação — preencher protege a receita inteira."],
  ["👥", TEAL, "Missão cooperativa", "Mais vagas preenchidas = mais trabalho e renda aos cooperados."]];
rv.forEach((c, i) => { const y = 1.95 + i * 1.55; card(s, 6.5, y, 6.23, 1.4);
  iconCircle(s, 6.8, y + 0.4, 0.62, c[1], c[0]);
  s.addText(c[2], { x: 7.6, y: y + 0.22, w: 4.9, h: 0.4, fontFace: F, fontSize: 15.5, bold: true, color: NAVY });
  s.addText(c[3], { x: 7.6, y: y + 0.64, w: 4.95, h: 0.72, fontFace: F, fontSize: 12, color: MUT });
});
s.addText("🔹 Margem fina (<5%): o ganho próprio em R$ é modesto; o valor está na retenção de contrato e na renda dos cooperados.",
  { x: M, y: 6.72, w: 12.13, h: 0.4, fontFace: F, fontSize: 11, italic: true, color: MUT });
foot(s, 7);

// 8 PAYBACK (dark)
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: 10.2, y: -2.2, w: 6.5, h: 6.5, fill: { color: "12386B" } });
kicker(s, "Payback", TEAL); title(s, "O piloto se paga em poucos meses", { color: "FFFFFF" });
s.addText("Piloto de R$ 300 mil", { x: M, y: 2.1, w: 5.6, h: 0.5, fontFace: F, fontSize: 18, color: "CADCFC" });
s.addText("~2,6 meses", { x: M, y: 2.55, w: 5.8, h: 1.2, fontFace: F, fontSize: 60, bold: true, color: TEAL });
s.addText("de payback no cenário realista (≈4 meses no conservador) — só com a economia do gap na Coaph.",
  { x: M, y: 3.8, w: 5.6, h: 1.3, fontFace: F, fontSize: 15, color: "CADCFC" });
const pb = [["Piloto · R$ 300 mil", "~2,6 meses", TEAL], ["Rodada plena · R$ 1,5 mi", "~13 meses", "FFFFFF"], ["Floor: só prepostos · R$ 1,5 mi", "~40 meses", "9FB6D6"]];
pb.forEach((c, i) => {
  const y = 2.0 + i * 1.45; card(s, 6.85, y, 5.9, 1.25, { fill: "0E335F", line: "1C4A82" });
  s.addText(c[0], { x: 7.2, y: y + 0.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 13.5, color: "CADCFC" });
  s.addText(c[1], { x: 7.2, y: y + 0.58, w: 5.2, h: 0.55, fontFace: F, fontSize: 22, bold: true, color: c[2] });
});
foot(s, 8, true);

// 8 MODELO DE RECEITA
s = p.addSlide(); bg(s, BG); kicker(s, "Modelo de receita"); title(s, "Margem da cooperativa < 5% → receita desacoplada do GMV");
card(s, M, 2.0, 5.95, 3.5);
iconCircle(s, M + 0.35, 2.35, 0.8, BLUE, "↻");
s.addText("SaaS de prontidão", { x: M + 1.35, y: 2.45, w: 4.3, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: NAVY });
s.addText("Mensalidade fixa pelo acesso ao pool de contingência. Previsível, não depende da margem fina.", { x: M + 0.4, y: 3.35, w: 5.15, h: 0.9, fontFace: F, fontSize: 13.5, color: MUT });
s.addText([{ text: "R$ 8 mil", options: { bold: true, color: BLUE, fontSize: 28 } }, { text: "  /mês (Coaph)", options: { color: MUT, fontSize: 13 } }], { x: M + 0.4, y: 4.3, w: 5.15, h: 0.6, fontFace: F });
card(s, 6.78, 2.0, 5.95, 3.5, { fill: NAVY });
iconCircle(s, 7.13, 2.35, 0.8, TEAL, "%");
s.addText("Fee por gap (capado)", { x: 8.13, y: 2.45, w: 4.3, h: 0.5, fontFace: F, fontSize: 19, bold: true, color: "FFFFFF" });
s.addText("Pequena taxa por cobertura, capada no teto da margem. Alinha receita ao valor entregue.", { x: 7.18, y: 3.35, w: 5.15, h: 0.9, fontFace: F, fontSize: 13.5, color: "CADCFC" });
s.addText([{ text: "≤ 2%", options: { bold: true, color: TEAL, fontSize: 28 } }, { text: "  ≈ R$ 24/plantão médico", options: { color: "CADCFC", fontSize: 13 } }], { x: 7.18, y: 4.3, w: 5.15, h: 0.6, fontFace: F });
s.addText("Take-rate gordo sobre GMV não se aplica neste mercado. Receita HM vinda da Coaph ≈ R$ 18,8 mil/mês.",
  { x: M, y: 5.85, w: 12, h: 0.5, fontFace: F, fontSize: 14, italic: true, color: INK, align: "center" });
foot(s, 9);

// 9 KPIs
s = p.addSlide(); bg(s, BG); kicker(s, "Como medimos sucesso"); title(s, "KPIs do piloto — economia do gap, não só uso");
const kpis = [["💰", "Sobrepreço de cobertura", "valida a camada 2"], ["⚠", "Plantões descobertos / penalidades", "valida a camada 3"],
  ["⌚", "Horas de preposto no gap", "valida a camada 1"], ["⏱", "Tempo de cobertura do gap", "horas → minutos"],
  ["🤝", "Aceite via WhatsApp/IA", "% de cobertura automática"], ["📉", "Economia mensal realizada", "gatilho da rodada plena"]];
kpis.forEach((c, i) => {
  const x = M + (i % 3) * 4.08, y = 2.0 + Math.floor(i / 3) * 1.95;
  card(s, x, y, 3.85, 1.7); iconCircle(s, x + 0.3, y + 0.32, 0.62, i === 5 ? MINT : BLUE, c[0]);
  s.addText(c[1], { x: x + 1.1, y: y + 0.26, w: 2.65, h: 0.6, fontFace: F, fontSize: 13.5, bold: true, color: NAVY });
  s.addText(c[2], { x: x + 1.1, y: y + 0.9, w: 2.65, h: 0.4, fontFace: F, fontSize: 11.5, color: MUT });
});
s.addText("Baseline antes do piloto · comitê mensal Coaph + HealthMatch acompanha o ROI e destrava a rodada plena.",
  { x: M, y: 6.35, w: 12.13, h: 0.5, fontFace: F, fontSize: 12.5, italic: true, color: INK, align: "center" });
foot(s, 10);

// 10 RECOMENDAÇÃO
s = p.addSlide(); bg(s, BG); kicker(s, "A recomendação"); title(s, "Piloto-first: barato, rápido, com dado no fim");
card(s, M, 1.95, 5.95, 4.5, { fill: NAVY });
s.addText("FAZER AGORA", { x: M + 0.4, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: TEAL });
[["Assinar como cliente (ROI positivo já)"], ["Financiar o piloto de R$ 300 mil"], ["Medir baseline + economia do gap"], ["Comitê mensal de ROI"]].forEach((tx, i) => {
  const y = 2.7 + i * 0.78; iconCircle(s, M + 0.4, y, 0.4, TEAL, "✓");
  s.addText(tx[0], { x: M + 0.95, y: y - 0.04, w: 4.55, h: 0.55, fontFace: F, fontSize: 13.5, color: "FFFFFF", valign: "middle" });
});
s.addText("Adiar a rodada de R$ 1,5 mi até o piloto comprovar economia ≥ R$ 100 mil/mês.", { x: M + 0.4, y: 5.85, w: 5.2, h: 0.5, fontFace: F, fontSize: 12, italic: true, color: "9FB6D6" });
card(s, 6.78, 1.95, 5.95, 4.5);
s.addText("O enquadramento honesto", { x: 7.18, y: 2.2, w: 5.2, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: NAVY });
s.addText([
  { text: "Só com prepostos, a economia não pagaria R$ 1,5 mi rápido", options: { bold: true, color: INK } },
  { text: " (~40 meses). Por isso não se pede o cheque grande agora.\n\n", options: { color: MUT } },
  { text: "O piloto de R$ 300 mil se paga em meses", options: { bold: true, color: INK } },
  { text: " e prova o custo real do gap (sobrepreço + penalidade). ", options: { color: MUT } },
  { text: "Pior caso: a Coaph fica com uma contingência mais barata — sem arriscar R$ 1,5 mi.", options: { bold: true, color: BLUE } }],
  { x: 7.18, y: 2.65, w: 5.2, h: 3.6, fontFace: F, fontSize: 13.5, color: MUT, valign: "top", lineSpacingMultiple: 1.05 });
foot(s, 11);

// 11 UPSIDE / ESCALA
s = p.addSlide(); bg(s, BG); kicker(s, "Upside · escala (ofensiva)"); title(s, "Se replicar: um SaaS de contingência previsível");
const es = [["Ano 1", "R$ 226 mil", "1 cliente (Coaph)", MUT], ["Ano 2", "R$ 1,13 mi", "~5 cooperativas", BLUE], ["Ano 3", "R$ 3,38 mi", "~15 clientes", TEAL]];
es.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.1, 3.85, 2.6);
  s.addText(c[0], { x: x + 0.3, y: 2.3, w: 3.3, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: MUT });
  s.addText(c[1], { x: x + 0.3, y: 2.8, w: 3.3, h: 0.8, fontFace: F, fontSize: 32, bold: true, color: c[3] });
  s.addText(c[2], { x: x + 0.3, y: 3.75, w: 3.3, h: 0.5, fontFace: F, fontSize: 13, color: INK });
});
s.addText("Modesto e previsível — não um foguete de marketplace. A rodada de R$ 1,5 mi se dimensiona a este plano, após o piloto.",
  { x: M, y: 5.2, w: 12, h: 0.5, fontFace: F, fontSize: 14, italic: true, color: INK });
s.addText("🔹 Receita/cliente ≈ realista da Coaph. Comps: Nomad, Trusted, Medely, ShiftMed, Patchwork validam a categoria.",
  { x: M, y: 6.55, w: 12.13, h: 0.4, fontFace: F, fontSize: 11.5, italic: true, color: MUT });
foot(s, 12);

// 12 ROADMAP
s = p.addSlide(); bg(s, BG); kicker(s, "Roadmap"); title(s, "Do piloto à economia comprovada — e à escala");
const ph = [["0–6 m · Piloto", "R$ 300 mil", ["Hardening + LGPD", "Implantar contingência", "Baseline + economia", "Comitê mensal de ROI"], TEAL],
  ["6–18 m · Provar+abrir", "Coaph plena", ["Economia ≥ R$ 100 mil/mês", "Abrir 2ª cooperativa", "Case comprovado", "Preparar rodada plena"], BLUE],
  ["18–36 m · Escala", "Ofensiva", ["Mais cooperativas/hospitais", "Setor público", "Rodada seed/plena", "Tração real"], NAVY]];
ph.forEach((c, i) => {
  const x = M + i * 4.08; card(s, x, 2.0, 3.85, 4.4);
  s.addShape(p.ShapeType.roundRect, { x, y: 2.0, w: 3.85, h: 0.95, rectRadius: 0.08, fill: { color: c[3] } });
  s.addText(c[0], { x: x + 0.3, y: 2.12, w: 3.3, h: 0.35, fontFace: F, fontSize: 12.5, bold: true, color: "FFFFFF" });
  s.addText(c[1], { x: x + 0.3, y: 2.45, w: 3.3, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: "FFFFFF" });
  c[2].forEach((tx, j) => {
    const y = 3.2 + j * 0.78;
    s.addShape(p.ShapeType.ellipse, { x: x + 0.32, y: y + 0.04, w: 0.16, h: 0.16, fill: { color: c[3] } });
    s.addText(tx, { x: x + 0.62, y: y - 0.1, w: 3.05, h: 0.7, fontFace: F, fontSize: 12.5, color: INK, valign: "top" });
  });
});
foot(s, 13);

// 13 FECHAMENTO
s = p.addSlide(); bg(s, NAVY);
s.addShape(p.ShapeType.ellipse, { x: -2.2, y: 3.4, w: 6, h: 6, fill: { color: "0E315E" } });
s.addShape(p.ShapeType.ellipse, { x: 10.4, y: -2.4, w: 6.5, h: 6.5, fill: { color: "12386B" } });
s.addText("✚", { x: M, y: 1.7, w: 1, h: 1, fontFace: F, fontSize: 40, bold: true, color: TEAL });
s.addText("Resolver o gap agora,\nescalar a contingência depois", { x: M, y: 2.7, w: 11.5, h: 1.8, fontFace: F, fontSize: 36, bold: true, color: "FFFFFF", lineSpacingMultiple: 1.05 });
s.addText("Assine como cliente. Financie o piloto. Decida a rodada grande com dados.", { x: M, y: 4.7, w: 11, h: 0.6, fontFace: F, fontSize: 17, color: "CADCFC" });
s.addText([{ text: "HealthMatch", options: { bold: true, color: "FFFFFF" } }, { text: "   ·   Piloto R$ 300 mil   ·   Coaph · Fortaleza/CE   ·   2026", options: { color: "9FB6D6" } }],
  { x: M, y: 6.5, w: 12, h: 0.4, fontFace: F, fontSize: 13 });

p.writeFile({ fileName: "/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_Pitch_Deck.pptx" }).then((f) => console.log("pptx written:", f));
