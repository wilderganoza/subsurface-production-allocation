"""Ajuste de curvas de declinación de Arps.

Porta server/src/services/declineCurve.js. El ajuste pasa de
`ml-levenberg-marquardt` (JavaScript) a `scipy.optimize.curve_fit`, que resuelve
el mismo problema de mínimos cuadrados no lineales con límites por parámetro.

La implementación JavaScript no converge en los modelos hiperbólico y armónico:
deja el exponente pegado al límite superior y devuelve R² de 0.66 y 0.38 sobre
datos que son exactamente hiperbólicos y armónicos. Las pruebas de
tests/test_decline_curve.py fijan el comportamiento correcto.
"""

# Importamos las librerias necesarias
from datetime import date, datetime  # Para convertir fechas a días transcurridos
from typing import Dict, Optional, Sequence, Union  # Tipos

import numpy as np  # Operaciones vectoriales
from scipy.optimize import curve_fit  # Ajuste no lineal con límites

# Definimos los modelos que sabemos ajustar
MODELS = ("exponential", "hyperbolic", "harmonic")

# Definimos el mínimo de puntos que exige un ajuste con sentido
MIN_POINTS = 3


# --- Modelos de Arps -------------------------------------------------------

# Declinación exponencial: la tasa cae un porcentaje constante del caudal actual
def exponential_model(t, qi, di):
    # q(t) = qi * e^(-di*t)
    return qi * np.exp(-di * t)


# Declinación hiperbólica: la tasa de caída se suaviza con el tiempo
def hyperbolic_model(t, qi, di, b):
    # q(t) = qi / (1 + b*di*t)^(1/b)
    return qi / np.power(1.0 + b * di * t, 1.0 / b)


# Declinación armónica: caso particular de la hiperbólica con b = 1
def harmonic_model(t, qi, di):
    # q(t) = qi / (1 + di*t)
    return qi / (1.0 + di * t)


# Asociamos cada nombre de modelo con su función
MODEL_FUNCTIONS = {
    "exponential": exponential_model,
    "hyperbolic": hyperbolic_model,
    "harmonic": harmonic_model,
}


# --- Utilidades ------------------------------------------------------------

# Normalizamos una fecha, que puede llegar como texto o como objeto
def _to_date(value: Union[str, date, datetime]) -> date:
    # Un datetime se reduce a su fecha
    if isinstance(value, datetime):
        return value.date()

    # Una fecha se devuelve tal cual
    if isinstance(value, date):
        return value

    # El texto se parsea en formato ISO, tolerando la marca de zona
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()


# Calculamos los días entre dos fechas
def days_between(date_a, date_b) -> int:
    # Restamos las fechas ya normalizadas
    return (_to_date(date_b) - _to_date(date_a)).days


# Calculamos el coeficiente de determinación
def compute_r2(actual: Sequence[float], predicted: Sequence[float]) -> float:
    # Convertimos a arreglos para operar vectorialmente
    y = np.asarray(actual, dtype=float)
    y_hat = np.asarray(predicted, dtype=float)

    # Sumas de cuadrados total y residual
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    ss_res = float(np.sum((y - y_hat) ** 2))

    # Una serie constante no tiene varianza que explicar
    if ss_tot == 0:
        return 0.0

    # Devolvemos el R² clásico
    return 1.0 - ss_res / ss_tot


# Estimamos un valor inicial razonable para la tasa de declinación
def estimate_initial_di(t: Sequence[float], q: Sequence[float]) -> float:
    # Sin al menos dos puntos, o con caudales no positivos, usamos el valor por defecto
    if len(t) < 2 or q[0] <= 0 or q[-1] <= 0:
        return 0.001

    # El último tiempo no puede ser cero, o dividiríamos por él
    last_t = t[-1]

    # Con todos los puntos en el mismo día tampoco podemos estimar
    if last_t == 0:
        return 0.001

    # Despejamos di de la forma exponencial y lo acotamos al rango admisible
    return max(1e-6, min(0.5, -np.log(q[-1] / q[0]) / last_t))


# --- Ajuste ----------------------------------------------------------------

# Ajustamos un modelo concreto a la serie
def _fit_single_model(t: np.ndarray, q: np.ndarray, model: str) -> Dict:
    # Tomamos el primer caudal como estimación inicial de qi
    qi0 = float(q[0]) if q[0] else 1.0

    # Estimamos la tasa de declinación inicial
    di0 = estimate_initial_di(t, q)

    # Acotamos qi con el rango observado, igual que la versión JavaScript
    positive = q[q > 0]
    q_min = float(positive.min()) if positive.size else 0.1
    q_max = float(q.max()) if q.max() else 1.0

    # Componemos los valores iniciales y los límites según el modelo
    if model == "hyperbolic":
        # La hiperbólica suma el exponente b
        p0 = [qi0, di0, 0.5]
        bounds = ([0.1 * q_min, 1e-7, 0.001], [10 * q_max, 1.0, 2.0])
    else:
        # Exponencial y armónica comparten dos parámetros
        p0 = [qi0, di0]
        bounds = ([0.1 * q_min, 1e-7], [10 * q_max, 1.0])

    # Recuperamos la función del modelo
    model_fn = MODEL_FUNCTIONS[model]

    # Intentamos el ajuste
    try:
        # curve_fit con límites usa trust region reflective, que resuelve el
        # mismo problema acotado que el LM con min/max de la versión JavaScript
        params, _ = curve_fit(model_fn, t, q, p0=p0, bounds=bounds, maxfev=20000)

        # Evaluamos el modelo ajustado sobre los mismos tiempos
        predicted = model_fn(t, *params)

        # Calculamos la calidad del ajuste
        r2 = compute_r2(q, predicted)

        # Componemos el resultado según el modelo
        if model == "exponential":
            return {"model": "exponential", "qi": float(params[0]),
                    "di": float(params[1]), "b": 0.0, "r2": r2}

        if model == "hyperbolic":
            return {"model": "hyperbolic", "qi": float(params[0]),
                    "di": float(params[1]), "b": float(params[2]), "r2": r2}

        # La armónica es la hiperbólica con b fijo en 1
        return {"model": "harmonic", "qi": float(params[0]),
                "di": float(params[1]), "b": 1.0, "r2": r2}

    # Un ajuste que no converge devuelve la estimación inicial marcada con r2 = -1,
    # igual que hacía la versión JavaScript, para que el mejor ajuste la descarte
    except Exception as exc:
        # Elegimos el b que corresponde al modelo pedido
        default_b = 0.5 if model == "hyperbolic" else (1.0 if model == "harmonic" else 0.0)

        # Devolvemos el resultado degradado con el motivo
        return {
            "model": model,
            "qi": qi0,
            "di": di0,
            "b": default_b,
            "r2": -1.0,
            "warning": f"El ajuste {model} no convergió: {exc}",
        }


# Ajustamos la curva de declinación de una serie de producción
def fit_decline_curve(
    dates: Sequence[Union[str, date, datetime]],
    productions: Sequence[float],
    decline_model: str = "best_fit",
) -> Dict:
    # Con menos de tres puntos no hay ajuste posible
    if len(dates) < MIN_POINTS:
        # Devolvemos una estimación degradada con la advertencia
        return {
            "model": "exponential",
            "qi": float(productions[0]) if len(productions) else 0.0,
            "di": 0.001,
            "b": 0.0,
            "r2": -1.0,
            "warning": f"Datos insuficientes para ajustar la curva (< {MIN_POINTS} puntos)",
        }

    # Convertimos las fechas a días transcurridos desde la primera
    t = np.array([days_between(dates[0], d) for d in dates], dtype=float)

    # Convertimos las producciones a arreglo
    q = np.asarray(productions, dtype=float)

    # Elegimos qué modelos probar
    candidates = list(MODELS) if decline_model == "best_fit" else [decline_model]

    # Ajustamos cada candidato
    fits = [_fit_single_model(t, q, m) for m in candidates]

    # Nos quedamos con el de mejor R²
    fits.sort(key=lambda f: f["r2"], reverse=True)

    # Devolvemos el mejor
    return fits[0]


# Evaluamos un ajuste ya calculado en un instante dado
def evaluate_decline(fit: Dict, t_days: float) -> float:
    # Recuperamos los parámetros
    qi = fit["qi"]
    di = fit["di"]
    b = fit.get("b", 0.0)

    # Aplicamos el modelo correspondiente
    if fit["model"] == "exponential":
        return float(exponential_model(t_days, qi, di))

    # La hiperbólica necesita el exponente
    if fit["model"] == "hyperbolic":
        return float(hyperbolic_model(t_days, qi, di, b))

    # Por defecto, armónica
    return float(harmonic_model(t_days, qi, di))
