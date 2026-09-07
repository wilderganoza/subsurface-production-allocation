"""Carga los seis pozos de ejemplo en el esquema spa de Supabase.

Son los datos reales que venian con la aplicacion, leidos de los Excel de
examples/. No hay nada inventado: produccion diaria, k h por arena y matriz de
intervenciones tal como estan en los archivos.
"""

import json
import sys
from datetime import date
from pathlib import Path

RAIZ = r"G:\Mi unidad\02. OIG\Subsurface Production Allocation\01. Codigo"
sys.path.insert(0, RAIZ)

SP = Path(__file__).parent

from sqlalchemy import text  # noqa: E402

from app.db.session import db_manager  # noqa: E402
from app.models.allocation import (  # noqa: E402
    InterventionCell, InterventionDate, ProductionRecord, SandProperty, Well,
)

datos = json.loads((SP / "pozos.json").read_text(encoding="utf-8"))

db_manager.initialize()

with db_manager.session() as db:
    # Vaciamos solo lo que vamos a recargar, no el esquema entero
    db.execute(text("truncate table wells restart identity cascade"))
    db.commit()

    resumen = []

    for clave in sorted(datos):
        pozo = datos[clave]

        # El nombre viene del numero de archivo, que es como se identifican
        w = Well(name=f"Pozo {clave}", decline_model="best_fit")
        db.add(w)
        db.flush()

        # Produccion diaria
        for r in pozo["production"]:
            db.add(ProductionRecord(
                well_id=w.id,
                date=date.fromisoformat(r["date"]),
                total_production=float(r["totalProduction"]),
            ))

        # Arenas con su k h
        for s in pozo["sands"]:
            db.add(SandProperty(well_id=w.id, sand_name=s["sandName"], kh=float(s["kh"])))

        # Matriz de intervenciones
        im = pozo["interventions"]
        fechas = [date.fromisoformat(f) for f in im["interventionDates"]]

        for orden, f in enumerate(fechas):
            db.add(InterventionDate(well_id=w.id, intervention_date=f, sort_order=orden))

        for i, arena in enumerate(im["sandNames"]):
            for j, f in enumerate(fechas):
                db.add(InterventionCell(
                    well_id=w.id, sand_name=arena, intervention_date=f,
                    is_open=bool(im["matrix"][i][j]),
                ))

        resumen.append((w.name, len(pozo["production"]), len(pozo["sands"]), len(fechas)))

    db.commit()

print(f"{'pozo':<10} {'dias':>6} {'arenas':>7} {'interv.':>8}")
print("-" * 34)
for nombre, dias, arenas, interv in resumen:
    print(f"{nombre:<10} {dias:>6} {arenas:>7} {interv:>8}")

# Comprobamos contra la base lo que quedo escrito
with db_manager.session() as db:
    for tabla in ("wells", "production_data", "sand_properties",
                  "intervention_dates", "intervention_matrix"):
        n = db.execute(text(f"select count(*) from {tabla}")).scalar()
        print(f"{tabla:<22} {n:>8,} filas")
