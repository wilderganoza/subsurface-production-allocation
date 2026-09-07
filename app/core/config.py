# Importamos las librerias necesarias
from typing import List  # Tipo para anotar la lista de orígenes CORS
from pydantic_settings import BaseSettings  # Base que lee la configuración desde variables de entorno / .env
from pydantic import Field, model_validator  # Field para declarar cada setting, model_validator para validar tras cargar todo


# Definimos el valor placeholder de SECRET_KEY, para poder detectar si nunca se cambió
DEFAULT_SECRET_KEY = "change-this-secret-key-in-production"


# Declaramos la configuración global de la aplicación, cargada desde variables de entorno o .env
class Settings(BaseSettings):
    # Guardamos el nombre de la aplicación
    APP_NAME: str = Field(default="Subsurface Production Allocation")

    # Guardamos la versión de la aplicación
    APP_VERSION: str = Field(default="1.0.0")

    # Guardamos si el modo debug está activo
    DEBUG: bool = Field(default=False)

    # Guardamos el entorno actual (development | production)
    ENVIRONMENT: str = Field(default="production")

    # Guardamos el host donde escucha el servidor
    HOST: str = Field(default="0.0.0.0")

    # Guardamos el puerto donde escucha el servidor
    PORT: int = Field(default=8002)

    # Guardamos la URL de conexión a PostgreSQL (Supabase)
    DATABASE_URL: str = Field(default="postgresql://postgres:postgres@localhost:5432/postgres")

    # Guardamos el esquema donde vive esta app dentro de la base compartida
    DB_SCHEMA: str = Field(default="spa")

    # Guardamos la URL del proyecto Supabase (para Auth)
    SUPABASE_URL: str = Field(default="")

    # Guardamos la clave publicable de Supabase
    SUPABASE_PUBLISHABLE_KEY: str = Field(default="")

    # Guardamos la clave de servicio, necesaria solo para administrar cuentas
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")

    # Guardamos el nombre de la cookie donde viaja el token de sesión
    SESSION_COOKIE_NAME: str = Field(default="spa_session")

    # Guardamos el nombre de la cookie donde viaja el refresh token
    REFRESH_COOKIE_NAME: str = Field(default="spa_refresh")

    # Guardamos si las cookies exigen HTTPS
    COOKIE_SECURE: bool = Field(default=True)

    # Guardamos los orígenes permitidos para CORS
    CORS_ORIGINS: List[str] = Field(default=[])

    # Guardamos la clave secreta usada para firmar cookies propias
    SECRET_KEY: str = Field(default=DEFAULT_SECRET_KEY)

    # Guardamos el nivel de logging de la aplicación
    LOG_LEVEL: str = Field(default="INFO")

    # Guardamos el tamaño máximo aceptado por archivo subido, en megabytes
    MAX_UPLOAD_MB: int = Field(default=25)

    # Guardamos el mínimo de puntos que exige un ajuste de declinación.
    # Por debajo de tres, el motor cae a proyección plana y avisa.
    MIN_DECLINE_POINTS: int = Field(default=3)

    # Validamos que la app no arranque en producción con la clave placeholder
    @model_validator(mode="after")
    def check_secret_key_in_production(self) -> "Settings":
        # Detectamos la combinación peligrosa: producción + SECRET_KEY sin configurar
        if self.ENVIRONMENT == "production" and not self.DEBUG and self.SECRET_KEY == DEFAULT_SECRET_KEY:
            # Rechazamos el arranque en vez de servir con una clave insegura conocida
            raise ValueError("SECRET_KEY must be set via environment variable in production; refusing to start with the default placeholder key")

        # Devolvemos la instancia validada
        return self

    # Configuramos cómo pydantic-settings carga estos valores
    class Config:
        # Leemos las variables desde el archivo .env si existe
        env_file = ".env"

        # Exigimos que los nombres respeten mayúsculas/minúsculas
        case_sensitive = True

        # Ignoramos las variables que no declaramos aquí. Mientras dure la
        # migración este .env lo comparten el servidor Express que sale y esta app.
        extra = "ignore"


# Creamos la instancia única de configuración que usa el resto de la app
settings = Settings()
