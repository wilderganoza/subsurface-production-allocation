"""Detalle de un pozo: revisar y corregir a mano lo que se cargó.

La importación de Excel cubre la carga masiva. Esta pantalla cubre lo otro: ver
lo cargado, añadir una arena que faltaba, corregir un k·h mal leído y marcar en
la matriz qué arenas estaban abiertas en cada intervención. Sin esto solo se
puede volver a subir el archivo entero.
"""

# Importamos las librerias necesarias
from datetime import date as Date  # Para tipar las fechas de intervención
from typing import Any, Dict, List  # Tipos

from fastapi import APIRouter, Depends, Form, Request  # Router y formularios
from fastapi.responses import HTMLResponse  # Respuestas HTML
from sqlalchemy.orm import Session  # Sesión de base de datos

from app.core.deps import get_current_user  # Sesión obligatoria
from app.core.logging import get_logger  # Para registrar los cambios
from app.db.session import get_db  # Dependencia de sesión
from app.models.allocation import (  # Modelos del dominio
    AllocationResult, InterventionCell, InterventionDate, ProductionRecord,
    SandProperty, Well,
)
from app.web.templating import page_context, templates, toast_header  # Plantillas

# Creamos el logger de este módulo
logger = get_logger(__name__)

# Creamos el router del detalle de pozo
router = APIRouter(prefix="/wells")

# Definimos cuántos registros de producción se muestran en la vista previa
PRODUCTION_PREVIEW = 50


# Buscamos el pozo o devolvemos None
def _get_well(db: Session, well_id: int) -> Well:
    # Una sola consulta por identificador
    return db.query(Well).filter(Well.id == well_id).first()


# Invalidamos el resultado guardado cuando cambian los datos de entrada
def _invalidate_result(db: Session, well_id: int) -> None:
    # Un resultado calculado con datos viejos induce a error, así que se borra.
    # Es lo mismo que hacía la versión anterior al tocar cualquier paso.
    db.query(AllocationResult).filter(AllocationResult.well_id == well_id).delete()


# Armamos la matriz de intervenciones tal como la pinta la plantilla
def _build_matrix(db: Session, well_id: int) -> Dict[str, Any]:
    # Las arenas ordenadas por nombre son las filas
    sands = (db.query(SandProperty)
             .filter(SandProperty.well_id == well_id)
             .order_by(SandProperty.sand_name).all())

    # Las fechas ordenadas son las columnas
    dates = (db.query(InterventionDate)
             .filter(InterventionDate.well_id == well_id)
             .order_by(InterventionDate.intervention_date).all())

    # Indexamos las celdas guardadas por (arena, fecha)
    cells = {
        (c.sand_name, c.intervention_date): c.is_open
        for c in db.query(InterventionCell).filter(InterventionCell.well_id == well_id).all()
    }

    # Componemos la rejilla completa: una celda ausente cuenta como cerrada
    rows = []

    # Recorremos las arenas
    for s in sands:
        # Cada fila lleva el nombre y el estado en cada fecha
        rows.append({
            "sand_name": s.sand_name,
            "cells": [
                {"date": d.intervention_date, "is_open": cells.get((s.sand_name, d.intervention_date), False)}
                for d in dates
            ],
        })

    # Devolvemos lo que consume la plantilla
    return {"dates": dates, "rows": rows, "sand_count": len(sands)}


# Reunimos todo lo que muestra la pantalla de detalle
def _detail_context(request: Request, current_user: dict, db: Session, well: Well) -> dict:
    # La producción se muestra recortada, pero contamos el total
    production_total = (db.query(ProductionRecord)
                        .filter(ProductionRecord.well_id == well.id).count())

    # Traemos los primeros registros para la vista previa
    production = (db.query(ProductionRecord)
                  .filter(ProductionRecord.well_id == well.id)
                  .order_by(ProductionRecord.date)
                  .limit(PRODUCTION_PREVIEW).all())

    # El rango completo se calcula con dos consultas ligeras
    first = (db.query(ProductionRecord)
             .filter(ProductionRecord.well_id == well.id)
             .order_by(ProductionRecord.date.asc()).first())
    last = (db.query(ProductionRecord)
            .filter(ProductionRecord.well_id == well.id)
            .order_by(ProductionRecord.date.desc()).first())

    # Las arenas con su participación relativa por k·h
    sands = (db.query(SandProperty)
             .filter(SandProperty.well_id == well.id)
             .order_by(SandProperty.sand_name).all())

    # El total de k·h pondera el reparto, así que lo mostramos como porcentaje
    total_kh = sum(s.kh for s in sands) or 0.0

    # Componemos las filas de la tabla de arenas
    sand_rows = [
        {"id": s.id, "sand_name": s.sand_name, "kh": s.kh,
         "share": (s.kh / total_kh * 100.0) if total_kh else 0.0}
        for s in sands
    ]

    # Devolvemos el contexto completo
    return page_context(
        request,
        current_user=current_user,
        well=well,
        current_well_id=well.id,
        production=production,
        production_total=production_total,
        production_preview=PRODUCTION_PREVIEW,
        production_from=first.date if first else None,
        production_to=last.date if last else None,
        sands=sand_rows,
        total_kh=total_kh,
        matrix=_build_matrix(db, well.id),
    )


# Devolvemos el fragmento de error
def _error_fragment(request: Request, current_user: dict, message: str, status_code: int = 400):
    # Reutilizamos el mismo fragmento del resto de la aplicación
    return templates.TemplateResponse(
        "partials/error_message.html",
        page_context(request, current_user=current_user, message=message),
        status_code=status_code,
    )


# Devolvemos el fragmento de arenas ya actualizado
def _sands_response(request: Request, current_user: dict, db: Session, well: Well,
                    message: str, status_code: int = 200):
    # Renderizamos solo el bloque que HTMX reemplaza
    response = templates.TemplateResponse(
        "partials/sands_editor.html",
        _detail_context(request, current_user, db, well),
        status_code=status_code,
    )

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header(message, "success")

    # Devolvemos la respuesta
    return response


# Devolvemos el fragmento de la matriz ya actualizado
def _matrix_response(request: Request, current_user: dict, db: Session, well: Well,
                     message: str, status_code: int = 200):
    # Renderizamos solo la matriz
    response = templates.TemplateResponse(
        "partials/intervention_matrix.html",
        _detail_context(request, current_user, db, well),
        status_code=status_code,
    )

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header(message, "success")

    # Devolvemos la respuesta
    return response


# Mostramos el detalle de un pozo
@router.get("/{well_id}", response_class=HTMLResponse)
async def detail(
    well_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, mostramos la pantalla de no encontrado
    if well is None:
        # Devolvemos 404 con la plantilla habitual
        return templates.TemplateResponse(
            "pages/not_found.html",
            page_context(request, current_user=current_user),
            status_code=404,
        )

    # Renderizamos la pantalla completa
    return templates.TemplateResponse(
        "pages/well_detail.html",
        _detail_context(request, current_user, db, well),
    )


# Borramos el histórico de producción del pozo
@router.post("/{well_id}/production/clear", response_class=HTMLResponse)
async def clear_production(
    well_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Borramos el histórico completo
    borrados = db.query(ProductionRecord).filter(ProductionRecord.well_id == well_id).delete()

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos
    db.commit()

    # Registramos la operación
    logger.info(f"Pozo {well_id}: borrados {borrados} días de producción por {current_user['email']}")

    # Devolvemos el bloque de producción actualizado
    response = templates.TemplateResponse(
        "partials/production_panel.html",
        _detail_context(request, current_user, db, well),
    )

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Producción borrada", "success")

    # Devolvemos la respuesta
    return response


# Añadimos una arena
@router.post("/{well_id}/sands", response_class=HTMLResponse)
async def add_sand(
    well_id: int,
    request: Request,
    sand_name: str = Form(...),
    kh: float = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Una arena sin nombre no se puede identificar en la matriz
    nombre = sand_name.strip()

    # Validamos el nombre
    if not nombre:
        return _error_fragment(request, current_user, "El nombre de la arena es obligatorio.")

    # Un k·h negativo no tiene sentido físico y rompería el reparto
    if kh < 0:
        return _error_fragment(request, current_user, "El k·h no puede ser negativo.")

    # Comprobamos que no exista ya, porque la tabla lo impide
    existe = (db.query(SandProperty)
              .filter(SandProperty.well_id == well_id, SandProperty.sand_name == nombre)
              .first())

    # Si ya está, lo decimos en vez de dejar que falle la restricción
    if existe is not None:
        return _error_fragment(request, current_user, f"La arena «{nombre}» ya existe en este pozo.")

    # Insertamos la arena
    db.add(SandProperty(well_id=well_id, sand_name=nombre, kh=kh))

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos
    db.commit()

    # Registramos el alta
    logger.info(f"Pozo {well_id}: arena «{nombre}» añadida por {current_user['email']}")

    # Devolvemos el bloque de arenas actualizado
    return _sands_response(request, current_user, db, well, "Arena añadida", status_code=201)


# Actualizamos una arena
@router.post("/{well_id}/sands/{sand_id}", response_class=HTMLResponse)
async def update_sand(
    well_id: int,
    sand_id: int,
    request: Request,
    sand_name: str = Form(...),
    kh: float = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Buscamos la arena dentro de ese pozo
    sand = (db.query(SandProperty)
            .filter(SandProperty.id == sand_id, SandProperty.well_id == well_id).first())

    # Si no existe, avisamos
    if sand is None:
        return _error_fragment(request, current_user, "La arena ya no existe.", 404)

    # Limpiamos el nombre
    nombre = sand_name.strip()

    # Validamos el nombre
    if not nombre:
        return _error_fragment(request, current_user, "El nombre de la arena es obligatorio.")

    # Validamos el k·h
    if kh < 0:
        return _error_fragment(request, current_user, "El k·h no puede ser negativo.")

    # Comprobamos que el nombre nuevo no choque con otra arena del mismo pozo
    choque = (db.query(SandProperty)
              .filter(SandProperty.well_id == well_id,
                      SandProperty.sand_name == nombre,
                      SandProperty.id != sand_id)
              .first())

    # Si choca, lo decimos
    if choque is not None:
        return _error_fragment(request, current_user, f"Ya hay otra arena llamada «{nombre}».")

    # Si cambió el nombre, arrastramos las celdas de la matriz para no perderlas
    if sand.sand_name != nombre:
        # Renombramos en bloque las celdas de esa arena
        (db.query(InterventionCell)
         .filter(InterventionCell.well_id == well_id, InterventionCell.sand_name == sand.sand_name)
         .update({"sand_name": nombre}))

    # Volcamos los valores
    sand.sand_name = nombre
    sand.kh = kh

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos
    db.commit()

    # Registramos el cambio
    logger.info(f"Pozo {well_id}: arena {sand_id} actualizada por {current_user['email']}")

    # Devolvemos el bloque de arenas actualizado
    return _sands_response(request, current_user, db, well, "Arena actualizada")


# Eliminamos una arena
@router.delete("/{well_id}/sands/{sand_id}", response_class=HTMLResponse)
async def delete_sand(
    well_id: int,
    sand_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Buscamos la arena dentro de ese pozo
    sand = (db.query(SandProperty)
            .filter(SandProperty.id == sand_id, SandProperty.well_id == well_id).first())

    # Si no existe, avisamos
    if sand is None:
        return _error_fragment(request, current_user, "La arena ya no existe.", 404)

    # Guardamos el nombre para limpiar la matriz
    nombre = sand.sand_name

    # Borramos la arena
    db.delete(sand)

    # Borramos también sus celdas: una fila huérfana en la matriz confunde
    (db.query(InterventionCell)
     .filter(InterventionCell.well_id == well_id, InterventionCell.sand_name == nombre)
     .delete())

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos
    db.commit()

    # Registramos la baja
    logger.info(f"Pozo {well_id}: arena «{nombre}» eliminada por {current_user['email']}")

    # Devolvemos el bloque de arenas actualizado
    return _sands_response(request, current_user, db, well, "Arena eliminada")


# Añadimos una fecha de intervención
@router.post("/{well_id}/interventions/dates", response_class=HTMLResponse)
async def add_date(
    well_id: int,
    request: Request,
    intervention_date: Date = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Comprobamos que la fecha no esté repetida
    existe = (db.query(InterventionDate)
              .filter(InterventionDate.well_id == well_id,
                      InterventionDate.intervention_date == intervention_date)
              .first())

    # Si ya está, lo decimos
    if existe is not None:
        return _error_fragment(request, current_user, "Esa fecha de intervención ya existe.")

    # Insertamos la fecha
    db.add(InterventionDate(well_id=well_id, intervention_date=intervention_date))

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos para poder reordenar con la fecha nueva ya dentro
    db.commit()

    # Recalculamos el orden de presentación por fecha
    _renumber_dates(db, well_id)

    # Confirmamos el reordenado
    db.commit()

    # Registramos el alta
    logger.info(f"Pozo {well_id}: intervención {intervention_date} añadida por {current_user['email']}")

    # Devolvemos la matriz actualizada
    return _matrix_response(request, current_user, db, well, "Intervención añadida", status_code=201)


# Eliminamos una fecha de intervención
@router.delete("/{well_id}/interventions/dates/{date_id}", response_class=HTMLResponse)
async def delete_date(
    well_id: int,
    date_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Buscamos la fecha dentro de ese pozo
    fecha = (db.query(InterventionDate)
             .filter(InterventionDate.id == date_id, InterventionDate.well_id == well_id).first())

    # Si no existe, avisamos
    if fecha is None:
        return _error_fragment(request, current_user, "Esa intervención ya no existe.", 404)

    # Guardamos el valor para limpiar la columna
    valor = fecha.intervention_date

    # Borramos la fecha
    db.delete(fecha)

    # Borramos su columna de celdas
    (db.query(InterventionCell)
     .filter(InterventionCell.well_id == well_id, InterventionCell.intervention_date == valor)
     .delete())

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos
    db.commit()

    # Recalculamos el orden de presentación
    _renumber_dates(db, well_id)

    # Confirmamos el reordenado
    db.commit()

    # Registramos la baja
    logger.info(f"Pozo {well_id}: intervención {valor} eliminada por {current_user['email']}")

    # Devolvemos la matriz actualizada
    return _matrix_response(request, current_user, db, well, "Intervención eliminada")


# Alternamos una celda de la matriz
@router.post("/{well_id}/interventions/toggle", response_class=HTMLResponse)
async def toggle_cell(
    well_id: int,
    request: Request,
    sand_name: str = Form(...),
    intervention_date: Date = Form(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = _get_well(db, well_id)

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Buscamos la celda, que puede no estar guardada todavía
    cell = (db.query(InterventionCell)
            .filter(InterventionCell.well_id == well_id,
                    InterventionCell.sand_name == sand_name,
                    InterventionCell.intervention_date == intervention_date)
            .first())

    # Una celda ausente vale cerrado, así que al pulsarla se crea abierta
    if cell is None:
        # Insertamos la celda ya abierta
        db.add(InterventionCell(well_id=well_id, sand_name=sand_name,
                                intervention_date=intervention_date, is_open=True))
    else:
        # Invertimos el valor guardado
        cell.is_open = not cell.is_open

    # El resultado guardado deja de ser válido
    _invalidate_result(db, well_id)

    # Confirmamos
    db.commit()

    # Devolvemos la matriz actualizada, sin toast: pulsar celdas es continuo
    return templates.TemplateResponse(
        "partials/intervention_matrix.html",
        _detail_context(request, current_user, db, well),
    )


# Recalculamos sort_order para que siga el orden cronológico
def _renumber_dates(db: Session, well_id: int) -> None:
    # Traemos las fechas ya ordenadas
    fechas: List[InterventionDate] = (db.query(InterventionDate)
                                      .filter(InterventionDate.well_id == well_id)
                                      .order_by(InterventionDate.intervention_date).all())

    # Reasignamos el orden de presentación
    for posicion, fecha in enumerate(fechas):
        # Solo escribimos si cambió, para no ensuciar la transacción
        if fecha.sort_order != posicion:
            fecha.sort_order = posicion
