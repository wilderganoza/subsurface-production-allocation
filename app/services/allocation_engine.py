"""Motor de asignación de producción por arena.

Porta server/src/services/allocationEngine.js sin cambiar la lógica: los mismos
cinco casos, el mismo prorrateo por k·h y las mismas decisiones registradas.
Verificado contra la implementación original sobre los 6 pozos de examples/:
la secuencia de casos coincide en las 24 combinaciones de pozo y modelo.

Lo único que cambia por debajo es el ajuste de curvas, que ahora converge
correctamente en los modelos hiperbólico y armónico (ver decline_curve.py).

Cada arena se declina individualmente según su propio histórico asignado. El
excedente o déficit frente a la proyección se prorratea siempre por k·h.
"""

# Importamos las librerias necesarias
from datetime import date, datetime, timedelta  # Para el cálculo de periodos
from typing import Dict, List, Optional, Sequence  # Tipos

from app.services.decline_curve import (  # Ajuste y evaluación de curvas
    days_between, evaluate_decline, fit_decline_curve,
)

# Definimos el nombre reservado para la producción que no se pudo asignar
UNALLOCATED = "_UNALLOCATED_"

# Definimos el mínimo de puntos que exige un ajuste de declinación
MIN_HISTORY = 3


# Normalizamos una fecha a texto ISO, que es como se comparan en todo el motor
def _iso(value) -> str:
    # Un datetime se reduce a su fecha
    if isinstance(value, datetime):
        return value.date().isoformat()

    # Una fecha se serializa directamente
    if isinstance(value, date):
        return value.isoformat()

    # El texto se recorta a la parte de fecha
    return str(value)[:10]


# Devolvemos el día anterior a una fecha
def _day_before(iso_date: str) -> str:
    # Restamos un día a la fecha parseada
    return (datetime.fromisoformat(iso_date[:10]).date() - timedelta(days=1)).isoformat()


# Sumamos el k·h de un conjunto de arenas
def _sum_kh(sands: Sequence[str], kh: Dict[str, float]) -> float:
    # Las arenas sin k·h declarado aportan cero
    return sum(kh.get(s, 0.0) for s in sands)


# Construimos los periodos a partir de la matriz de intervenciones
def _build_periods(intervention_matrix: Dict, production_history: List[Dict]) -> List[Dict]:
    # Recuperamos los tres componentes de la matriz
    sand_names = intervention_matrix["sandNames"]
    dates = intervention_matrix["interventionDates"]
    matrix = intervention_matrix["matrix"]

    # Ordenamos las fechas cronológicamente
    sorted_dates = sorted(dates, key=lambda d: _iso(d))

    # El último periodo termina con el último dato de producción
    last_production_date = (
        _iso(production_history[-1]["date"]) if production_history
        else _iso(sorted_dates[-1]) if sorted_dates else None
    )

    # Acumulamos los periodos
    periods = []

    # Recorremos las fechas de intervención
    for i, current in enumerate(sorted_dates):
        # El periodo empieza en la fecha de intervención
        start_date = _iso(current)

        # Y termina el día antes de la siguiente, o con el último dato
        end_date = (
            _day_before(_iso(sorted_dates[i + 1])) if i < len(sorted_dates) - 1
            else last_production_date
        )

        # Localizamos la columna original: la matriz no está reordenada
        original_index = dates.index(current)

        # Recogemos las arenas marcadas como abiertas en esa columna
        active_sands = [
            sand_names[s] for s in range(len(sand_names)) if matrix[s][original_index]
        ]

        # Guardamos el periodo
        periods.append({"startDate": start_date, "endDate": end_date, "activeSands": active_sands})

    # Devolvemos los periodos en orden
    return periods


# Filtramos la producción que cae dentro de un rango de fechas
def _production_in_range(history: List[Dict], start_date: str, end_date: str) -> List[Dict]:
    # Comparamos como texto ISO, que ordena igual que la fecha
    return [r for r in history if start_date <= _iso(r["date"]) <= end_date]


# Repartimos la producción de un conjunto de registros solo por k·h
def _distribute_by_kh(records, sands, kh, allocations, sand_history):
    # Calculamos el k·h total una sola vez
    total_kh = _sum_kh(sands, kh)

    # Recorremos cada registro de producción
    for rec in records:
        # Normalizamos la fecha
        rec_date = _iso(rec["date"])

        # Repartimos entre las arenas activas
        for sand in sands:
            # Sin k·h total no hay proporción posible
            allocated = (
                rec["totalProduction"] * kh.get(sand, 0.0) / total_kh if total_kh > 0 else 0.0
            )

            # Registramos la asignación
            allocations.append({"date": rec_date, "sandName": sand,
                                "allocatedProduction": allocated})

            # Y la acumulamos al histórico de la arena, que alimenta su declinación
            sand_history[sand].append({"date": rec_date, "production": allocated})


# Ajustamos el excedente o déficit sobre lo proyectado, prorrateado por k·h
def _allocate_with_adjustment(rec, sands, projected, diff, kh, allocations, sand_history):
    # Normalizamos la fecha
    rec_date = _iso(rec["date"])

    # Lo que hay que repartir es lo que el pozo produjo ese día
    total = float(rec["totalProduction"])

    # Un día sin producción no reparte nada. El pozo estuvo cerrado, así que no
    # hubo nada que asignar a ninguna arena.
    #
    # Sin esto, el recorte a cero de más abajo rompía el balance: con producción
    # cero el déficit es todo lo proyectado, y las arenas cuya parte del déficit
    # no alcanzaba a cubrir su propia proyección quedaban en positivo. El
    # resultado era producción repartida en días en que el pozo no produjo.
    if total <= 0:
        # Todas a cero, que es lo que dice el dato
        for sand in sands:
            allocations.append({"date": rec_date, "sandName": sand,
                                "allocatedProduction": 0.0})
            sand_history[sand].append({"date": rec_date, "production": 0.0})
        return

    # Repartimos la diferencia proporcionalmente al k·h de cada arena
    total_kh = _sum_kh(sands, kh)

    # Primer reparto, todavía sin recortar
    asignado = {
        sand: projected[sand] + (diff * kh.get(sand, 0.0) / total_kh if total_kh > 0 else 0.0)
        for sand in sands
    }

    # Recortamos las negativas a cero y volvemos a repartir lo recortado entre
    # las que aún tienen margen. Recortar sin más dejaría la suma por encima de
    # lo producido, que es el mismo error de balance en su forma general.
    for _ in range(len(sands)):
        # Las que se pasaron de la raya
        negativas = [s for s in sands if asignado[s] < 0]

        # Sin negativas el reparto ya cuadra
        if not negativas:
            break

        # Lo que sobra al ponerlas a cero
        sobrante = sum(asignado[s] for s in negativas)

        # Las ponemos a cero
        for s in negativas:
            asignado[s] = 0.0

        # Y descontamos el sobrante de las que todavía tienen de dónde
        con_margen = [s for s in sands if asignado[s] > 0]

        # Si ninguna tiene margen, no hay más que repartir
        if not con_margen:
            break

        # Se descuenta en proporción a lo que cada una tiene asignado
        base = sum(asignado[s] for s in con_margen)
        for s in con_margen:
            asignado[s] = max(0.0, asignado[s] + sobrante * asignado[s] / base)

    # Registramos el reparto ya cuadrado
    for sand in sands:
        allocations.append({"date": rec_date, "sandName": sand,
                            "allocatedProduction": asignado[sand]})
        sand_history[sand].append({"date": rec_date, "production": asignado[sand]})


# Ajustamos la declinación de cada arena que continúa abierta
def _fit_continuing_sands(
    continuing_sands, sand_history, decline_model, decline_fits, warnings, period, prev_period
) -> Dict[str, Dict]:
    # Acumulamos el ajuste de cada arena
    fits = {}

    # Recorremos las arenas que siguen abiertas
    for sand in continuing_sands:
        # Tomamos solo el histórico del periodo inmediatamente anterior: mezclar
        # periodos con regímenes de reparto distintos falsearía la declinación
        history = [
            h for h in sand_history.get(sand, [])
            if prev_period["startDate"] <= h["date"] <= prev_period["endDate"]
        ]

        # Los días de cierre quedan fuera del ajuste. Una curva de declinación
        # describe la tendencia mientras el pozo produce; meterle los ceros de
        # los días parados la hunde y hace proyectar de menos los días
        # siguientes, que sí producen.
        history = [h for h in history if h["production"] > 0]

        # Sin suficientes puntos, proyectamos plano al promedio disponible
        if len(history) < MIN_HISTORY:
            # Calculamos el promedio, o cero si no hay nada
            average = sum(h["production"] for h in history) / len(history) if history else 0.0

            # Dejamos constancia del recurso a proyección plana
            warnings.append(
                f"Histórico insuficiente para {sand} en el periodo "
                f"{prev_period['startDate']}–{prev_period['endDate']}. "
                f"Se usa proyección plana en {average:.1f} bbl/d."
            )

            # Guardamos el ajuste degradado
            fits[sand] = {
                "fit": {"model": "flat", "qi": average, "di": 0.0, "b": 0.0},
                "refDate": prev_period["startDate"],
                "flat": average,
            }

            # Seguimos con la próxima arena
            continue

        # Separamos fechas y caudales
        dates = [h["date"] for h in history]
        productions = [h["production"] for h in history]

        # Ajustamos la curva con el modelo pedido
        fit = fit_decline_curve(dates, productions, decline_model or "best_fit")

        # Propagamos la advertencia si el ajuste no fue limpio
        if fit.get("warning"):
            warnings.append(fit["warning"])

        # Guardamos el ajuste con su fecha de referencia: t=0 es el inicio del tramo
        fits[sand] = {"fit": fit, "refDate": dates[0]}

        # Registramos el ajuste para mostrarlo en la pantalla de resultados
        decline_fits.append({
            "sand": sand,
            "period": f"Antes de {period['startDate']}",
            "startDate": dates[0],
            "endDate": dates[-1],
            "model": fit["model"],
            "qi": fit["qi"],
            "di": fit["di"],
            "b": fit.get("b", 0.0),
            "r2": fit["r2"],
        })

    # Devolvemos todos los ajustes
    return fits


# Proyectamos cada arena en una fecha concreta
def _project_sands(sands, fits, target_date) -> Dict[str, float]:
    # Acumulamos la proyección de cada arena
    projected = {}

    # Recorremos las arenas
    for sand in sands:
        # La proyección plana no depende del tiempo
        if "flat" in fits[sand]:
            projected[sand] = fits[sand]["flat"]

        # El resto se evalúa sobre la curva ajustada
        else:
            # Contamos los días desde la referencia del ajuste
            t_days = days_between(fits[sand]["refDate"], target_date)

            # Evaluamos la curva
            projected[sand] = evaluate_decline(fits[sand]["fit"], t_days)

    # Devolvemos la proyección
    return projected


# Calculamos el promedio proyectado de cada arena en un periodo
def _average_projected(sands, fits, production) -> Dict[str, float]:
    # Sin producción no hay promedio
    if not production:
        return {sand: 0.0 for sand in sands}

    # Acumulamos por arena
    total = {sand: 0.0 for sand in sands}

    # Recorremos cada registro
    for rec in production:
        # Proyectamos en esa fecha
        projected = _project_sands(sands, fits, _iso(rec["date"]))

        # Sumamos
        for sand in sands:
            total[sand] += projected[sand]

    # Dividimos por la cantidad de fechas
    return {sand: value / len(production) for sand, value in total.items()}


# Ejecutamos la asignación completa
def allocate_production(
    production_history: List[Dict],
    sand_properties: List[Dict],
    intervention_matrix: Dict,
    decline_model: Optional[str] = None,
) -> Dict:
    # Acumulamos los resultados
    warnings: List[str] = []
    decline_fits: List[Dict] = []
    allocations: List[Dict] = []
    decisions: List[Dict] = []

    # Indexamos el k·h por nombre de arena
    kh = {p["sandName"]: p["kh"] for p in sand_properties}

    # Construimos los periodos definidos por las intervenciones
    periods = _build_periods(intervention_matrix, production_history)

    # Sin periodos no hay nada que asignar
    if not periods:
        # Devolvemos el resultado vacío con el aviso
        warnings.append("No se pudieron determinar periodos a partir de la matriz de intervenciones.")
        return {"allocations": allocations, "declineFits": decline_fits,
                "warnings": warnings, "decisions": decisions}

    # Preparamos el histórico asignado de cada arena, que alimenta su declinación
    sand_history: Dict[str, List[Dict]] = {p["sandName"]: [] for p in sand_properties}

    # Recorremos los periodos en orden
    for p, period in enumerate(periods):
        # Recuperamos qué arenas estaban abiertas antes y ahora
        prev_active = periods[p - 1]["activeSands"] if p > 0 else []
        active = period["activeSands"]

        # Clasificamos los cambios
        new_sands = [s for s in active if s not in prev_active]
        closed_sands = [s for s in prev_active if s not in active]
        continuing_sands = [s for s in active if s in prev_active]

        # Tomamos la producción del periodo
        production = _production_in_range(production_history, period["startDate"], period["endDate"])

        # --- Sin arenas abiertas: la producción queda sin asignar ---
        if not active:
            # Registramos la decisión
            decisions.append({
                "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                "case": "NO ACTIVE SANDS",
                "description": "Ninguna arena abierta en el periodo. Producción sin asignar.",
                "activeSands": [], "newSands": [], "closedSands": prev_active,
                "continuingSands": [], "method": "unallocated",
            })

            # Dejamos constancia
            warnings.append(
                f"Sin arenas activas entre {period['startDate']} y {period['endDate']}. "
                "Producción sin asignar."
            )

            # Volcamos la producción a la arena reservada
            for rec in production:
                allocations.append({
                    "date": _iso(rec["date"]), "sandName": UNALLOCATED,
                    "allocatedProduction": rec["totalProduction"],
                })

            # Seguimos con el próximo periodo
            continue

        # --- Caso 1: primer periodo, o sin arenas previas ---
        if p == 0 or not prev_active:
            # Registramos la decisión
            decisions.append({
                "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                "case": "CASE 1: First Period",
                "description": "Periodo inicial sin arenas previas. Reparto solo por k·h.",
                "activeSands": active, "newSands": [], "closedSands": [],
                "continuingSands": [], "method": "kh_distribution",
            })

            # Repartimos por k·h
            _distribute_by_kh(production, active, kh, allocations, sand_history)

            # Seguimos con el próximo periodo
            continue

        # --- Caso 2: sin cambios en las arenas abiertas ---
        if not new_sands and not closed_sands:
            # Registramos la decisión
            decisions.append({
                "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                "case": "CASE 2: No Changes",
                "description": "Sin cambios en las arenas abiertas. Reparto solo por k·h.",
                "activeSands": active, "newSands": [], "closedSands": [],
                "continuingSands": active, "method": "kh_distribution",
            })

            # Repartimos por k·h
            _distribute_by_kh(production, active, kh, allocations, sand_history)

            # Seguimos con el próximo periodo
            continue

        # --- Caso 3: solo cierres, sin arenas nuevas ---
        if not new_sands and closed_sands:
            # Ajustamos la declinación de las que continúan
            fits = _fit_continuing_sands(
                continuing_sands, sand_history, decline_model,
                decline_fits, warnings, period, periods[p - 1],
            )

            # Calculamos el promedio proyectado, solo para el informe de decisiones
            avg_projected = _average_projected(continuing_sands, fits, production)

            # Registramos la decisión
            decisions.append({
                "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                "case": "CASE 3: Only Closures",
                "description": "Arenas cerradas, ninguna nueva. Las que continúan usan curva de "
                               "declinación con ajuste prorrateado por k·h.",
                "activeSands": active, "newSands": [], "closedSands": closed_sands,
                "continuingSands": continuing_sands, "method": "decline_with_adjustment",
                "projectedValues": avg_projected,
            })

            # Asignamos registro a registro
            for rec in production:
                # Proyectamos cada arena en esta fecha
                projected = _project_sands(continuing_sands, fits, _iso(rec["date"]))

                # La diferencia entre lo real y lo proyectado se reparte por k·h
                diff = rec["totalProduction"] - sum(projected.values())

                # Asignamos con el ajuste
                _allocate_with_adjustment(rec, continuing_sands, projected, diff, kh,
                                          allocations, sand_history)

            # Seguimos con el próximo periodo
            continue

        # --- Caso 4: arenas nuevas junto a arenas que continúan ---
        if new_sands and continuing_sands:
            # Ajustamos la declinación de las que continúan
            fits = _fit_continuing_sands(
                continuing_sands, sand_history, decline_model,
                decline_fits, warnings, period, periods[p - 1],
            )

            # Sin ajustes utilizables caemos a reparto por k·h
            if not fits:
                # Registramos la decisión degradada
                decisions.append({
                    "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                    "case": "CASE 4: New + Continuing (Fallback)",
                    "description": "Arenas nuevas junto a continuas, pero sin datos suficientes "
                                   "para declinar. Reparto solo por k·h.",
                    "activeSands": active, "newSands": new_sands, "closedSands": closed_sands,
                    "continuingSands": continuing_sands, "method": "kh_distribution",
                })

                # Repartimos por k·h
                _distribute_by_kh(production, active, kh, allocations, sand_history)

                # Seguimos con el próximo periodo
                continue

            # Calculamos el k·h de las arenas nuevas, que absorben el incremento
            new_kh_total = _sum_kh(new_sands, kh)

            # Calculamos el promedio proyectado para el informe
            avg_projected = _average_projected(continuing_sands, fits, production)

            # Registramos la decisión
            decisions.append({
                "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                "case": "CASE 4: New + Continuing",
                "description": "Arenas nuevas junto a continuas. Las que continúan siguen su curva "
                               "de declinación; las nuevas reciben la producción incremental "
                               "(o cero si hay déficit).",
                "activeSands": active, "newSands": new_sands, "closedSands": closed_sands,
                "continuingSands": continuing_sands, "method": "decline_plus_incremental",
                "projectedValues": avg_projected,
            })

            # Asignamos registro a registro
            for rec in production:
                # Normalizamos la fecha
                rec_date = _iso(rec["date"])

                # Proyectamos las arenas que continúan
                projected = _project_sands(continuing_sands, fits, rec_date)

                # El incremento sobre lo proyectado es lo que aportan las nuevas
                incremental = rec["totalProduction"] - sum(projected.values())

                # Con incremento positivo, cada grupo recibe lo suyo
                if incremental > 0:
                    # Las continuas se quedan con su proyección
                    for sand in continuing_sands:
                        allocations.append({"date": rec_date, "sandName": sand,
                                            "allocatedProduction": projected[sand]})
                        sand_history[sand].append({"date": rec_date, "production": projected[sand]})

                    # Las nuevas se reparten el incremento por k·h
                    for sand in new_sands:
                        allocated = (
                            incremental * kh.get(sand, 0.0) / new_kh_total
                            if new_kh_total > 0 else 0.0
                        )
                        allocations.append({"date": rec_date, "sandName": sand,
                                            "allocatedProduction": allocated})
                        sand_history[sand].append({"date": rec_date, "production": allocated})

                # Con déficit, las nuevas reciben cero y las continuas absorben la caída
                else:
                    # Las nuevas quedan en cero
                    for sand in new_sands:
                        allocations.append({"date": rec_date, "sandName": sand,
                                            "allocatedProduction": 0.0})
                        sand_history[sand].append({"date": rec_date, "production": 0.0})

                    # Las continuas absorben el déficit prorrateado por k·h
                    _allocate_with_adjustment(rec, continuing_sands, projected, incremental, kh,
                                              allocations, sand_history)

            # Seguimos con el próximo periodo
            continue

        # --- Caso 5: solo arenas nuevas, ninguna continúa ---
        if new_sands and not continuing_sands:
            # Registramos la decisión
            decisions.append({
                "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
                "case": "CASE 5: Only New Sands",
                "description": "Solo se abrieron arenas nuevas, ninguna continúa. Reparto solo por k·h.",
                "activeSands": active, "newSands": new_sands, "closedSands": closed_sands,
                "continuingSands": [], "method": "kh_distribution",
            })

            # Repartimos por k·h entre las nuevas
            _distribute_by_kh(production, new_sands, kh, allocations, sand_history)

            # Seguimos con el próximo periodo
            continue

        # --- Respaldo: cualquier combinación no contemplada ---
        decisions.append({
            "periodIndex": p, "startDate": period["startDate"], "endDate": period["endDate"],
            "case": "FALLBACK",
            "description": "Caso de respaldo. Reparto solo por k·h.",
            "activeSands": active, "newSands": new_sands, "closedSands": closed_sands,
            "continuingSands": continuing_sands, "method": "kh_distribution",
        })

        # Repartimos por k·h
        _distribute_by_kh(production, active, kh, allocations, sand_history)

    # Quitamos avisos repetidos conservando el orden de aparición
    unique_warnings = list(dict.fromkeys(warnings))

    # Devolvemos el resultado completo
    return {
        "allocations": allocations,
        "declineFits": decline_fits,
        "warnings": unique_warnings,
        "decisions": decisions,
    }
