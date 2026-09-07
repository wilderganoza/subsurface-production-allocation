# Importamos las librerias necesarias
import logging  # Librería estándar de logging
import sys  # Para escribir los logs a stdout

from app.core.config import settings  # Para leer el nivel de log configurado

# Guardamos una bandera para configurar el logging una sola vez por proceso
_CONFIGURED = False


# Configuramos el logging raíz la primera vez que alguien pide un logger
def _configure() -> None:
    # Usamos la bandera de módulo para no reconfigurar en cada llamada
    global _CONFIGURED

    # Si ya configuramos, no repetimos el trabajo
    if _CONFIGURED:
        return

    # Definimos el formato: hora, nivel, módulo y mensaje
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s  %(levelname)-8s %(name)s  %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )

    # Marcamos que ya quedó configurado
    _CONFIGURED = True


# Devolvemos un logger listo para usar en cualquier módulo
def get_logger(name: str) -> logging.Logger:
    # Nos aseguramos de que el logging raíz esté configurado
    _configure()

    # Devolvemos el logger con el nombre del módulo que lo pidió
    return logging.getLogger(name)
