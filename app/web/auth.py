"""Rutas de autenticación: login, logout y renovación de sesión."""

# Importamos las librerias necesarias
from fastapi import APIRouter, Form, Request, Response  # Router, formularios y request/response
from fastapi.responses import HTMLResponse, RedirectResponse  # Respuestas HTML y redirecciones

from app.core.config import settings  # Nombres de cookies y flags
from app.core.deps import get_current_user_optional  # Para no mostrar login a quien ya entró
from app.core.security import AuthError, sign_in, sign_out  # Operaciones contra Supabase Auth
from app.web.templating import page_context, templates  # Motor de plantillas y contexto base

# Creamos el router de autenticación
router = APIRouter()

# Definimos cuánto dura la cookie de refresh, en segundos (30 días)
REFRESH_MAX_AGE = 30 * 24 * 60 * 60


# Guardamos los tokens de sesión en cookies httpOnly
def _set_session_cookies(response: Response, access_token: str, refresh_token: str, expires_in: int) -> None:
    # El access token dura lo que diga Supabase (típicamente una hora)
    response.set_cookie(
        settings.SESSION_COOKIE_NAME,
        access_token,
        max_age=expires_in,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )

    # El refresh token dura mucho más y solo viaja para renovar
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=REFRESH_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


# Borramos las cookies de sesión
def _clear_session_cookies(response: Response) -> None:
    # Eliminamos ambas cookies con el mismo path con que se crearon
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/")


# Mostramos el formulario de login
@router.get("/login", response_class=HTMLResponse)
async def login_form(request: Request, next: str = "/"):
    # Si ya hay sesión activa, no tiene sentido mostrar el formulario
    if get_current_user_optional(request) is not None:
        # Mandamos directo al destino pedido
        return RedirectResponse(next, status_code=303)

    # Renderizamos la pantalla de login
    return templates.TemplateResponse(
        "pages/login.html",
        page_context(request, current_user=None, next_url=next, error=None),
    )


# Procesamos el envío del formulario de login
@router.post("/login", response_class=HTMLResponse)
async def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    next: str = Form("/"),
):
    # Intentamos autenticar contra Supabase
    try:
        # Pedimos el par de tokens
        session = await sign_in(email.strip(), password)
    # Credenciales inválidas: volvemos a mostrar el formulario con el error
    except AuthError as exc:
        # Devolvemos 401 para que quede registrado en los logs de acceso
        return templates.TemplateResponse(
            "pages/login.html",
            page_context(request, current_user=None, next_url=next, error=str(exc)),
            status_code=401,
        )

    # Redirigimos al destino original con las cookies ya puestas
    response = RedirectResponse(next or "/", status_code=303)

    # Guardamos los tokens en cookies httpOnly
    _set_session_cookies(
        response,
        session["access_token"],
        session["refresh_token"],
        session.get("expires_in", 3600),
    )

    # Devolvemos la redirección
    return response


# Cerramos la sesión
@router.post("/logout")
async def logout(request: Request):
    # Recuperamos el access token para avisarle a Supabase
    token = request.cookies.get(settings.SESSION_COOKIE_NAME, "")

    # Invalidamos el refresh token del lado del servidor si había sesión
    if token:
        await sign_out(token)

    # Mandamos al login
    response = RedirectResponse("/login", status_code=303)

    # Borramos las cookies locales pase lo que pase
    _clear_session_cookies(response)

    # Devolvemos la redirección
    return response
