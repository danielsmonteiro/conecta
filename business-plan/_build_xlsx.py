from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

BLUE = Font(name="Arial", color="0000FF", size=10)            # inputs
BLACK = Font(name="Arial", color="000000", size=10)           # formulas
GREEN = Font(name="Arial", color="008000", size=10)           # cross-sheet links
BOLD = Font(name="Arial", color="000000", size=10, bold=True)
WHITE_BOLD = Font(name="Arial", color="FFFFFF", size=11, bold=True)
TITLE = Font(name="Arial", color="0B2D5B", size=15, bold=True)
SUB = Font(name="Arial", color="555555", size=9, italic=True)

NAVY = PatternFill("solid", fgColor="0B2D5B")
LBLUE = PatternFill("solid", fgColor="DCE6F1")
YEL = PatternFill("solid", fgColor="FFF2CC")
GREY = PatternFill("solid", fgColor="F2F2F2")

CUR = 'R$ #,##0;(R$ #,##0);"-"'
CUR_MM = 'R$ #,##0.0,, "mi";(R$ #,##0.0,, "mi");"-"'
PCT = '0.0%'
MULT = '0.0"x"'
NUM = '#,##0;(#,##0);"-"'
thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()

def hdr(ws, row, cols, labels, fill=NAVY, font=WHITE_BOLD):
    for i, lab in enumerate(labels):
        c = ws.cell(row=row, column=cols + i, value=lab)
        c.fill = fill; c.font = font
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDER

def setc(ws, coord, val, font=BLACK, fmt=None, fill=None, align=None, border=True):
    c = ws[coord]; c.value = val; c.font = font
    if fmt: c.number_format = fmt
    if fill: c.fill = fill
    if align: c.alignment = Alignment(horizontal=align, vertical="center")
    if border: c.border = BORDER
    return c

# ---------------------------------------------------------------- PREMISSAS
ws = wb.active; ws.title = "Premissas"
ws.sheet_view.showGridLines = False
setc(ws, "A1", "HealthMatch — Modelo Financeiro (Pre-seed)", TITLE, border=False)
setc(ws, "A2", "Azul = premissa editável · Preto = fórmula · Verde = link entre abas · Valores em R$ · Pré-lançamento: tudo é premissa de mercado", SUB, border=False)
ws.merge_cells("A1:F1"); ws.merge_cells("A2:G2")

setc(ws, "A4", "Premissas globais", BOLD, fill=LBLUE)
ws.merge_cells("A4:C4")
glob = [
    ("Ticket médio por plantão (GMV)", 1300, CUR),
    ("ARPA SaaS (mensal por conta)", 4000, CUR),
    ("Margem bruta (blended)", 0.68, PCT),
    ("Meses por ano", 12, NUM),
]
r = 5
for name, val, fmt in glob:
    setc(ws, f"A{r}", name, BLACK)
    setc(ws, f"B{r}", val, BLUE, fmt, fill=YEL)
    r += 1
# named refs by row
TICKET, ARPA, GM, MESES = "Premissas!$B$5", "Premissas!$B$6", "Premissas!$B$7", "Premissas!$B$8"

setc(ws, "A11", "Drivers por cenário", BOLD, fill=LBLUE); ws.merge_cells("A11:G11")
hdr(ws, 12, 1, ["Driver", "Cenário", "Ano 1", "Ano 2", "Ano 3"])
# scenario blocks: plantões/mês média, take-rate, contas SaaS média
rows_def = [
    ("Plantões/mês (média)", "Conservador", 400, 2200, 6000, NUM),
    ("Plantões/mês (média)", "Realista",    800, 4500, 12000, NUM),
    ("Plantões/mês (média)", "Otimista",    1300, 8000, 22000, NUM),
    ("Take-rate (% do GMV)", "Conservador", 0.05, 0.05, 0.05, PCT),
    ("Take-rate (% do GMV)", "Realista",    0.07, 0.07, 0.07, PCT),
    ("Take-rate (% do GMV)", "Otimista",    0.08, 0.08, 0.08, PCT),
    ("Contas SaaS (média ano)", "Conservador", 2.5, 11.25, 35.42, '#,##0.0'),
    ("Contas SaaS (média ano)", "Realista",    4.5, 22.5, 70.0, '#,##0.0'),
    ("Contas SaaS (média ano)", "Otimista",    7.5, 39.58, 120.83, '#,##0.0'),
]
r = 13
for name, scen, y1, y2, y3, fmt in rows_def:
    setc(ws, f"A{r}", name, BLACK)
    setc(ws, f"B{r}", scen, BLACK)
    setc(ws, f"C{r}", y1, BLUE, fmt, fill=YEL)
    setc(ws, f"D{r}", y2, BLUE, fmt, fill=YEL)
    setc(ws, f"E{r}", y3, BLUE, fmt, fill=YEL)
    r += 1
# row map: plantões cons=13 real=14 otim=15; take cons=16 real=17 otim=18; contas cons=19 real=20 otim=21

setc(ws, "A23", "Opex — cenário Realista (R$/ano)", BOLD, fill=LBLUE); ws.merge_cells("A23:E23")
hdr(ws, 24, 1, ["Linha", "", "Ano 1", "Ano 2", "Ano 3"])
opex = [
    ("Pessoal", 1100000, 2400000, 4800000),
    ("Marketing & Vendas", 150000, 600000, 1800000),
    ("Infra & ferramentas", 120000, 300000, 700000),
    ("G&A / jurídico / contábil", 120000, 300000, 700000),
]
r = 25
for name, y1, y2, y3 in opex:
    setc(ws, f"A{r}", name, BLACK)
    setc(ws, f"C{r}", y1, BLUE, CUR, fill=YEL)
    setc(ws, f"D{r}", y2, BLUE, CUR, fill=YEL)
    setc(ws, f"E{r}", y3, BLUE, CUR, fill=YEL)
    r += 1
# opex rows: pessoal25 mkt26 infra27 ga28
setc(ws, "A29", "Opex total", BOLD)
for col in ("C", "D", "E"):
    setc(ws, f"{col}29", f"=SUM({col}25:{col}28)", BOLD, CUR, fill=GREY)

for col, w in zip("ABCDEFG", [30, 14, 14, 14, 14, 4, 4]):
    ws.column_dimensions[col].width = w

# ---------------------------------------------------------------- CENÁRIOS
ws2 = wb.create_sheet("Cenários")
ws2.sheet_view.showGridLines = False
setc(ws2, "A1", "Projeção de receita — 3 cenários", TITLE, border=False); ws2.merge_cells("A1:F1")
setc(ws2, "A2", "Receita líquida = Take-rate sobre GMV + Receita SaaS. GMV = plantões × ticket. (links em verde puxam da aba Premissas)", SUB, border=False)
ws2.merge_cells("A2:G2")

scen_map = {"Conservador": (13, 16, 19), "Realista": (14, 17, 20), "Otimista": (15, 18, 21)}
row = 4
anchor = {}
for scen, (pr, tr, ar) in scen_map.items():
    setc(ws2, f"A{row}", scen, WHITE_BOLD, fill=NAVY); ws2.merge_cells(f"A{row}:D{row}")
    hdr(ws2, row + 1, 1, ["Métrica", "Ano 1", "Ano 2", "Ano 3"], fill=LBLUE, font=BOLD)
    base = row + 2
    # GMV = plantões/mês * meses * ticket
    setc(ws2, f"A{base}", "GMV (R$)", BLACK)
    for i, col in enumerate(["B", "C", "D"]):
        pcol = ["C", "D", "E"][i]
        setc(ws2, f"{col}{base}", f"=Premissas!{pcol}{pr}*{MESES}*{TICKET}", GREEN, CUR)
    # Take-rate revenue
    setc(ws2, f"A{base+1}", "Receita de fee (take-rate)", BLACK)
    for i, col in enumerate(["B", "C", "D"]):
        pcol = ["C", "D", "E"][i]
        setc(ws2, f"{col}{base+1}", f"={col}{base}*Premissas!{pcol}{tr}", BLACK, CUR)
    # SaaS revenue = contas * ARPA * meses
    setc(ws2, f"A{base+2}", "Receita SaaS (assinatura)", BLACK)
    for i, col in enumerate(["B", "C", "D"]):
        pcol = ["C", "D", "E"][i]
        setc(ws2, f"{col}{base+2}", f"=Premissas!{pcol}{ar}*{ARPA}*{MESES}", GREEN, CUR)
    # Total net revenue
    setc(ws2, f"A{base+3}", "Receita líquida total", BOLD)
    for col in ["B", "C", "D"]:
        setc(ws2, f"{col}{base+3}", f"={col}{base+1}+{col}{base+2}", BOLD, CUR, fill=GREY)
    anchor[scen] = base + 3
    row = base + 5

# summary table
setc(ws2, "A24", "Resumo — Receita líquida por cenário", BOLD, fill=LBLUE); ws2.merge_cells("A24:D24")
hdr(ws2, 25, 1, ["Cenário", "Ano 1", "Ano 2", "Ano 3"], fill=LBLUE, font=BOLD)
rr = 26
for scen in ["Conservador", "Realista", "Otimista"]:
    a = anchor[scen]
    setc(ws2, f"A{rr}", scen, BLACK)
    for col in ["B", "C", "D"]:
        setc(ws2, f"{col}{rr}", f"={col}{a}", BLACK, CUR_MM)
    rr += 1

for col, w in zip("ABCDE", [30, 16, 16, 16, 4]):
    ws2.column_dimensions[col].width = w

# realista anchor rows for DRE link
REAL_BASE = scen_map  # placeholder
real_anchor = anchor["Realista"]  # total revenue row for realista
# we also need GMV row of realista = real_anchor-3
REAL_GMV = real_anchor - 3
REAL_REV = real_anchor

# ---------------------------------------------------------------- DRE
ws3 = wb.create_sheet("DRE (Realista)")
ws3.sheet_view.showGridLines = False
setc(ws3, "A1", "DRE — cenário Realista", TITLE, border=False); ws3.merge_cells("A1:E1")
setc(ws3, "A2", "Demonstração resumida. COGS via margem bruta (premissa). Opex puxado da aba Premissas.", SUB, border=False)
ws3.merge_cells("A2:E2")
hdr(ws3, 4, 1, ["Linha (R$)", "Ano 1", "Ano 2", "Ano 3"])
# revenue links to Cenários realista
setc(ws3, "A5", "Receita líquida", BLACK)
for col, ccol in zip(["B", "C", "D"], ["B", "C", "D"]):
    setc(ws3, f"{col}5", f"='Cenários'!{ccol}{REAL_REV}", GREEN, CUR)
setc(ws3, "A6", "(–) COGS", BLACK)
for col in ["B", "C", "D"]:
    setc(ws3, f"{col}6", f"=-{col}5*(1-{GM})", BLACK, CUR)
setc(ws3, "A7", "Lucro bruto", BOLD)
for col in ["B", "C", "D"]:
    setc(ws3, f"{col}7", f"={col}5+{col}6", BOLD, CUR, fill=GREY)
setc(ws3, "A8", "Margem bruta %", BLACK)
for col in ["B", "C", "D"]:
    setc(ws3, f"{col}8", f"={col}7/{col}5", BLACK, PCT)
# opex
setc(ws3, "A9", "(–) Pessoal", BLACK)
setc(ws3, "A10", "(–) Marketing & Vendas", BLACK)
setc(ws3, "A11", "(–) Infra & ferramentas", BLACK)
setc(ws3, "A12", "(–) G&A / jurídico", BLACK)
for col, pcol in zip(["B", "C", "D"], ["C", "D", "E"]):
    setc(ws3, f"{col}9", f"=-Premissas!{pcol}25", GREEN, CUR)
    setc(ws3, f"{col}10", f"=-Premissas!{pcol}26", GREEN, CUR)
    setc(ws3, f"{col}11", f"=-Premissas!{pcol}27", GREEN, CUR)
    setc(ws3, f"{col}12", f"=-Premissas!{pcol}28", GREEN, CUR)
setc(ws3, "A13", "Opex total", BOLD)
for col in ["B", "C", "D"]:
    setc(ws3, f"{col}13", f"=SUM({col}9:{col}12)", BOLD, CUR, fill=GREY)
setc(ws3, "A14", "EBITDA", WHITE_BOLD, fill=NAVY)
for col in ["B", "C", "D"]:
    c = setc(ws3, f"{col}14", f"={col}7+{col}13", WHITE_BOLD, CUR, fill=NAVY)
setc(ws3, "A15", "Margem EBITDA %", BLACK)
for col in ["B", "C", "D"]:
    setc(ws3, f"{col}15", f"={col}14/{col}5", BLACK, PCT)
for col, w in zip("ABCDE", [28, 16, 16, 16, 4]):
    ws3.column_dimensions[col].width = w

# ---------------------------------------------------------------- MÉTRICAS
ws4 = wb.create_sheet("Métricas")
ws4.sheet_view.showGridLines = False
setc(ws4, "A1", "Unit economics (visão SaaS-only, conservadora)", TITLE, border=False); ws4.merge_cells("A1:D1")
setc(ws4, "A2", "Visão SaaS-only para ser defensável. Economia blended (com take-rate) é maior, mas limitada por liquidez.", SUB, border=False)
ws4.merge_cells("A2:E2")
hdr(ws4, 4, 1, ["Métrica", "Valor", "Unidade"])
m = [
    ("ARPA (mensal)", f"={ARPA}", CUR, "R$/mês", "input"),
    ("Margem bruta SaaS", 0.80, PCT, "%", "blue"),
    ("CAC por conta institucional", 15000, CUR, "R$", "blue"),
    ("Churn anual (logo)", 0.12, PCT, "%", "blue"),
    ("Horizonte de LTV (cap)", 36, NUM, "meses", "blue"),
]
r = 5
for name, val, fmt, unit, kind in m:
    setc(ws4, f"A{r}", name, BLACK)
    if kind == "input":
        setc(ws4, f"B{r}", val, GREEN, fmt)
    else:
        setc(ws4, f"B{r}", val, BLUE, fmt, fill=YEL)
    setc(ws4, f"C{r}", unit, SUB)
    r += 1
# B5 ARPA, B6 GM saas, B7 CAC, B8 churn, B9 cap
setc(ws4, "A11", "Resultados", BOLD, fill=LBLUE); ws4.merge_cells("A11:C11")
setc(ws4, "A12", "Churn mensal", BLACK); setc(ws4, "B12", "=1-(1-B8)^(1/12)", BLACK, PCT)
setc(ws4, "A13", "Contribuição mensal/conta", BLACK); setc(ws4, "B13", "=B5*B6", BLACK, CUR)
setc(ws4, "A14", "LTV (36m, capado)", BOLD); setc(ws4, "B14", "=B13*B9", BOLD, CUR, fill=GREY)
setc(ws4, "A15", "LTV / CAC", WHITE_BOLD, fill=NAVY); setc(ws4, "B15", "=B14/B7", WHITE_BOLD, MULT, fill=NAVY)
setc(ws4, "A16", "Payback de CAC (meses)", BOLD); setc(ws4, "B16", "=B7/B13", BOLD, '#,##0.0', fill=GREY)
setc(ws4, "A18", "CAC de profissionais (oferta) na âncora", BLACK); setc(ws4, "B18", 0, BLUE, CUR, fill=YEL)
setc(ws4, "C18", "≈ R$ 0 — base de 55k cooperados pré-existente", SUB)
for col, w in zip("ABCD", [32, 16, 28, 4]):
    ws4.column_dimensions[col].width = w

# ---------------------------------------------------------------- USO DOS RECURSOS
ws5 = wb.create_sheet("Uso dos Recursos")
ws5.sheet_view.showGridLines = False
setc(ws5, "A1", "Uso dos recursos — Pre-seed", TITLE, border=False); ws5.merge_cells("A1:D1")
setc(ws5, "A3", "Captação total (R$)", BOLD); setc(ws5, "B3", 1500000, BLUE, CUR, fill=YEL)
hdr(ws5, 5, 1, ["Destino", "%", "Valor (R$)"])
uf = [
    ("Produto & Engenharia", 0.55),
    ("GTM (Vendas & Marketing)", 0.18),
    ("Infra & COGS iniciais", 0.10),
    ("Jurídico / Compliance / LGPD", 0.09),
    ("Reserva / contingência", 0.08),
]
r = 6
for name, pct in uf:
    setc(ws5, f"A{r}", name, BLACK)
    setc(ws5, f"B{r}", pct, BLUE, PCT, fill=YEL)
    setc(ws5, f"C{r}", f"=$B$3*B{r}", BLACK, CUR)
    r += 1
setc(ws5, f"A{r}", "Total", BOLD)
setc(ws5, f"B{r}", f"=SUM(B6:B{r-1})", BOLD, PCT, fill=GREY)
setc(ws5, f"C{r}", f"=SUM(C6:C{r-1})", BOLD, CUR, fill=GREY)
setc(ws5, f"A{r+2}", "Runway-alvo (meses)", BLACK); setc(ws5, f"B{r+2}", 20, BLUE, NUM, fill=YEL)
setc(ws5, f"A{r+3}", "Burn médio Ano 1 (DRE)", BLACK)
setc(ws5, f"B{r+3}", "='DRE (Realista)'!B14", GREEN, CUR)
for col, w in zip("ABCD", [34, 12, 18, 4]):
    ws5.column_dimensions[col].width = w

wb.save("/Users/daniel/Projects/HealthMatch/business-plan/HealthMatch_Modelo_Financeiro.xlsx")
print("saved")
