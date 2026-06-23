const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign } = require("./node_modules/docx");

const NAVY = "0B2D5B", BLUE = "0B74D1", LIGHT = "DCE6F1", GREY = "F2F2F2", TEAL = "0E7C66", ACCENT = "1F6FB2";
const F = "Arial";
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
const cm = { top: 40, bottom: 40, left: 90, right: 90 };

function cell(v, w, o = {}) {
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: cm, verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: o.align, spacing: { after: 0, line: 224 },
      children: [new TextRun({ text: v, font: F, size: o.size ?? 16, bold: o.bold, color: o.color })] })] });
}
function tbl(widths, head, rows, hsize = 16) {
  const trs = [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { bold: true, color: "FFFFFF", fill: NAVY, align: AlignmentType.CENTER, size: hsize })) })];
  rows.forEach((r, ri) => trs.push(new TableRow({ children: r.map((c, i) => {
    const o = typeof c === "object" ? c : { v: c };
    return cell(o.v, widths[i], { bold: o.bold, fill: o.fill ?? (ri % 2 ? GREY : undefined), color: o.color, align: o.align });
  }) })));
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: trs, borders });
}
function h(text) { return new Paragraph({ spacing: { before: 150, after: 60 }, children: [new TextRun({ text, font: F, size: 19, bold: true, color: NAVY })] }); }
function pp(runs, after = 70) { return new Paragraph({ spacing: { after, line: 240 }, children: runs }); }
function t(text, o = {}) { return new TextRun({ text, font: F, size: o.size ?? 18, bold: o.bold, color: o.color, italics: o.i }); }
function bul(text) { return new Paragraph({ bullet: { level: 0 }, spacing: { after: 30, line: 232 }, children: [new TextRun({ text, font: F, size: 18 })] }); }

const children = [
  // Title
  new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "HealthMatch", font: F, size: 34, bold: true, color: NAVY })] }),
  new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: BLUE, space: 4 } },
    children: [new TextRun({ text: "Resumo executivo para a Diretoria da Coaph", font: F, size: 22, color: BLUE }),
               new TextRun({ text: "   ·   Junho 2026   ·   Confidencial", font: F, size: 16, color: "888888" })] }),
  // Decision box
  new Paragraph({ spacing: { before: 40, after: 100, line: 248 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 8 } },
    shading: { fill: "EEF4FA", type: ShadingType.CLEAR },
    children: [t("A decisão: ", { bold: true, color: NAVY }),
      t("investir R$ 1,5 mi (trancheado) no HealthMatch como software de automação operacional — justificado pela redução do custo de prepostos da Coaph (~R$ 240 mil/mês), independentemente de escala externa. A expansão para outras cooperativas, hospitais e setor público é upside opcional.")] }),

  h("O custo que atacamos"),
  pp([t("A Coaph gasta hoje "), t("~R$ 240 mil/mês (R$ 2,88 mi/ano)", { bold: true }), t(" com prepostos na gestão manual de plantões, escalas, contatos, confirmações e conciliação financeira. O HealthMatch automatiza esse fluxo: matching, abordagem por IA no WhatsApp, confirmações e financeiro — reduzindo horas manuais e, com redesenho do processo, o custo.")]),

  h("Tese defensiva — payback só com a economia interna"),
  tbl([2400, 1500, 1700, 1600, 1400], ["Cenário", "Economia", "Economia/ano", "Payback", "ROI anual"], [
    [{ v: "Conservador (base)", bold: true }, "25%", "R$ 720 mil", "~25 meses", "48%"],
    [{ v: "Realista", bold: true, fill: LIGHT }, { v: "50%", fill: LIGHT }, { v: "R$ 1,44 mi", fill: LIGHT, bold: true }, { v: "~12,5 meses", fill: LIGHT, bold: true }, { v: "96%", fill: LIGHT }],
    [{ v: "Otimista", bold: true }, "75%", "R$ 2,16 mi", "~8,3 meses", "144%"],
  ]),
  new Paragraph({ spacing: { before: 50, after: 80, line: 224 }, children: [
    t("100% (R$ 2,88 mi/ano, payback ~6,3 m) é teto teórico — não é premissa. Base de defesa: 25% a 50%. Mesmo no conservador, o aporte se paga em ~2 anos sem nenhum cliente externo.", { size: 15, i: true, color: "555555" })] }),

  h("Duas teses, separadas"),
  pp([t("Defensiva (base da decisão): ", { bold: true, color: NAVY }), t("reduzir o custo operacional da própria Coaph. "),
      t("Ofensiva (upside opcional): ", { bold: true, color: NAVY }), t("virar plataforma escalável (outras cooperativas, hospitais, setor público) — receita recorrente + take-rate. Não é premissa da decisão.")]),

  h("Condições para investir (todas obrigatórias)"),
  bul("Coaph assina contrato como cliente-âncora, separado do instrumento de investimento."),
  bul("Investimento trancheado — não desembolso único."),
  bul("Cada tranche liberada contra metas reais de adoção e economia comprovada."),
  bul("KPIs claros (custo de prepostos antes/depois, horas eliminadas, economia realizada) + comitê mensal Coaph + HealthMatch."),

  h("Tranches por resultado (total R$ 1,5 mi)"),
  tbl([1700, 1600, 5300], ["Tranche", "Valor", "Gatilho"], [
    [{ v: "Tranche 1", bold: true }, "R$ 300–500 mil", "Assinatura + início: piloto, implantação, hardening, LGPD, integrações"],
    [{ v: "Tranche 2", bold: true }, "~R$ 500 mil", "Economia comprovada ≥ R$ 50 mil/mês"],
    [{ v: "Tranche 3", bold: true }, "~R$ 600 mil", "Economia ≥ R$ 100 mil/mês (ou volume operacional equivalente)"],
  ]),

  new Paragraph({ spacing: { before: 160, after: 100, line: 252 },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    children: [t("  Recomendação: ", { bold: true, color: "FFFFFF" }),
      t("investir SE as condições acima forem atendidas. Para um investidor financeiro puro, ainda é cedo; para a Coaph, é racional — porque há uma economia concreta e mensurável sendo atacada, com downside limitado e upside aberto.  ", { color: "FFFFFF" })] }),
];

const doc = new Document({
  creator: "HealthMatch", title: "Resumo Coaph",
  styles: { default: { document: { run: { font: F, size: 18 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    children,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_OnePager_Coaph.docx", buf);
  console.log("onepager written", buf.length, "bytes");
});
