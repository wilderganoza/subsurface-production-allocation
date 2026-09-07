"""Gestión de pozos y carga de sus datos."""

# Importamos las librerias necesarias
from typing import List, Optional  # Tipos

from fastapi import APIRouter, Depends, Form, Request, UploadFile  # Router y formularios
from fastapi.responses import HTMLResponse, Response  # Respuestas
from sqlalchemy.orm import Session  # Sesión de base de datos

from app.core.config import settings  # Límite de subida y modelos válidos
from app.core.deps import get_current_user  # Sesión obligatoria
from app.core.logging import get_logger  # Para registrar los cambios
from app.db.session import get_db  # Dependencia de sesión
from app.models.allocation import (  # Modelos del dominio
    InterventionCell, InterventionDate, ProductionRecord, SandProperty, Well,
)
from app.services.excel_import import (  # Lectura de los Excel
    ImportError_, parse_interventions, parse_petrophysics, parse_production,
)
from app.web.templating import page_context, templates, toast_header  # Plantillas

# Creamos el logger de este módulo
logger = get_logger(__name__)

# Creamos el router de pozos
router = APIRouter(prefix="/wells")

# Definimos los modelos de declinación admitidos
DECLINE_MODELS = ("exponential", "hyperbolic", "harmonic", "best_fit")


# Cargamos los pozos con el resumen que muestra la tabla
def _load_wells(db: Session) -> List[Well]:
    # Ordenamos por nombre para que la lista sea estable
    return db.query(Well).order_by(Well.name).all()


# Devolvemos el fragmento con la lista de pozos
def _list_response(request: Request, current_user: dict, db: Session, status_code: int = 200):
    # Renderizamos solo el bloque que HTMX reemplaza
    return templates.TemplateResponse(
        "partials/wells_list.html",
        page_context(request, current_user=current_user, wells=_load_wells(db),
                     decline_models=DECLINE_MODELS),
        status_code=status_code,
    )


# Devolvemos el fragmento de error
def _error_fragment(request: Request, current_user: dict, message: str, status_code: int = 400):
    # Reutilizamos el mismo fragmento del resto de la aplicación
    return templates.TemplateResponse(
        "partials/error_message.html",
        page_context(request, current_user=current_user, message=message),
        status_code=status_code,
    )


# Mostramos la pantalla de pozos
@router.get("", response_class=HTMLResponse)
async def wells(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Renderizamos la pantalla completa
    return templates.TemplateResponse(
        "pages/wells.html",
        page_context(request, current_user=current_user, wells=_load_wells(db),
                     decline_models=DECLINE_MODELS),
    )


# Creamos un pozo
@router.post("", response_class=HTMLResponse)
async def create(
    request: Request,
    name: str = Form(...),
    decline_model: str = Form("best_fit"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Un pozo sin nombre no es identificable
    if not name.strip():
        # Devolvemos el error
        return _error_fragment(request, current_user, "El nombre del pozo es obligatorio.")

    # Validamos el modelo contra los admitidos
    if decline_model not in DECLINE_MODELS:
        # Devolvemos el error
        return _error_fragment(request, current_user, "Modelo de declinación no válido.")

    # Creamos el pozo
    db.add(Well(name=name.strip(), decline_model=decline_model, user_id=current_user["id"]))

    # Confirmamos
    db.commit()

    # Registramos el alta
    logger.info(f"Pozo «{name.strip()}» creado por {current_user['email']}")

    # Devolvemos la lista actualizada
    response = _list_response(request, current_user, db, status_code=201)

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Pozo creado", "success")

    # Devolvemos la respuesta
    return response


# Actualizamos el modelo de declinación de un pozo
@router.post("/{well_id}", response_class=HTMLResponse)
async def update(
    well_id: int,
    request: Request,
    name: str = Form(...),
    decline_model: str = Form("best_fit"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = db.query(Well).filter(Well.id == well_id).first()

    # Si no existe, avisamos
    if well is None:
        # Devolvemos el error
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Validamos los datos
    if not name.strip():
        return _error_fragment(request, current_user, "El nombre del pozo es obligatorio.")

    # Validamos el modelo
    if decline_model not in DECLINE_MODELS:
        return _error_fragment(request, current_user, "Modelo de declinación no válido.")

    # Actualizamos
    well.name = name.strip()
    well.decline_model = decline_model

    # Confirmamos
    db.commit()

    # Registramos el cambio
    logger.info(f"Pozo {well_id} actualizado por {current_user['email']}")

    # Devolvemos la lista actualizada
    response = _list_response(request, current_user, db)

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Pozo actualizado", "success")

    # Devolvemos la respuesta
    return response


# Eliminamos un pozo con todos sus datos
@router.delete("/{well_id}", response_class=HTMLResponse)
async def delete(
    well_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = db.query(Well).filter(Well.id == well_id).first()

    # Si no existe, no hay nada que borrar
    if well is None:
        # Devolvemos 404 vacío
        return Response(status_code=404)

    # Guardamos el nombre para el aviso
    name = well.name

    # Borramos; la cascada se lleva producción, arenas, intervenciones y resultados
    db.delete(well)

    # Confirmamos
    db.commit()

    # Registramos la baja
    logger.info(f"Pozo «{name}» eliminado por {current_user['email']}")

    # Devolvemos la lista actualizada
    response = _list_response(request, current_user, db)

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Pozo eliminado", "success")

    # Devolvemos la respuesta
    return response


# Cargamos los tres Excel de un pozo
@router.post("/{well_id}/import", response_class=HTMLResponse)
async def import_data(
    well_id: int,
    request: Request,
    production: Optional[UploadFile] = None,
    petrophysics: Optional[UploadFile] = None,
    interventions: Optional[UploadFile] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Buscamos el pozo
    well = db.query(Well).filter(Well.id == well_id).first()

    # Si no existe, avisamos
    if well is None:
        return _error_fragment(request, current_user, "El pozo ya no existe.", 404)

    # Acumulamos lo que se haya importado, para el mensaje final
    imported = []

    # Procesamos cada archivo, dejando el error visible si alguno falla
    try:
        # --- Producción ---
        if production is not None and production.filename:
            # Leemos y parseamos
            records = parse_production(await production.read())

            # Reemplazamos el histórico completo: la carga es total, no incremental
            db.query(ProductionRecord).filter(ProductionRecord.well_id == well_id).delete()

            # Insertamos los registros nuevos
            for r in records:
                db.add(ProductionRecord(well_id=well_id, date=r["date"],
                                        total_production=r["total_production"]))

            # Anotamos para el resumen
            imported.append(f"{len(records)} días de producción")

        # --- Petrofísica ---
        if petrophysics is not None and petrophysics.filename:
            # Leemos y parseamos
            sands = parse_petrophysics(await petrophysics.read())

            # Reemplazamos las arenas
            db.query(SandProperty).filter(SandProperty.well_id == well_id).delete()

            # Insertamos las arenas nuevas
            for s in sands:
                db.add(SandProperty(well_id=well_id, sand_name=s["sand_name"], kh=s["kh"]))

            # Anotamos para el resumen
            imported.append(f"{len(sands)} arenas")

        # --- Intervenciones ---
        if interventions is not None and interventions.filename:
            # Leemos y parseamos
            matrix = parse_interventions(await interventions.read())

            # Reemplazamos fechas y celdas
            db.query(InterventionDate).filter(InterventionDate.well_id == well_id).delete()
            db.query(InterventionCell).filter(InterventionCell.well_id == well_id).delete()

            # Insertamos las fechas en orden
            for order, d in enumerate(matrix["interventionDates"]):
                db.add(InterventionDate(well_id=well_id, intervention_date=d, sort_order=order))

            # Insertamos la matriz completa
            for i, sand in enumerate(matrix["sandNames"]):
                for j, d in enumerate(matrix["interventionDates"]):
                    db.add(InterventionCell(well_id=well_id, sand_name=sand,
                                            intervention_date=d, is_open=matrix["matrix"][i][j]))

            # Anotamos para el resumen
            imported.append(f"{len(matrix['interventionDates'])} intervenciones")

    # Un archivo mal formado se muestra al usuario con la fila concreta
    except ImportError_ as exc:
        # Descartamos lo hecho hasta ahora: la carga es todo o nada
        db.rollback()

        # Devolvemos el error
        return _error_fragment(request, current_user, str(exc))

    # Sin archivos no hay nada que importar
    if not imported:
        return _error_fragment(request, current_user, "Selecciona al menos un archivo.")

    # Confirmamos la carga completa
    db.commit()

    # Registramos la importación
    logger.info(f"Pozo {well_id}: importados {', '.join(imported)} por {current_user['email']}")

    # Devolvemos la lista actualizada
    response = _list_response(request, current_user, db)

    # Avisamos con el detalle de lo cargado
    response.headers["HX-Trigger"] = toast_header(f"Importado: {", ".join(imported)}", "success")

    # Devolvemos la respuesta
    return response
