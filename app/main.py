"""Punto de entrada de la aplicación FastAPI.

La app se sirve entera desde este proceso: Jinja2 renderiza el HTML y HTMX pide
fragmentos a los mismos endpoints. No hay build de frontend ni API JSON separada.
"""

# Importamos las librerias necesarias
from contextlib import asynccontextmanager  # Para el ciclo de vida de la app

from fastapi import FastAPI, Request  # App y request
from fastapi.responses import RedirectResponse  # Redirección de la raíz
from fastapi.staticfiles import StaticFiles  # Para servir css/js
from starlette.middleware.cors import CORSMiddleware  # CORS, si algo externo lo necesita

from app.core.config import settings  # Configuración global
from app.core.deps import RedirectToLogin, login_redirect  # Sesión
from app.core.logging import get_logger  # Logging
from app.db.session import db_manager  # Conexión a PostgreSQL
from app.web import allocation as allocation_routes  # Asignación de producción
from app.web import auth as auth_routes  # Rutas de autenticación
from app.web import users as users_routes  # Administración de cuentas
from app.web import well_detail as well_detail_routes  # Detalle y edición de un pozo
from app.web import wells as wells_routes  # Gestión de pozos
from app.web.templating import STATIC_DIR  # Directorio de estáticos

# Creamos el logger de este módulo
logger = get_logger(__name__)


# Definimos el ciclo de vida: abrimos la base al arrancar y la cerramos al salir
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Registramos el arranque
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]")

    # Abrimos el pool de conexiones
    db_manager.initialize()

    # Cedemos el control mientras la app atiende requests
    yield

    # Cerramos el pool al apagar
    db_manager.dispose()


# Construimos la aplicación
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Habilitamos CORS solo si hay orígenes configurados explícitamente
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Montamos los archivos estáticos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Registramos las rutas de autenticación
app.include_router(auth_routes.router, tags=["auth"])

# Registramos la gestión de pozos
app.include_router(wells_routes.router, tags=["wells"])

# Registramos el detalle de un pozo, que comparte el prefijo /wells
app.include_router(well_detail_routes.router, tags=["wells"])

# Registramos la asignación de producción
app.include_router(allocation_routes.router, tags=["allocation"])

# Registramos la administración de cuentas
app.include_router(users_routes.router, tags=["users"])


# Convertimos la excepción de sesión ausente en una redirección al login
@app.exception_handler(RedirectToLogin)
async def handle_redirect_to_login(request: Request, exc: RedirectToLogin):
    # Armamos la redirección conservando el destino original
    response = login_redirect(exc.next_url)

    # Si la petición vino de HTMX, le pedimos que redirija la ventana completa
    if request.headers.get("HX-Request") == "true":
        response.headers["HX-Redirect"] = response.headers.get("location", "/login")

    # Devolvemos la redirección
    return response


# La raíz lleva a la lista de pozos, que es la pantalla de entrada
@app.get("/")
async def home():
    # Redirigimos con 307 para conservar el método
    return RedirectResponse("/wells", status_code=307)


# Exponemos un chequeo de salud para el balanceador y los despliegues
@app.get("/health")
async def health():
    # Devolvemos el estado y la versión
    return {"status": "ok", "version": settings.APP_VERSION}
