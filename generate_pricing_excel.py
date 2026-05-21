import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.series import SeriesLabel

# ── Palette ──────────────────────────────────────────────────────────────────
DARK_BLUE   = "1A1D27"
MID_BLUE    = "4A7CFF"
LIGHT_BLUE  = "D6E4FF"
GREEN       = "10B981"
LIGHT_GREEN = "D1FAE5"
AMBER       = "FBBF24"
LIGHT_AMBER = "FEF3C7"
WHITE       = "FFFFFF"
GRAY_LIGHT  = "F5F7FA"
GRAY_MED    = "E8EBF3"
GRAY_TEXT   = "6B7280"

def border(thick=False):
    s = "medium" if thick else "thin"
    side = Side(style=s, color="D1D5DB")
    return Border(left=side, right=side, top=side, bottom=side)

def header_font(size=11, bold=True, color=WHITE):
    return Font(name="Calibri", bold=bold, size=size, color=color)

def body_font(size=10, bold=False, color="1A1D27"):
    return Font(name="Calibri", bold=bold, size=size, color=color)

def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def center(wrap=False):
    return Alignment(horizontal="center", vertical="center", wrap_text=wrap)

def left(wrap=False):
    return Alignment(horizontal="left", vertical="center", wrap_text=wrap)

def right():
    return Alignment(horizontal="right", vertical="center")


def style_header_row(ws, row, col_start, col_end, bg=DARK_BLUE, font_color=WHITE, height=28):
    ws.row_dimensions[row].height = height
    for col in range(col_start, col_end + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = fill(bg)
        cell.font = header_font(color=font_color)
        cell.alignment = center(wrap=True)
        cell.border = border()


def merge_title(ws, row, col_start, col_end, text, bg=MID_BLUE, font_size=13):
    ws.merge_cells(start_row=row, start_column=col_start,
                   end_row=row, end_column=col_end)
    cell = ws.cell(row=row, column=col_start, value=text)
    cell.font = Font(name="Calibri", bold=True, size=font_size, color=WHITE)
    cell.fill = fill(bg)
    cell.alignment = center()
    cell.border = border(thick=True)
    ws.row_dimensions[row].height = 32


def set_col_widths(ws, widths):
    for col_idx, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = w


# ─────────────────────────────────────────────────────────────────────────────
wb = openpyxl.Workbook()
wb.remove(wb.active)   # remove default sheet


# ══════════════════════════════════════════════════════════════════════════════
# HOJA 1: Planes de Precios
# ══════════════════════════════════════════════════════════════════════════════
ws1 = wb.create_sheet("Planes de Precios")
set_col_widths(ws1, [24, 18, 18, 18, 22])

# Title
merge_title(ws1, 1, 1, 5,
            "SUBSURFACE PRODUCTION ALLOCATION — Planes de Precios (USD)")

# ── Sub-sección: tarjetas de plan ──
PLANS = [
    {
        "name": "Explorer",
        "wells": 10,
        "monthly": 299,
        "quarterly": 269,
        "annual": 239,
        "per_well": 30,
        "color": GREEN,
        "light": LIGHT_GREEN,
    },
    {
        "name": "Professional ★",
        "wells": 50,
        "monthly": 999,
        "quarterly": 899,
        "annual": 799,
        "per_well": 20,
        "color": MID_BLUE,
        "light": LIGHT_BLUE,
    },
    {
        "name": "Enterprise",
        "wells": 200,
        "monthly": 2999,
        "quarterly": 2699,
        "annual": 2399,
        "per_well": 15,
        "color": AMBER,
        "light": LIGHT_AMBER,
    },
]

headers = ["Característica", "Explorer", "Professional ★", "Enterprise"]
row = 3
style_header_row(ws1, row, 1, 4, bg=DARK_BLUE)
for c, h in enumerate(headers, 1):
    ws1.cell(row=row, column=c, value=h)

rows_data = [
    ("Pozos activos máx.",      "10",       "50",        "200"),
    ("Precio / mes (mensual)",  "USD 299",  "USD 999",   "USD 2,999"),
    ("Precio / mes (trim.)",    "USD 269",  "USD 899",   "USD 2,699"),
    ("Precio / mes (anual)",    "USD 239",  "USD 799",   "USD 2,399"),
    ("Total trimestral",        "USD 807",  "USD 2,697", "USD 8,097"),
    ("Total anual",             "USD 2,868","USD 9,588", "USD 28,788"),
    ("Precio / pozo / mes",     "USD 30",   "USD 20",    "USD 15"),
    ("Descuento trimestral",    "10%",      "10%",       "10%"),
    ("Descuento anual",         "20%",      "20%",       "20%"),
    ("Usuarios",                "2",        "Ilimitados","Ilimitados"),
    ("Exportación Excel",       "✓",        "✓",         "✓"),
    ("Usuarios ilimitados",     "—",        "✓",         "✓"),
    ("API Access",              "—",        "—",         "✓"),
    ("SLA garantizado",         "—",        "—",         "99.5%"),
    ("Soporte",                 "Email 48h","Prior. 24h","24/7"),
    ("Gerente de cuenta",       "—",        "—",         "✓"),
]

for i, (feat, ex, pro, ent) in enumerate(rows_data, start=1):
    r = row + i
    ws1.row_dimensions[r].height = 20
    bg_row = GRAY_LIGHT if i % 2 == 0 else WHITE

    for c, val in enumerate([feat, ex, pro, ent], 1):
        cell = ws1.cell(row=r, column=c, value=val)
        cell.font = body_font(bold=(c == 1))
        cell.alignment = center() if c > 1 else left()
        cell.border = border()
        if c == 1:
            cell.fill = fill(GRAY_MED)
        elif c == 2:
            cell.fill = fill(LIGHT_GREEN if i % 2 == 0 else "E8FDF5")
        elif c == 3:
            cell.fill = fill(LIGHT_BLUE if i % 2 == 0 else "EBF3FF")
        elif c == 4:
            cell.fill = fill(LIGHT_AMBER if i % 2 == 0 else "FFFBEB")

# Note row
note_row = row + len(rows_data) + 1
ws1.merge_cells(start_row=note_row, start_column=1, end_row=note_row, end_column=4)
note = ws1.cell(row=note_row, column=1,
                value="★ Plan recomendado  |  Todos los precios en USD  |  IVA no incluido")
note.font = Font(name="Calibri", italic=True, size=9, color=GRAY_TEXT)
note.alignment = center()
note.fill = fill(GRAY_LIGHT)
ws1.row_dimensions[note_row].height = 18


# ══════════════════════════════════════════════════════════════════════════════
# HOJA 2: Costo por Pozo
# ══════════════════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("Costo por Pozo")
set_col_widths(ws2, [14, 20, 22, 20, 26])

merge_title(ws2, 1, 1, 5, "COSTO POR POZO SEGÚN NÚMERO DE POZOS ACTIVOS (USD/pozo/mes)")

section_titles = [
    ("Plan Explorer — hasta 10 pozos", GREEN,  LIGHT_GREEN),
    ("Plan Professional — hasta 50 pozos", MID_BLUE, LIGHT_BLUE),
    ("Plan Enterprise — hasta 200 pozos", AMBER, LIGHT_AMBER),
]

explorer_rows = [
    (1,  299, 807, 2868),
    (3,  299, 807, 2868),
    (5,  299, 807, 2868),
    (8,  299, 807, 2868),
    (10, 299, 807, 2868),
]
professional_rows = [
    (10, 999, 2697, 9588),
    (20, 999, 2697, 9588),
    (30, 999, 2697, 9588),
    (40, 999, 2697, 9588),
    (50, 999, 2697, 9588),
]
enterprise_rows = [
    (50,  2999, 8097, 28788),
    (80,  2999, 8097, 28788),
    (100, 2999, 8097, 28788),
    (150, 2999, 8097, 28788),
    (200, 2999, 8097, 28788),
]
all_plan_rows = [explorer_rows, professional_rows, enterprise_rows]

r = 3
for idx, (sec_title, sec_color, sec_light) in enumerate(section_titles):
    # Section header
    ws2.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
    c = ws2.cell(row=r, column=1, value=sec_title)
    c.font = Font(name="Calibri", bold=True, size=11, color=WHITE)
    c.fill = fill(sec_color)
    c.alignment = left()
    c.border = border(thick=True)
    ws2.row_dimensions[r].height = 24
    r += 1

    # Column headers
    col_headers = ["N° Pozos", "Mensual (USD)", "Trimestral total (USD)",
                   "Anual total (USD)", "USD/pozo/mes (ciclo anual)"]
    style_header_row(ws2, r, 1, 5, bg=DARK_BLUE)
    for ci, h in enumerate(col_headers, 1):
        ws2.cell(row=r, column=ci, value=h)
    r += 1

    for wells, monthly, quarterly, annual in all_plan_rows[idx]:
        cost_per_well = round(annual / 12 / wells, 2)
        row_bg = sec_light if (r % 2 == 0) else WHITE
        for ci, val in enumerate(
            [wells, f"USD {monthly:,}", f"USD {quarterly:,}",
             f"USD {annual:,}", f"USD {cost_per_well:.2f}"], 1
        ):
            cell = ws2.cell(row=r, column=ci, value=val)
            cell.font = body_font()
            cell.alignment = center()
            cell.fill = fill(row_bg)
            cell.border = border()
        ws2.row_dimensions[r].height = 20
        r += 1

    r += 1  # blank between sections


# ══════════════════════════════════════════════════════════════════════════════
# HOJA 3: Proyección de Ingresos
# ══════════════════════════════════════════════════════════════════════════════
ws3 = wb.create_sheet("Proyección de Ingresos")
set_col_widths(ws3, [20, 14, 14, 14, 16, 16, 16, 18])

merge_title(ws3, 1, 1, 8, "PROYECCIÓN DE INGRESOS A 3 AÑOS (USD) — Mix: 60% Explorer / 30% Professional / 10% Enterprise")

# ── Tabla detallada por año ──
years = [
    {
        "label": "Año 1 — Lanzamiento (15 clientes)",
        "rows": [
            ("Explorer",     9, 284, 2556),
            ("Professional", 4, 949, 3796),
            ("Enterprise",   2, 2849, 5698),
        ],
        "total_clients": 15,
        "mrr": 12050,
        "arr": 144600,
        "infra": 540,
        "net": 144060,
        "color": GREEN,
        "light": LIGHT_GREEN,
    },
    {
        "label": "Año 2 — Crecimiento (40 clientes)",
        "rows": [
            ("Explorer",     24, 284, 6816),
            ("Professional", 12, 949, 11388),
            ("Enterprise",    4, 2849, 11396),
        ],
        "total_clients": 40,
        "mrr": 29600,
        "arr": 355200,
        "infra": 720,
        "net": 354480,
        "color": MID_BLUE,
        "light": LIGHT_BLUE,
    },
    {
        "label": "Año 3 — Escala (90 clientes)",
        "rows": [
            ("Explorer",     54, 284, 15336),
            ("Professional", 27, 949, 25623),
            ("Enterprise",    9, 2849, 25641),
        ],
        "total_clients": 90,
        "mrr": 66600,
        "arr": 799200,
        "infra": 1104,
        "net": 798096,
        "color": AMBER,
        "light": LIGHT_AMBER,
    },
]

col_h = ["Plan", "Clientes", "Precio/mes prom.", "MRR (USD)",
         "ARR (USD)", "Infra/año (USD)", "Ingreso neto (USD)", "Margen bruto"]

r = 3
for yr in years:
    # Year label
    ws3.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
    c = ws3.cell(row=r, column=1, value=yr["label"])
    c.font = Font(name="Calibri", bold=True, size=11, color=WHITE)
    c.fill = fill(yr["color"])
    c.alignment = left()
    c.border = border(thick=True)
    ws3.row_dimensions[r].height = 26
    r += 1

    # Col headers
    style_header_row(ws3, r, 1, 8, bg=DARK_BLUE)
    for ci, h in enumerate(col_h, 1):
        ws3.cell(row=r, column=ci, value=h)
    r += 1

    for plan_name, clients, avg_price, mrr_contrib in yr["rows"]:
        arr_contrib = mrr_contrib * 12
        row_bg = yr["light"] if r % 2 == 0 else WHITE
        vals = [plan_name, clients, f"USD {avg_price:,}", f"USD {mrr_contrib:,}",
                f"USD {arr_contrib:,}", "—", "—", "—"]
        for ci, val in enumerate(vals, 1):
            cell = ws3.cell(row=r, column=ci, value=val)
            cell.font = body_font()
            cell.alignment = center() if ci > 1 else left()
            cell.fill = fill(row_bg)
            cell.border = border()
        ws3.row_dimensions[r].height = 20
        r += 1

    # Total row
    margin = round((yr["net"] / yr["arr"]) * 100, 1)
    total_vals = [
        "TOTAL", yr["total_clients"], "—",
        f"USD {yr['mrr']:,}", f"USD {yr['arr']:,}",
        f"USD {yr['infra']:,}", f"USD {yr['net']:,}", f"{margin}%"
    ]
    for ci, val in enumerate(total_vals, 1):
        cell = ws3.cell(row=r, column=ci, value=val)
        cell.font = Font(name="Calibri", bold=True, size=10, color=WHITE)
        cell.fill = fill(yr["color"])
        cell.alignment = center() if ci > 1 else left()
        cell.border = border(thick=True)
    ws3.row_dimensions[r].height = 22
    r += 2

# ── Resumen ejecutivo 3 años ──
merge_title(ws3, r, 1, 8, "RESUMEN EJECUTIVO — 3 AÑOS", bg=DARK_BLUE, font_size=12)
r += 1
style_header_row(ws3, r, 1, 8, bg=DARK_BLUE)
for ci, h in enumerate(["Año", "Clientes", "MRR", "ARR",
                         "Crecimiento ARR", "Infra/año", "Ingreso neto", "Margen"], 1):
    ws3.cell(row=r, column=ci, value=h)
r += 1

summary = [
    (1, 15,  12050,  144600,  "—",    540,   144060, "99.6%"),
    (2, 40,  29600,  355200, "+146%",  720,  354480, "99.8%"),
    (3, 90,  66600,  799200, "+125%", 1104,  798096, "99.9%"),
]
colors_yr = [LIGHT_GREEN, LIGHT_BLUE, LIGHT_AMBER]
for i, (yr, cl, mrr, arr, growth, infra, net, margin) in enumerate(summary):
    row_bg = colors_yr[i]
    vals = [f"Año {yr}", cl, f"USD {mrr:,}", f"USD {arr:,}",
            growth, f"USD {infra:,}", f"USD {net:,}", margin]
    for ci, val in enumerate(vals, 1):
        cell = ws3.cell(row=r, column=ci, value=val)
        cell.font = body_font(bold=(ci == 1))
        cell.fill = fill(row_bg)
        cell.alignment = center() if ci > 1 else left()
        cell.border = border()
    ws3.row_dimensions[r].height = 22
    r += 1


# ══════════════════════════════════════════════════════════════════════════════
# HOJA 4: Costos Operativos
# ══════════════════════════════════════════════════════════════════════════════
ws4 = wb.create_sheet("Costos Operativos")
set_col_widths(ws4, [28, 22, 18, 18, 18])

merge_title(ws4, 1, 1, 5, "COSTOS DE INFRAESTRUCTURA Y OPERACIÓN (USD)")

# Infra fija
merge_title(ws4, 3, 1, 5, "Infraestructura Fija (Render Cloud)", bg=DARK_BLUE, font_size=11)
style_header_row(ws4, 4, 1, 5, bg=DARK_BLUE)
for ci, h in enumerate(["Componente", "Plan Render", "Costo/mes", "Costo/año", "Notas"], 1):
    ws4.cell(row=4, column=ci, value=h)

infra_rows = [
    ("API Backend (Node.js)", "Starter 512 MB", 7, 84, "Escala a Standard con >20 clientes"),
    ("Base de datos PostgreSQL", "Starter 1 GB", 7, 84, "Escala a Pro con >50 clientes"),
    ("Frontend (React/Vite)", "Static Site Free", 0, 0, "CDN incluido en Render"),
    ("Dominio custom (.com)", "Registro externo", 2, 24, "Opcional"),
    ("SSL / HTTPS", "Incluido en Render", 0, 0, "Automático"),
    ("Monitoreo (Sentry)", "Free tier", 0, 0, "Hasta 5k errores/mes"),
]
for i, row_data in enumerate(infra_rows, 5):
    comp, plan, monthly, annual, note = row_data
    bg = GRAY_LIGHT if i % 2 == 0 else WHITE
    for ci, val in enumerate([comp, plan, f"USD {monthly}", f"USD {annual}", note], 1):
        cell = ws4.cell(row=i, column=ci, value=val)
        cell.font = body_font()
        cell.alignment = left() if ci in (1, 2, 5) else center()
        cell.fill = fill(bg)
        cell.border = border()
    ws4.row_dimensions[i].height = 20

# Total fila
total_r = 5 + len(infra_rows)
for ci, val in enumerate(["TOTAL FIJO/MES", "", "USD 16", "USD 192", ""], 1):
    cell = ws4.cell(row=total_r, column=ci, value=val)
    cell.font = Font(name="Calibri", bold=True, size=10, color=WHITE)
    cell.fill = fill(DARK_BLUE)
    cell.alignment = center() if ci > 1 else left()
    cell.border = border(thick=True)
ws4.row_dimensions[total_r].height = 22

# Infra escalada
r = total_r + 2
merge_title(ws4, r, 1, 5, "Costos Escalados por Número de Clientes", bg=MID_BLUE, font_size=11)
r += 1
style_header_row(ws4, r, 1, 5, bg=DARK_BLUE)
for ci, h in enumerate(["Rango de clientes", "Web Service", "Base de datos", "Total/mes", "Total/año"], 1):
    ws4.cell(row=r, column=ci, value=h)
r += 1

scaled_rows = [
    ("1 – 20 clientes",  "Starter  USD 7",   "Starter  USD 7",  "USD 14",  "USD 168"),
    ("21 – 50 clientes", "Standard USD 25",  "Standard USD 20", "USD 45",  "USD 540"),
    ("51 – 100 clientes","Standard USD 25",  "Pro  USD 65",     "USD 90",  "USD 1,080"),
    ("101+ clientes",    "Pro  USD 85",      "Pro  USD 65",     "USD 150", "USD 1,800"),
]
for i, (rng, ws_plan, db_plan, total_m, total_y) in enumerate(scaled_rows, r):
    bg = LIGHT_BLUE if i % 2 == 0 else WHITE
    for ci, val in enumerate([rng, ws_plan, db_plan, total_m, total_y], 1):
        cell = ws4.cell(row=i, column=ci, value=val)
        cell.font = body_font()
        cell.alignment = center() if ci > 1 else left()
        cell.fill = fill(bg)
        cell.border = border()
    ws4.row_dimensions[i].height = 20


# ══════════════════════════════════════════════════════════════════════════════
# HOJA 5: Métricas y Break-even
# ══════════════════════════════════════════════════════════════════════════════
ws5 = wb.create_sheet("Métricas y Break-even")
set_col_widths(ws5, [26, 30, 20, 20])

merge_title(ws5, 1, 1, 4, "MÉTRICAS CLAVE DE NEGOCIO Y PUNTO DE EQUILIBRIO")

# KPIs
merge_title(ws5, 3, 1, 4, "Métricas KPI Objetivo — Año 1", bg=DARK_BLUE, font_size=11)
style_header_row(ws5, 4, 1, 4, bg=DARK_BLUE)
for ci, h in enumerate(["Métrica", "Descripción", "Objetivo Año 1", "Referencia industria"], 1):
    ws5.cell(row=4, column=ci, value=h)

kpis = [
    ("MRR",           "Monthly Recurring Revenue",         "USD 12,050",  "> USD 10,000"),
    ("ARR",           "Annual Recurring Revenue",           "USD 144,600", "> USD 100,000"),
    ("Churn rate",    "% clientes que cancelan / mes",      "< 2%",        "2–5% SaaS B2B"),
    ("ARPU",          "Average Revenue Per User / mes",     "USD 803",     "USD 500–3,000"),
    ("LTV",           "ARPU / churn (vida media cliente)",  "USD 40,150",  "> USD 20,000"),
    ("CAC",           "Costo de adquisición por cliente",   "< USD 500",   "USD 200–1,000"),
    ("LTV:CAC ratio", "Eficiencia de adquisición",          "> 80:1",      "> 3:1 (mín.)"),
    ("Pozos/cliente", "Utilización promedio del plan",      "~15 pozos",   "Varía"),
    ("Margen bruto",  "Ingresos netos / ARR",               "> 99%",       "70–85% SaaS"),
]
for i, (metric, desc, target, benchmark) in enumerate(kpis, 5):
    bg = LIGHT_GREEN if i % 2 == 0 else WHITE
    for ci, val in enumerate([metric, desc, target, benchmark], 1):
        cell = ws5.cell(row=i, column=ci, value=val)
        cell.font = body_font(bold=(ci == 1))
        cell.alignment = left()
        cell.fill = fill(bg)
        cell.border = border()
    ws5.row_dimensions[i].height = 20

# Break-even
be_r = 5 + len(kpis) + 1
merge_title(ws5, be_r, 1, 4, "Punto de Equilibrio (Break-even)", bg=GREEN, font_size=11)
be_r += 1
style_header_row(ws5, be_r, 1, 4, bg=DARK_BLUE)
for ci, h in enumerate(["Escenario", "Costo fijo/mes", "Ingreso 1 cliente", "Break-even"], 1):
    ws5.cell(row=be_r, column=ci, value=h)
be_r += 1

be_rows = [
    ("Solo plan Explorer",      "USD 16", "USD 299",   "1 cliente"),
    ("Solo plan Professional",  "USD 16", "USD 999",   "1 cliente"),
    ("Solo plan Enterprise",    "USD 16", "USD 2,999", "1 cliente"),
    ("Mix 60/30/10 (prom.)",    "USD 16", "USD 803",   "1 cliente"),
]
for i, (esc, cost, income, be) in enumerate(be_rows, be_r):
    bg = LIGHT_AMBER if i % 2 == 0 else WHITE
    for ci, val in enumerate([esc, cost, income, be], 1):
        cell = ws5.cell(row=i, column=ci, value=val)
        cell.font = body_font(bold=(ci == 4))
        cell.alignment = center() if ci > 1 else left()
        cell.fill = fill(bg)
        cell.border = border()
    ws5.row_dimensions[i].height = 20

note_r = be_r + len(be_rows) + 1
ws5.merge_cells(start_row=note_r, start_column=1, end_row=note_r, end_column=4)
note = ws5.cell(row=note_r, column=1,
    value="El break-even operativo se alcanza con el primer cliente en cualquier plan. "
          "El modelo SaaS sobre Render tiene costos marginales prácticamente nulos.")
note.font = Font(name="Calibri", italic=True, size=9, color=GRAY_TEXT)
note.alignment = left(wrap=True)
note.fill = fill(GRAY_LIGHT)
note.border = border()
ws5.row_dimensions[note_r].height = 32

# Recomendaciones
rec_r = note_r + 2
merge_title(ws5, rec_r, 1, 4, "Recomendaciones Estratégicas", bg=MID_BLUE, font_size=11)
rec_r += 1

recs = [
    "1. Período de prueba 14 días sin tarjeta de crédito — reduce fricción en el sector O&G conservador.",
    "2. Descuento de lanzamiento 30% en plan anual para los primeros 10 clientes (testimoniales + cash flow).",
    "3. Precio ancla Enterprise (USD 2,999) hace que Professional (USD 999) parezca más accesible.",
    "4. Pre-seleccionar ciclo anual en el checkout mejora predictibilidad de ingresos.",
    "5. Upsell natural: cliente Explorer con >10 pozos tiene incentivo claro para subir a Professional.",
]
for i, rec in enumerate(recs, rec_r):
    ws5.merge_cells(start_row=i, start_column=1, end_row=i, end_column=4)
    cell = ws5.cell(row=i, column=1, value=rec)
    cell.font = body_font(size=10)
    cell.alignment = left(wrap=True)
    cell.fill = fill(LIGHT_BLUE if i % 2 == 0 else WHITE)
    cell.border = border()
    ws5.row_dimensions[i].height = 24


# ══════════════════════════════════════════════════════════════════════════════
# Save
# ══════════════════════════════════════════════════════════════════════════════
output_path = "/home/user/subsurface-production-allocation/Pricing_Revenue_Plan.xlsx"
wb.save(output_path)
print(f"Excel generado: {output_path}")
