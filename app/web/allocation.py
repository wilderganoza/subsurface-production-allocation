"""Ejecución de la asignación de producción y presentación de resultados."""

# Importamos las librerias necesarias
import json  # Para serializar los datos del gráfico
from collections import defaultdict  # Para agregar por arena
from typing import Any, Dict, List  # Tipos

from fastapi import APIRouter, Depends, Request  # Router y dependencias
from fastapi.responses import HTMLResponse  # Respuestas HTML
from sqlalchemy.orm import Session  # Sesión de base de datos

from app.core.deps import get_current_user  # Sesión obligatoria
from app.core.logging import get_logger  # Para registrar las ejecuciones
from app.db.session import get_db  # Dependencia de sesión
from app.models.allocation import (  # Modelos del dominio
    AllocationResult, InterventionCell, InterventionDate, ProductionRecord, SandProperty, Well,
)
from app.services.allocation_engine import allocate_production  # Motor de asignación
from app.web.templating import page_context, templates  # Plantillas

# Creamos el logger de este módulo
logger = get_logger(__name__)

# Creamos el router de asignación
router = APIRouter(prefix="/allocation")


# Componemos las tres entradas que el motor necesita, desde la base
def _build_inputs(db: Session, well_id: int) -> Dict[str, Any]:
    # Histórico de producción, en orden cronológico
    production = [
        {"date": r.date.isoformat(), "totalProduction": r.total_production}
        for r in db.query(ProductionRecord)
        .filter(ProductionRecord.well_id == well_id)
        .order_by(ProductionRecord.date)
        .all()
    ]

    # Propiedades petrofísicas por arena
    sands = [
        {"sandName": s.sand_name, "kh": s.kh}
        for s in db.query(SandProperty)
        .filter(SandProperty.well_id == well_id)
        .order_by(SandProperty.sand_name)
        .all()
    ]

    # Fechas de intervención, en orden
    dates = [
        d.intervention_date.isoformat()
        for d in db.query(InterventionDate)
        .filter(InterventionDate.well_id == well_id)
        .order_by(InterventionDate.intervention_date)
        .all()
    ]

    # Celdas de la matriz, indexadas para armarla en el orden correcto
    cells = {
        (c.sand_name, c.intervention_date.isoformat()): c.is_open
        for c in db.query(InterventionCell).filter(InterventionCell.well_id == well_id).all()
    }

    # Los nombres de arena de la matriz son los de petrofísica: el motor cruza por nombre
    sand_names = [s["sandName"] for s in sands]

    # Armamos la matriz en el mismo orden que las arenas y las fechas
    matrix = [[cells.get((sand, d), False) for d in dates] for sand in sand_names]

    # Devolvemos las tres entradas
    return {
        "production": production,
        "sands": sands,
        "interventions": {"sandNames": sand_names, "interventionDates": dates, "matrix": matrix},
    }


# Comprobamos que el pozo tenga los datos mínimos para asignar
def _missing_inputs(inputs: Dict[str, Any]) -> List[str]:
    # Acumulamos lo que falte
    missing = []

    # Sin producción no hay nada que repartir
    if not inputs["production"]:
        missing.append("el histórico de producción")

    # Sin arenas no hay entre qué repartir
    if not inputs["sands"]:
        missing.append("las propiedades petrofísicas")

    # Sin fechas no se pueden construir los periodos
    if not inputs["interventions"]["interventionDates"]:
        missing.append("la matriz de intervenciones")

    # Devolvemos lo que falta
    return missing


# Resumimos el resultado por arena, que es lo que se muestra en la tabla
def _summarize(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Acumulamos por arena
    totals = defaultdict(float)
    days = defaultdict(int)

    # Recorremos las asignaciones
    for a in result["allocations"]:
        totals[a["sandName"]] += a["allocatedProduction"]
        days[a["sandName"]] += 1

    # Calculamos el total general para los porcentajes
    grand_total = sum(totals.values()) or 1.0

    # Componemos la fila de cada arena
    rows = [
        {
            "sand": sand,
            "total": total,
            "share": total / grand_total * 100,
            "average": total / days[sand] if days[sand] else 0.0,
        }
        for sand, total in totals.items()
    ]

    # Ordenamos de mayor a menor aporte
    rows.sort(key=lambda r: -r["total"])

    # Devolvemos el resumen
    return rows


# Preparamos los datos que consume el gráfico apilado de D3.
# Van serializados como JSON dentro de la página: son series densas y pasarlas
# por atributos HTML sería inmanejable.
def _chart_payload(result: Dict[str, Any]) -> str:
    # Indexamos la asignación por fecha y arena
    by_date: Dict[str, Dict[str, float]] = defaultdict(dict)

    # Recogemos los nombres de arena conservando el orden de aparición
    sands: List[str] = []

    # Recorremos las asignaciones
    for a in result["allocations"]:
        # Acumulamos por si una arena aparece dos veces en la misma fecha
        by_date[a["date"]][a["sandName"]] = (
            by_date[a["date"]].get(a["sandName"], 0.0) + a["allocatedProduction"]
        )

        # Registramos la arena la primera vez que la vemos
        if a["sandName"] not in sands:
            sands.append(a["sandName"])

    # Componemos una fila por fecha, con un valor por arena en el mismo orden
    rows = [
        {"date": d, "values": [round(by_date[d].get(s, 0.0), 2) for s in sands]}
        for d in sorted(by_date)
    ]

    # Serializamos de forma segura para incrustar en la página
    return json.dumps({"sands": sands, "rows": rows})


# Mostramos la pantalla de asignación de un pozo
@router.get("/{well_id}", response_class=HTMLResponse)
async def allocation(
    well_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = db.query(Well).filter(Well.id == well_id).first()

    # Si no existe, mostramos la pantalla de no encontrado
    if well is None:
        # Devolvemos 404 con una página legible
        return templates.TemplateResponse(
            "pages/not_found.html",
            page_context(request, current_user=current_user),
            status_code=404,
        )

    # Comprobamos qué datos tiene cargados
    inputs = _build_inputs(db, well_id)
    missing = _missing_inputs(inputs)

    # Recuperamos el último resultado guardado, si lo hay
    stored = db.query(AllocationResult).filter(AllocationResult.well_id == well_id).first()

    # Renderizamos la pantalla
    return templates.TemplateResponse(
        "pages/allocation.html",
        page_context(
            request,
            current_user=current_user,
            well=well,
            missing=missing,
            production_days=len(inputs["production"]),
            sand_count=len(inputs["sands"]),
            intervention_count=len(inputs["interventions"]["interventionDates"]),
            result=stored.results if stored else None,
            summary=_summarize(stored.results) if stored else None,
            chart_data=_chart_payload(stored.results) if stored else "{}",
            computed_at=stored.created_at if stored else None,
        ),
    )


# Ejecutamos la asignación
@router.post("/{well_id}/run", response_class=HTMLResponse)
async def run(
    well_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = db.query(Well).filter(Well.id == well_id).first()

    # Si no existe, avisamos
    if well is None:
        # Devolvemos el fragmento de error
        return templates.TemplateResponse(
            "partials/error_message.html",
            page_context(request, current_user=current_user, message="El pozo ya no existe."),
            status_code=404,
        )

    # Componemos las entradas
    inputs = _build_inputs(db, well_id)

    # Sin datos completos no tiene sentido ejecutar
    missing = _missing_inputs(inputs)

    # Avisamos con el detalle de lo que falta
    if missing:
        # Devolvemos el fragmento de error
        return templates.TemplateResponse(
            "partials/error_message.html",
            page_context(request, current_user=current_user,
                         message=f"Falta cargar {', '.join(missing)}."),
            status_code=400,
        )

    # Registramos el arranque
    logger.info(
        f"Asignando el pozo «{well.name}» con modelo {well.decline_model} "
        f"({len(inputs['production'])} días, {len(inputs['sands'])} arenas)"
    )

    # Ejecutamos el motor
    result = allocate_production(
        production_history=inputs["production"],
        sand_properties=inputs["sands"],
        intervention_matrix=inputs["interventions"],
        decline_model=well.decline_model,
    )

    # Guardamos el resultado, reemplazando el anterior
    stored = db.query(AllocationResult).filter(AllocationResult.well_id == well_id).first()

    # Lo creamos si es la primera ejecución
    if stored is None:
        # Insertamos el registro
        stored = AllocationResult(well_id=well_id, results=result)
        db.add(stored)

    # O actualizamos el que había
    else:
        # Reemplazamos el contenido
        stored.results = result

    # Confirmamos
    db.commit()

    # Registramos el cierre
    logger.info(
        f"Pozo {well_id} asignado: {len(result['allocations'])} registros, "
        f"{len(result['declineFits'])} ajustes, {len(result['warnings'])} avisos"
    )

    # Devolvemos el bloque de resultados ya renderizado
    return templates.TemplateResponse(
        "partials/allocation_results.html",
        page_context(
            request,
            current_user=current_user,
            well=well,
            result=result,
            summary=_summarize(result),
            chart_data=_chart_payload(result),
            computed_at=stored.created_at,
        ),
    )
