"""Dependencias de FastAPI para resolver el usuario de la sesión."""

# Importamos las librerias necesarias
from typing import Optional  # Para tipar el usuario que puede no existir

from fastapi import Request  # Para leer las cookies del request
from fastapi.responses import RedirectResponse  # Para mandar al login
from starlette.exceptions import HTTPException  # Para cortar el request con redirección

from app.core.config import settings  # Nombres de las cookies
from app.core.security import decode_claims  # Para leer los claims del token


# Definimos la excepción que redirige al login en vez de devolver un 401 crudo.
# Con HTMX importa: un 401 sin cuerpo deja la pantalla congelada.
class RedirectToLogin(HTTPException):
    # Construimos la excepción con el destino al que volver tras autenticarse
    def __init__(self, next_url: str = "/"):
        # Guardamos el destino para armar el querystring
        self.next_url = next_url

        # Usamos 307 para que el navegador conserve el método original
        super().__init__(status_code=307, detail="Authentication required")


# Extraemos el usuario de la cookie, sin exigir que exista
def get_current_user_optional(request: Request) -> Optional[dict]:
    # Leemos el access token de la cookie httpOnly
    token = request.cookies.get(settings.SESSION_COOKIE_NAME, "")

    # Sin token no hay sesión
    if not token:
        return None

    # Leemos los claims; devuelve None si venció o está malformado
    claims = decode_claims(token)

    # Un token inválido equivale a no tener sesión
    if not claims:
        return None

    # Los datos de perfil que guardamos al registrar viajan en user_metadata
    metadata = claims.get("user_metadata") or {}

    correo = (claims.get("email") or "").strip()

    # El rol sale del perfil local, no del token.
    #
    # Antes salia de `user_metadata`, y eso dejaba la pantalla de usuarios
    # decorativa: se editaba el rol en `user_profiles` y los permisos no
    # cambiaban, porque la sesion nunca la leia. Es el patron que ya usaba DDV,
    # que resuelve su fila local en cada peticion. Aqui el enlace es directo: el
    # `id` del perfil ES el uuid de la cuenta de Supabase, asi que no hace falta
    # buscar por correo ni guardar una columna de enlace.
    perfil = _perfil_local(claims)

    if perfil is not None:
        return {
            "id": claims.get("sub"),
            "email": correo,
            "full_name": perfil.get("full_name") or correo,
            "role": perfil.get("role") or "operador",
            "is_admin": (perfil.get("role") or "") == "admin",
        }

    # Sin perfil local se entra con el minimo privilegio. No se deniega a
    # proposito: una cuenta recien creada todavia no tiene fila, y bloquearla
    # dejaria a un administrador fuera de la pantalla que sirve para crearla. Lo
    # que no se hace es concederle nada por lo que diga el token.
    return {
        "id": claims.get("sub"),
        "email": correo,
        "full_name": metadata.get("full_name") or correo,
        "role": "operador",
        "is_admin": False,
    }


# Extraemos el usuario exigiendo que haya sesión
def get_current_user(request: Request) -> dict:
    # Reutilizamos la versión opcional
    user = get_current_user_optional(request)

    # Sin usuario, cortamos el request redirigiendo al login
    if user is None:
        # Conservamos la ruta pedida para volver a ella tras autenticarse
        raise RedirectToLogin(next_url=request.url.path)

    # Devolvemos el usuario autenticado
    return user


# Exigimos además que el usuario sea administrador
def require_admin(request: Request) -> dict:
    # Primero resolvemos que haya sesión válida
    user = get_current_user(request)

    # Sin rol admin, devolvemos 403 en vez de redirigir: está autenticado, no autorizado
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")

    # Devolvemos el usuario administrador
    return user


# Construimos la redirección al login conservando el destino original
def login_redirect(next_url: str = "/") -> RedirectResponse:
    # Evitamos redirigir al propio login, que causaría un bucle
    destination = "/login" if next_url in ("/login", "/logout") else f"/login?next={next_url}"

    # Devolvemos un 303 para que el navegador cambie a GET
    return RedirectResponse(destination, status_code=303)

# Buscamos el perfil local por el identificador de la cuenta
def _perfil_local(claims: dict):
    """El perfil activo de esa sesion, o None si no hay ninguno.

    Contrato comun a las cinco aplicaciones: recibe los claims del token y
    devuelve un diccionario con `full_name` y `role`, o None. Por dentro cada
    una busca como le conviene su tabla —aqui el `id` del perfil ES el uuid de
    la cuenta—, pero desde fuera se llaman y se leen igual.
    """
    auth_user_id = (claims or {}).get("sub")
    # Sin identificador no se puede resolver a nadie
    if not auth_user_id:
        return None

    # Se usa sesion propia: esto lo llama una dependencia, que no la recibe
    try:
        from app.db.session import db_manager
        from app.models.allocation import UserProfile

        with db_manager.session() as db:
            fila = (db.query(UserProfile)
                    .filter(UserProfile.id == auth_user_id)
                    .first())

            # Un perfil desactivado no aporta rol: se trata como si no estuviera
            if fila is None or not fila.is_active:
                return None

            # Se devuelve un diccionario, no la fila: la sesion se cierra aqui y
            # una instancia desligada estallaria al leerla desde la plantilla
            return {"full_name": fila.full_name, "role": fila.role}
    # Si la base no responde no se puede afirmar que alguien no tenga perfil, y
    # conceder privilegios por lo que diga el token seria peor: se sigue sin
    # perfil, que es el minimo privilegio. Pero se deja rastro: un fallo de
    # programacion aqui —un import mal escrito, una columna renombrada— haria
    # que nadie tuviera perfil nunca, y en silencio parece que no hay usuarios.
    except Exception as exc:
        from app.core.logging import get_logger

        get_logger(__name__).warning(
            f"No se pudo resolver el perfil local: {type(exc).__name__}: {exc}")

        return None
