"""Operaciones de administración contra Supabase Auth.

Estas llamadas usan la clave de servicio, que salta RLS y puede crear o borrar
cualquier cuenta. Por eso viven aisladas en este módulo y solo las invocan las
rutas protegidas por rol de administrador.
"""

# Importamos las librerias necesarias
from typing import Any, Dict, List, Optional  # Tipos

import httpx  # Cliente HTTP

from app.core.config import settings  # URL y claves del proyecto
from app.core.logging import get_logger  # Para registrar los cambios

# Creamos el logger de este módulo
logger = get_logger(__name__)


# Definimos el error que lanzamos cuando la operación de administración falla
class AdminError(Exception):
    """La operación contra Supabase Auth no se pudo completar."""


# Indicamos si la administración de cuentas está disponible
def is_available() -> bool:
    # Sin clave de servicio solo podemos leer perfiles, no tocar cuentas
    return bool(settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_URL)


# Construimos la URL del endpoint de administración
def _admin_url(path: str = "") -> str:
    # Componemos sobre la ruta de administración de GoTrue
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users{path}"


# Armamos las cabeceras autenticadas con la clave de servicio
def _headers() -> Dict[str, str]:
    # La clave de servicio va tanto en apikey como en Authorization
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


# Verificamos que la clave esté configurada antes de intentar nada
def _require_key() -> None:
    # Sin clave, avisamos con un mensaje accionable en vez de un error de red
    if not is_available():
        raise AdminError(
            "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. "
            "Se obtiene en el dashboard, en Project Settings → API Keys."
        )


# Extraemos el mensaje de error que devuelve GoTrue
def _error_detail(response: httpx.Response) -> str:
    # Intentamos leer el cuerpo como JSON
    try:
        # GoTrue usa distintas claves según el error
        cuerpo = response.json()
        return cuerpo.get("msg") or cuerpo.get("message") or cuerpo.get("error_description") or str(cuerpo)
    # Si no es JSON, devolvemos el texto recortado
    except Exception:
        return response.text[:200]


# Creamos una cuenta nueva
async def create_user(
    email: str,
    password: str,
    full_name: str = "",
    role: str = "engineer",
) -> Dict[str, Any]:
    # Exigimos la clave de servicio
    _require_key()

    # Componemos el cuerpo. Confirmamos el correo de una vez porque las cuentas
    # las crea un administrador, no el propio usuario mediante registro público.
    payload = {
        "email": email.strip().lower(),
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name.strip(), "role": role},
    }

    # Llamamos a la API de administración
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Creamos la cuenta
        response = await client.post(_admin_url(), headers=_headers(), json=payload)

    # Un error se convierte en AdminError con el motivo de GoTrue
    if response.status_code not in (200, 201):
        # Recuperamos el motivo
        reason = _error_detail(response)

        # Registramos el fallo
        logger.warning(f"No se pudo crear la cuenta {email}: {response.status_code} {reason}")

        # Traducimos el caso más frecuente a un mensaje claro
        if "already" in reason.lower() or response.status_code == 422:
            raise AdminError("Ya existe una cuenta con ese correo")

        # Lanzamos el motivo original para el resto de casos
        raise AdminError(reason)

    # Registramos el alta sin exponer la contraseña
    logger.info(f"Cuenta creada en Supabase Auth: {email}")

    # Devolvemos el usuario creado
    return response.json()


# Actualizamos los metadatos de una cuenta
async def update_user(
    user_id: str,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    password: Optional[str] = None,
) -> Dict[str, Any]:
    # Exigimos la clave de servicio
    _require_key()

    # Componemos solo los campos que cambian
    payload: Dict[str, Any] = {}

    # Los metadatos van juntos: GoTrue los reemplaza completos
    metadata: Dict[str, Any] = {}

    # Sumamos el nombre si se envió
    if full_name is not None:
        metadata["full_name"] = full_name.strip()

    # Sumamos el rol si se envió
    if role is not None:
        metadata["role"] = role

    # Solo incluimos los metadatos si hay alguno
    if metadata:
        payload["user_metadata"] = metadata

    # Sumamos la contraseña si se está restableciendo
    if password:
        payload["password"] = password

    # Sin cambios no hay nada que enviar
    if not payload:
        return {}

    # Llamamos a la API de administración
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Actualizamos la cuenta
        response = await client.put(_admin_url(f"/{user_id}"), headers=_headers(), json=payload)

    # Un error se convierte en AdminError
    if response.status_code != 200:
        # Recuperamos el motivo
        reason = _error_detail(response)

        # Registramos el fallo
        logger.warning(f"No se pudo actualizar la cuenta {user_id}: {reason}")

        # Lanzamos el error
        raise AdminError(reason)

    # Registramos el cambio indicando si incluyó contraseña
    logger.info(f"Cuenta {user_id} actualizada" + (" (contrasena restablecida)" if password else ""))

    # Devolvemos el usuario actualizado
    return response.json()


# Eliminamos una cuenta
async def delete_user(user_id: str) -> None:
    # Exigimos la clave de servicio
    _require_key()

    # Llamamos a la API de administración
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Borramos la cuenta
        response = await client.delete(_admin_url(f"/{user_id}"), headers=_headers())

    # Un error se convierte en AdminError
    if response.status_code not in (200, 204):
        # Recuperamos el motivo
        reason = _error_detail(response)

        # Registramos el fallo
        logger.warning(f"No se pudo eliminar la cuenta {user_id}: {reason}")

        # Lanzamos el error
        raise AdminError(reason)

    # Registramos la baja
    logger.info(f"Cuenta {user_id} eliminada de Supabase Auth")


# Listamos las cuentas registradas
async def list_users() -> List[Dict[str, Any]]:
    # Exigimos la clave de servicio
    _require_key()

    # Llamamos a la API de administración
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Pedimos la primera página, suficiente para el tamaño de este equipo
        response = await client.get(_admin_url("?per_page=200"), headers=_headers())

    # Un error se convierte en AdminError
    if response.status_code != 200:
        # Lanzamos el motivo
        raise AdminError(_error_detail(response))

    # GoTrue devuelve la lista bajo la clave users
    return response.json().get("users", [])
