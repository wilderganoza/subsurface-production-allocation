"""Administración de cuentas. Solo accesible con rol de administrador."""

# Importamos las librerias necesarias
from typing import List  # Tipos

from fastapi import APIRouter, Depends, Form, Request  # Router y formularios
from fastapi.responses import HTMLResponse  # Respuestas HTML
from sqlalchemy.orm import Session  # Sesión de base de datos

from app.core.deps import require_admin  # Exige rol de administrador
from app.core.logging import get_logger  # Para registrar los cambios
from app.db.session import get_db  # Dependencia de sesión
from app.models.allocation import UserProfile  # Perfil de organización
from app.services import supabase_admin  # Operaciones sobre las cuentas
from app.web.templating import page_context, templates, toast_header  # Plantillas

# Creamos el logger de este módulo
logger = get_logger(__name__)

# Creamos el router de usuarios
router = APIRouter(prefix="/admin/users")

# Definimos el largo mínimo de contraseña, alineado con el que exige Supabase
MIN_PASSWORD = 8

# Definimos los roles admitidos en esta aplicación
ROLES = ("admin", "engineer")


# Combinamos las cuentas de Supabase Auth con los perfiles guardados aquí
async def _load_users(db: Session) -> List[dict]:
    # Traemos las cuentas del proveedor de autenticación
    cuentas = await supabase_admin.list_users()

    # Indexamos los perfiles locales por identificador
    profiles = {str(p.id): p for p in db.query(UserProfile).all()}

    # Componemos la vista que consume la plantilla
    users = []

    # Recorremos las cuentas
    for account in cuentas:
        # Los datos de organización viven en los metadatos de la cuenta
        metadata = account.get("user_metadata") or {}

        # El perfil local complementa con el estado de activación
        profile = profiles.get(account["id"])

        # Armamos la fila
        users.append({
            "id": account["id"],
            "email": account.get("email", ""),
            "full_name": metadata.get("full_name") or (profile.full_name if profile else ""),
            "role": metadata.get("role", "engineer"),
            "is_active": profile.is_active if profile else True,
            "created_at": account.get("created_at", ""),
            "last_sign_in": account.get("last_sign_in_at") or "",
        })

    # Ordenamos por nombre para que la lista sea estable
    return sorted(users, key=lambda u: (u["full_name"] or u["email"]).lower())


# Devolvemos el fragmento con la tabla de usuarios
async def _table_response(request: Request, current_user: dict, db: Session, status_code: int = 200):
    # Renderizamos solo la tabla, que es lo que HTMX reemplaza
    return templates.TemplateResponse(
        "partials/users_table.html",
        page_context(
            request,
            current_user=current_user,
            users=await _load_users(db),
            roles=ROLES,
            admin_available=True,
        ),
        status_code=status_code,
    )


# Devolvemos el fragmento de error
def _error_fragment(request: Request, current_user: dict, message: str, status_code: int = 400):
    # Reutilizamos el mismo fragmento de error del resto de la aplicación
    return templates.TemplateResponse(
        "partials/error_message.html",
        page_context(request, current_user=current_user, message=message),
        status_code=status_code,
    )


# Mostramos la pantalla de administración de usuarios
@router.get("", response_class=HTMLResponse)
async def users(
    request: Request,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Sin clave de servicio no podemos consultar las cuentas
    if not supabase_admin.is_available():
        # Mostramos la pantalla explicando qué falta, en vez de un error crudo
        return templates.TemplateResponse(
            "pages/users.html",
            page_context(request, current_user=current_user, users=[], roles=ROLES,
                         admin_available=False, min_password=MIN_PASSWORD),
        )

    # Cargamos las cuentas
    try:
        # Combinamos cuentas y perfiles
        items = await _load_users(db)
    # Un fallo del proveedor se muestra en pantalla
    except supabase_admin.AdminError as exc:
        # Devolvemos la pantalla con el mensaje
        return templates.TemplateResponse(
            "pages/users.html",
            page_context(request, current_user=current_user, users=[], roles=ROLES,
                         admin_available=False, error=str(exc), min_password=MIN_PASSWORD),
        )

    # Renderizamos la pantalla completa
    return templates.TemplateResponse(
        "pages/users.html",
        page_context(request, current_user=current_user, users=items, roles=ROLES,
                     admin_available=True, min_password=MIN_PASSWORD),
    )


# Creamos una cuenta nueva
@router.post("", response_class=HTMLResponse)
async def create(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(""),
    role: str = Form("engineer"),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Validamos la contraseña antes de gastar una llamada al proveedor
    if len(password) < MIN_PASSWORD:
        # Devolvemos el error
        return _error_fragment(request, current_user,
                               f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres.")

    # Validamos el rol contra los admitidos
    if role not in ROLES:
        # Devolvemos el error
        return _error_fragment(request, current_user, "El rol debe ser admin o engineer.")

    # Creamos la cuenta en el proveedor
    try:
        # La cuenta queda con el correo ya confirmado
        account = await supabase_admin.create_user(email, password, name, role)
    # Un fallo del proveedor se muestra al administrador
    except supabase_admin.AdminError as exc:
        # Devolvemos el error
        return _error_fragment(request, current_user, str(exc))

    # Guardamos el perfil local
    db.add(UserProfile(
        id=account["id"],
        full_name=name.strip(),
        role=role,
        is_active=True,
    ))

    # Confirmamos
    db.commit()

    # Registramos quién creó la cuenta
    logger.info(f"Cuenta {email} creada por {current_user['email']}")

    # Devolvemos la tabla actualizada
    response = await _table_response(request, current_user, db, status_code=201)

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Usuario creado", "success")

    # Devolvemos la respuesta
    return response


# Actualizamos una cuenta existente
@router.post("/{user_id}", response_class=HTMLResponse)
async def update(
    user_id: str,
    request: Request,
    name: str = Form(""),
    role: str = Form("engineer"),
    password: str = Form(""),
    is_active: str = Form(""),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Validamos el rol
    if role not in ROLES:
        # Devolvemos el error
        return _error_fragment(request, current_user, "El rol debe ser admin o engineer.")

    # Si se está restableciendo la contraseña, validamos el largo
    if password and len(password) < MIN_PASSWORD:
        # Devolvemos el error
        return _error_fragment(request, current_user,
                               f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres.")

    # Evitamos que un administrador se quite a sí mismo el rol y quede fuera
    if user_id == current_user["id"] and role != "admin":
        # Devolvemos el error explicando el motivo
        return _error_fragment(request, current_user,
                               "No puedes quitarte a ti mismo el rol de administrador.")

    # Actualizamos la cuenta en el proveedor
    try:
        # Enviamos solo lo que cambió
        await supabase_admin.update_user(
            user_id, full_name=name, role=role, password=password or None
        )
    # Un fallo del proveedor se muestra al administrador
    except supabase_admin.AdminError as exc:
        # Devolvemos el error
        return _error_fragment(request, current_user, str(exc))

    # Actualizamos el perfil local, creándolo si la cuenta es anterior a esta pantalla
    profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()

    # Lo creamos si no existía
    if profile is None:
        # Insertamos el registro
        profile = UserProfile(id=user_id)
        db.add(profile)

    # Volcamos los datos
    profile.full_name = name.strip()
    profile.role = role
    profile.is_active = is_active == "on"

    # Confirmamos
    db.commit()

    # Registramos el cambio
    logger.info(f"Cuenta {user_id} actualizada por {current_user['email']}")

    # Devolvemos la tabla actualizada
    response = await _table_response(request, current_user, db)

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Usuario actualizado", "success")

    # Devolvemos la respuesta
    return response


# Eliminamos una cuenta
@router.delete("/{user_id}", response_class=HTMLResponse)
async def delete(
    user_id: str,
    request: Request,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Evitamos que un administrador borre su propia cuenta por accidente
    if user_id == current_user["id"]:
        # Devolvemos el error
        return _error_fragment(request, current_user, "No puedes eliminar tu propia cuenta.")

    # Borramos la cuenta del proveedor
    try:
        # La baja es definitiva
        await supabase_admin.delete_user(user_id)
    # Un fallo del proveedor se muestra al administrador
    except supabase_admin.AdminError as exc:
        # Devolvemos el error
        return _error_fragment(request, current_user, str(exc))

    # Borramos el perfil local. Los pozos que creó se conservan: su user_id
    # queda en null por la regla ON DELETE SET NULL.
    db.query(UserProfile).filter(UserProfile.id == user_id).delete()

    # Confirmamos
    db.commit()

    # Registramos la baja
    logger.info(f"Cuenta {user_id} eliminada por {current_user['email']}")

    # Devolvemos la tabla actualizada
    response = await _table_response(request, current_user, db)

    # Avisamos con un toast
    response.headers["HX-Trigger"] = toast_header("Usuario eliminado", "success")

    # Devolvemos la respuesta
    return response
