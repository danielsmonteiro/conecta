const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign } = require("./node_modules/docx");

const NAVY = "0B2D5B", BLUE = "0B74D1", LIGHT = "DCE6F1", GREY = "F2F2F2", ACCENT = "1F6FB2";
const F = "Arial";
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const cm = { top: 36, bottom: 36, left: 90, right: 90 };

function cell(v, w, o = {}) {
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: cm, verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: o.align, spacing: { after: 0, line: 220 },
      children: [new TextRun({ text: v, font: F, size: o.size ?? 15, bold: o.bold, color: o.color })] })] });
}
function tbl(widths, head, rows, hsize = 15) {
  const trs = [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { bold: true, color: "FFFFFF", fill: NAVY, align: AlignmentType.CENTER, size: hsize })) })];
  rows.forEach((r, ri) => trs.push(new TableRow({ children: r.map((c, i) => {
    const o = typeof c === "object" ? c : { v: c };
    return cell(o.v, widths[i], { bold: o.bold, fill: o.fill ?? (ri % 2 ? GREY : undefined), color: o.color, align: o.align });
  }) })));
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: trs, borders });
}
function h(text) { return new Paragraph({ spacing: { before: 130, after: 50 }, children: [new TextRun({ text, font: F, size: 18, bold: true, color: NAVY })] }); }
function pp(runs, after = 60) { return new Paragraph({ spacing: { after, line: 232 }, children: runs }); }
function t(text, o = {}) { return new TextRun({ text, font: F, size: o.size ?? 17, bold: o.bold, color: o.color, italics: o.i }); }
function bul(text) { return new Paragraph({ bullet: { level: 0 }, spacing: { after: 26, line: 226 }, children: [new TextRun({ text, font: F, size: 17 })] }); }

const children = [
  new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "HealthMatch", font: F, size: 32, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 110 }, border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: BLUE, space: 4 } },
    children: [new TextRun({ text: "Resumo para a Diretoria da Coaph", font: F, size: 21, color: BLUE }),
               new TextRun({ text: "   ·   Junho 2026   ·   Confidencial", font: F, size: 15, color: "888888" })] }),

  new Paragraph({ spacing: { before: 30, after: 90, line: 244 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
    shading: { fill: "EEF4FA", type: ShadingType.CLEAR },
    children: [t("A decisão: ", { bold: true, color: NAVY }),
      t("(1) assinar o HealthMatch como cliente — ROI positivo desde o 1º mês; e (2) financiar um piloto de R$ 300 mil (paga-se em ~2,6 meses) para comprovar a economia. A rodada de equity maior (R$ 1,5 mi) fica para depois do piloto, decidida com dados.")] }),

  h("O que o HealthMatch faz"),
  pp([t("É uma "), t("camada de contingência", { bold: true }), t(": cobre o "), t("gap", { bold: true }),
     t(" — plantão que não fecha, no-show, exceção de última hora. Não gerencia toda a escala; entra só quando o processo normal falha, cobrindo de um pool pronto, sem o sobrepreço da urgência e sem horas de telefonema.")]),

  h("Economia mensal da Coaph (realista)"),
  tbl([3100, 1500, 1500, 1500], ["Camada", "Conserv.", "Realista", "Otim."], [
    ["Tempo de preposto no gap", "R$ 25 mil", "R$ 38 mil", "R$ 50 mil"],
    ["Sobrepreço emergencial evitado", "R$ 35 mil", "R$ 53 mil", "R$ 88 mil"],
    ["Penalidade evitada", "R$ 29 mil", "R$ 43 mil", "R$ 72 mil"],
    [{ v: "Economia bruta/mês", bold: true, fill: LIGHT }, { v: "R$ 89 mil", bold: true, fill: LIGHT }, { v: "R$ 134 mil", bold: true, fill: LIGHT }, { v: "R$ 210 mil", bold: true, fill: LIGHT }],
    ["(–) pago ao HealthMatch", "(R$ 15 mil)", "(R$ 19 mil)", "(R$ 26 mil)"],
    [{ v: "Economia líquida/mês", bold: true }, { v: "R$ 74 mil", bold: true }, { v: "R$ 115 mil", bold: true }, { v: "R$ 184 mil", bold: true }],
  ]),
  new Paragraph({ spacing: { before: 44, after: 70, line: 220 }, children: [
    t("Sobrepreço e penalidade são as premissas de maior peso e mais incertas — o piloto existe para medi-las. Mesmo no conservador, o piloto se paga.", { size: 14, i: true, color: "555555" })] }),

  h("Payback do investimento"),
  tbl([3100, 1500, 1500, 1500], ["Investimento", "Conserv.", "Realista", "Otim."], [
    [{ v: "Piloto (R$ 300 mil) — agora", bold: true }, { v: "~4,1 m", bold: true, fill: LIGHT }, { v: "~2,6 m", bold: true, fill: LIGHT }, { v: "~1,6 m", bold: true, fill: LIGHT }],
    ["Rodada plena (R$ 1,5 mi) — depois", "~20 m", "~13 m", "~8 m"],
  ]),

  h("Monetização (margem da cooperativa < 5%)"),
  pp([t("SaaS de prontidão R$ 8 mil/mês", { bold: true }), t(" (acesso ao pool) + "),
     t("fee por gap capado em ≤ 2%", { bold: true }), t(" do plantão (≈ R$ 24 num plantão médico de R$ 1.200). Take-rate gordo sobre GMV não se aplica.")]),

  h("Por que piloto-first"),
  bul("Como projeto de eficiência puro, a economia de prepostos sozinha não pagaria R$ 1,5 mi rápido (~40 meses)."),
  bul("O piloto de R$ 300 mil valida o custo real do gap e se paga em meses — risco baixo, aprendizado alto."),
  bul("A rodada de R$ 1,5 mi só se justifica pela escala (outras cooperativas) — decisão separada, com dados do piloto."),

  new Paragraph({ spacing: { before: 130, after: 90, line: 244 }, shading: { fill: NAVY, type: ShadingType.CLEAR },
    children: [t("  Recomendação: ", { bold: true, color: "FFFFFF" }),
      t("assinar como cliente e financiar o piloto de R$ 300 mil agora. Adiar a rodada de R$ 1,5 mi até o piloto comprovar economia ≥ R$ 100 mil/mês. Pior caso: o piloto se paga e a Coaph fica com uma contingência mais barata — sem arriscar R$ 1,5 mi.  ", { color: "FFFFFF" })] }),
];

const doc = new Document({
  creator: "HealthMatch", title: "Resumo Coaph",
  styles: { default: { document: { run: { font: F, size: 17 } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } }, children }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_OnePager_Coaph.docx", buf);
  console.log("onepager written", buf.length, "bytes");
});
