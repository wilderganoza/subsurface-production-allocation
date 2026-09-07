"""Pruebas del ajuste de curvas de declinación.

Los casos usan datos sintéticos generados con parámetros conocidos, así que el
ajuste correcto es verificable: debe recuperar esos mismos parámetros.

Contexto de la migración: la implementación JavaScript anterior
(`ml-levenberg-marquardt`) no converge en los modelos hiperbólico y armónico —
deja `b` pegado al límite superior y devuelve R² de 0.66 y 0.38 sobre datos que
son exactamente hiperbólicos y armónicos. Estas pruebas fijan el comportamiento
correcto para que la regresión no vuelva a colarse.
"""

# Importamos las librerias necesarias
import math  # Para generar los datos sintéticos
from datetime import date, timedelta  # Para construir las series de fechas

import pytest  # Framework de pruebas

from app.services.decline_curve import (  # Funciones bajo prueba
    fit_decline_curve, compute_r2, days_between, evaluate_decline,
)


# Generamos una serie de fechas mensuales
def fechas(n, paso=30, inicio=date(2024, 1, 1)):
    # Devolvemos las fechas en formato ISO, como llegan del Excel
    return [(inicio + timedelta(days=i * paso)).isoformat() for i in range(n)]


# --- Recuperación exacta de parámetros -------------------------------------

# Comprobamos que el ajuste exponencial recupera los parámetros originales
def test_exponencial_recupera_parametros():
    # Generamos 24 meses con parámetros conocidos
    qi, di = 1200.0, 0.0035
    produccion = [qi * math.exp(-di * i * 30) for i in range(24)]

    # Ajustamos
    ajuste = fit_decline_curve(fechas(24), produccion, "exponential")

    # El ajuste debe ser perfecto y recuperar los parámetros
    assert ajuste["model"] == "exponential"
    assert ajuste["r2"] == pytest.approx(1.0, abs=1e-6)
    assert ajuste["qi"] == pytest.approx(qi, rel=1e-4)
    assert ajuste["di"] == pytest.approx(di, rel=1e-4)


# Comprobamos que el ajuste hiperbólico recupera los parámetros originales.
# Este es el caso donde la implementación JavaScript fallaba.
def test_hiperbolica_recupera_parametros():
    # Generamos 24 meses con parámetros conocidos
    qi, di, b = 950.0, 0.006, 0.7
    produccion = [qi / (1 + b * di * i * 30) ** (1 / b) for i in range(24)]

    # Ajustamos
    ajuste = fit_decline_curve(fechas(24), produccion, "hyperbolic")

    # El ajuste debe ser perfecto y recuperar los tres parámetros
    assert ajuste["model"] == "hyperbolic"
    assert ajuste["r2"] == pytest.approx(1.0, abs=1e-6)
    assert ajuste["qi"] == pytest.approx(qi, rel=1e-4)
    assert ajuste["di"] == pytest.approx(di, rel=1e-4)
    assert ajuste["b"] == pytest.approx(b, rel=1e-4)

    # El exponente no debe quedar pegado al límite: eso indicaría divergencia
    assert ajuste["b"] < 1.9


# Comprobamos que el ajuste armónico recupera los parámetros originales.
# La implementación JavaScript devolvía R² de 0.38 en este caso.
def test_armonica_recupera_parametros():
    # Generamos 24 meses con parámetros conocidos
    qi, di = 700.0, 0.004
    produccion = [qi / (1 + di * i * 30) for i in range(24)]

    # Ajustamos
    ajuste = fit_decline_curve(fechas(24), produccion, "harmonic")

    # El ajuste debe ser perfecto
    assert ajuste["model"] == "harmonic"
    assert ajuste["r2"] == pytest.approx(1.0, abs=1e-6)
    assert ajuste["qi"] == pytest.approx(qi, rel=1e-4)
    assert ajuste["di"] == pytest.approx(di, rel=1e-4)
    assert ajuste["b"] == 1.0


# --- Selección automática de modelo ----------------------------------------

# Comprobamos que best_fit elige el modelo correcto.
# La implementación JavaScript elegía exponencial sobre datos hiperbólicos.
@pytest.mark.parametrize("modelo_real,generador,params", [
    ("exponential", lambda qi, di, b, t: qi * math.exp(-di * t), (1200.0, 0.0035, 0.0)),
    ("hyperbolic", lambda qi, di, b, t: qi / (1 + b * di * t) ** (1 / b), (880.0, 0.0075, 1.3)),
    ("harmonic", lambda qi, di, b, t: qi / (1 + di * t), (700.0, 0.004, 1.0)),
])
def test_best_fit_elige_el_modelo_correcto(modelo_real, generador, params):
    # Generamos la serie con el modelo indicado
    qi, di, b = params
    produccion = [generador(qi, di, b, i * 30) for i in range(24)]

    # Dejamos que el ajuste elija solo
    ajuste = fit_decline_curve(fechas(24), produccion, "best_fit")

    # Debe alcanzar un ajuste esencialmente perfecto
    assert ajuste["r2"] > 0.9999

    # La armónica es un caso particular de la hiperbólica con b=1, así que
    # aceptamos cualquiera de las dos cuando los datos son armónicos.
    if modelo_real == "harmonic":
        assert ajuste["model"] in ("harmonic", "hyperbolic")
    else:
        assert ajuste["model"] == modelo_real


# --- Casos límite ----------------------------------------------------------

# Comprobamos que menos de tres puntos devuelve la advertencia sin ajustar
def test_datos_insuficientes():
    # Solo dos puntos
    ajuste = fit_decline_curve(fechas(2), [500.0, 460.0], "exponential")

    # Debe avisar y marcar el ajuste como no válido
    assert ajuste["r2"] == -1.0
    assert "insuficientes" in ajuste["warning"].lower()
    assert ajuste["qi"] == 500.0


# Comprobamos que tres puntos, el mínimo, sí ajusta
def test_tres_puntos_ajusta():
    # Serie en el límite inferior
    ajuste = fit_decline_curve(fechas(3), [500.0, 460.0, 425.0], "exponential")

    # Debe ajustar bien: la serie es casi exponencial
    assert ajuste["r2"] > 0.99
    assert "warning" not in ajuste


# Comprobamos que una producción constante no rompe el cálculo
def test_produccion_plana():
    # Sin varianza, el R² se define como cero
    ajuste = fit_decline_curve(fechas(8), [300.0] * 8, "exponential")

    # No debe fallar, y el caudal inicial debe ser el valor constante
    assert ajuste["qi"] == pytest.approx(300.0, rel=1e-3)
    assert ajuste["r2"] == 0.0


# Comprobamos que las fechas irregulares se manejan por días reales
def test_fechas_irregulares():
    # Días con espaciado desigual, como en un histórico real
    dias = [0, 12, 45, 51, 90, 137, 150, 210, 245, 300]
    qi, di = 1100.0, 0.0031
    fechas_irregulares = [(date(2024, 1, 1) + timedelta(days=d)).isoformat() for d in dias]
    produccion = [qi * math.exp(-di * d) for d in dias]

    # Ajustamos
    ajuste = fit_decline_curve(fechas_irregulares, produccion, "best_fit")

    # Debe recuperar los parámetros pese al espaciado irregular
    assert ajuste["r2"] > 0.9999
    assert ajuste["qi"] == pytest.approx(qi, rel=1e-3)


# --- Utilidades ------------------------------------------------------------

# Comprobamos el cálculo de días entre fechas
def test_days_between():
    # Fechas en formato ISO
    assert days_between("2024-01-01", "2024-01-31") == 30

    # Misma fecha
    assert days_between("2024-01-01", "2024-01-01") == 0

    # Con marca de zona horaria, como devuelve Postgres
    assert days_between("2024-01-01T00:00:00Z", "2024-02-01T00:00:00Z") == 31


# Comprobamos el cálculo del coeficiente de determinación
def test_compute_r2():
    # Predicción perfecta
    assert compute_r2([1, 2, 3], [1, 2, 3]) == pytest.approx(1.0)

    # Serie constante: sin varianza que explicar
    assert compute_r2([5, 5, 5], [5, 5, 5]) == 0.0

    # Predicción igual a la media: no explica nada
    assert compute_r2([1, 2, 3], [2, 2, 2]) == pytest.approx(0.0)


# Comprobamos que evaluate_decline reproduce la curva ajustada
def test_evaluar_reproduce_la_curva():
    # Serie exponencial conocida
    qi, di = 1200.0, 0.0035
    produccion = [qi * math.exp(-di * i * 30) for i in range(24)]
    ajuste = fit_decline_curve(fechas(24), produccion, "exponential")

    # En t=0 debe devolver el caudal inicial
    assert evaluate_decline(ajuste, 0) == pytest.approx(produccion[0], rel=1e-3)

    # En el último punto debe devolver el último caudal
    assert evaluate_decline(ajuste, 23 * 30) == pytest.approx(produccion[-1], rel=1e-3)

    # Extrapolando hacia adelante debe seguir decreciendo
    assert evaluate_decline(ajuste, 30 * 30) < evaluate_decline(ajuste, 23 * 30)
