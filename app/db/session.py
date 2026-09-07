# Importamos las librerias necesarias
from typing import Generator  # Para tipar el generador de sesiones
from sqlalchemy import create_engine  # Para construir el engine de conexión
from sqlalchemy.orm import sessionmaker, Session  # Fábrica de sesiones y tipo de sesión

from app.core.config import settings  # Configuración de la app (DATABASE_URL, DB_SCHEMA)
from app.core.logging import get_logger  # Para registrar la actividad de conexión

# Creamos el logger de este módulo
logger = get_logger(__name__)


# Centralizamos la conexión a PostgreSQL: el engine y la fábrica de sesiones.
class DatabaseManager:
    # Inicializamos el manager sin conexión todavía
    def __init__(self):
        # Guardamos el engine de SQLAlchemy (se crea en initialize())
        self._engine = None

        # Guardamos la fábrica de sesiones (se crea en initialize())
        self._session_factory = None

    # Abrimos la conexión real a PostgreSQL
    def initialize(self):
        # Registramos que estamos por conectar
        logger.info("Initializing PostgreSQL connection...")

        # Creamos el engine con pool de conexiones. El search_path fija el esquema
        # de esta app dentro de la base compartida de Supabase, así los modelos
        # trabajan con nombres sin calificar. Va en connect_args y no en la URL
        # para que no dependa de cómo se haya pegado el .env.
        self._engine = create_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"options": f"-csearch_path={settings.DB_SCHEMA},public"},
        )

        # Creamos la fábrica de sesiones ligada a ese engine
        self._session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)

        # Registramos que la conexión quedó lista, sin exponer credenciales
        logger.info(f"PostgreSQL connected: {settings.DATABASE_URL.split('@')[-1]}")

    # Exponemos el engine para los pocos casos que necesitan SQL crudo
    @property
    def engine(self):
        # Fallamos explícitamente si alguien lo usa antes de initialize()
        if self._engine is None:
            raise RuntimeError("DatabaseManager.initialize() must be called before using the engine")

        # Devolvemos el engine ya construido
        return self._engine

    # Abrimos una sesión nueva para una unidad de trabajo
    def session(self) -> Session:
        # Fallamos explícitamente si alguien la pide antes de initialize()
        if self._session_factory is None:
            raise RuntimeError("DatabaseManager.initialize() must be called before opening sessions")

        # Devolvemos una sesión nueva
        return self._session_factory()

    # Cerramos el pool al apagar la aplicación
    def dispose(self):
        # Solo si llegamos a crear el engine
        if self._engine is not None:
            # Liberamos todas las conexiones del pool
            self._engine.dispose()

            # Registramos el cierre
            logger.info("PostgreSQL connection pool disposed")


# Creamos la instancia única que usa el resto de la app
db_manager = DatabaseManager()


# Definimos la dependencia de FastAPI que entrega una sesión por request
def get_db() -> Generator[Session, None, None]:
    # Abrimos la sesión para este request
    db = db_manager.session()

    # Entregamos la sesión y garantizamos su cierre pase lo que pase
    try:
        # Cedemos el control al handler
        yield db
    finally:
        # Cerramos la sesión al terminar el request
        db.close()
