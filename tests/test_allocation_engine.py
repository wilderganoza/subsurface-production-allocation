"""Pruebas del motor de asignación.

Cubren el invariante que define el motor: lo repartido entre arenas suma
exactamente lo que produjo el pozo ese día. Incluidos los días de cierre, en
los que no se reparte nada.
"""

# Importamos las librerias necesarias
from collections import defaultdict  # Para agrupar por fecha

from app.services.allocation_engine import allocate_production  # Motor a probar


# Construimos un caso con dos arenas, una intervención y algunos días de cierre
def _caso_base():
    # Producción diaria declinando, con tres días de pozo cerrado
    produccion = []

    # Generamos 60 días
    for i in range(60):
        # Los días 20, 21 y 45 el pozo estuvo parado
        cerrado = i in (20, 21, 45)

        # La fecha avanza de uno en uno desde el 1 de enero
        dia = f"2024-01-{i + 1:02d}" if i < 31 else f"2024-02-{i - 30:02d}"

        # El caudal declina un 0,5 % diario
        produccion.append({
            "date": dia,
            "totalProduction": 0.0 if cerrado else 1000.0 * (0.995 ** i),
        })

    # Dos arenas con k·h distinto
    arenas = [{"sandName": "A-1", "kh": 800.0}, {"sandName": "B-2", "kh": 200.0}]

    # Una intervención a mitad de serie que abre una tercera arena
    matriz = {
        "sandNames": ["A-1", "B-2"],
        "interventionDates": ["2024-01-01", "2024-02-01"],
        "matrix": [[True, True], [True, True]],
    }

    # Devolvemos el caso completo
    return produccion, arenas, matriz


# Agrupamos lo asignado por fecha
def _por_fecha(resultado):
    # Acumulamos el reparto de cada día
    total = defaultdict(float)

    # Recorremos las asignaciones
    for a in resultado["allocations"]:
        total[a["date"]] += a["allocatedProduction"]

    # Devolvemos el diccionario
    return total


# Comprobamos que lo repartido cuadre con lo producido, día a día
def test_lo_repartido_cuadra_con_lo_producido():
    # Preparamos el caso
    produccion, arenas, matriz = _caso_base()

    # Ejecutamos el motor
    resultado = allocate_production(produccion, arenas, matriz, "best_fit")

    # Agrupamos por fecha
    repartido = _por_fecha(resultado)

    # Cada día debe cuadrar
    for rec in produccion:
        # Comparamos con una tolerancia de redondeo
        assert abs(repartido[rec["date"]] - rec["totalProduction"]) < 0.01, (
            f"{rec['date']}: repartido {repartido[rec['date']]:.4f}, "
            f"producido {rec['totalProduction']:.4f}"
        )


# Comprobamos que los días de cierre no reparten nada
def test_los_dias_de_cierre_reparten_cero():
    # Preparamos el caso
    produccion, arenas, matriz = _caso_base()

    # Ejecutamos el motor
    resultado = allocate_production(produccion, arenas, matriz, "best_fit")

    # Agrupamos por fecha
    repartido = _por_fecha(resultado)

    # Los días sin producción son los que hay que revisar
    cerrados = [r["date"] for r in produccion if r["totalProduction"] == 0]

    # El caso tiene tres
    assert len(cerrados) == 3

    # Y en ninguno debe haberse repartido nada
    for dia in cerrados:
        assert repartido[dia] == 0.0, f"{dia} reparte {repartido[dia]:.4f}"


# Comprobamos que ninguna arena recibe producción negativa
def test_no_hay_asignaciones_negativas():
    # Preparamos el caso
    produccion, arenas, matriz = _caso_base()

    # Ejecutamos el motor
    resultado = allocate_production(produccion, arenas, matriz, "best_fit")

    # Ninguna asignación puede ser negativa
    for a in resultado["allocations"]:
        assert a["allocatedProduction"] >= 0.0, (
            f"{a['date']} {a['sandName']}: {a['allocatedProduction']}"
        )


# Comprobamos que los días de cierre no hunden el ajuste de la declinación
def test_los_dias_de_cierre_no_entran_en_el_ajuste():
    # Preparamos dos casos iguales salvo por los días de cierre
    produccion, arenas, matriz = _caso_base()

    # El mismo caso pero sin los días parados
    sin_cierres = [r for r in produccion if r["totalProduction"] > 0]

    # Ejecutamos los dos
    con = allocate_production(produccion, arenas, matriz, "exponential")
    sin = allocate_production(sin_cierres, arenas, matriz, "exponential")

    # Tomamos el R² medio de cada uno
    def r2_medio(resultado):
        # Recogemos los ajustes que trajeron R²
        valores = [f["r2"] for f in resultado["declineFits"] if f.get("r2") is not None]

        # Devolvemos el promedio, o cero si no hubo ajustes
        return sum(valores) / len(valores) if valores else 0.0

    # Quitar los días de cierre no debería cambiar apenas el ajuste, porque el
    # motor ya los excluye. Si volviera a incluirlos, el de "con" caería.
    assert abs(r2_medio(con) - r2_medio(sin)) < 0.15, (
        f"con cierres {r2_medio(con):.3f}, sin cierres {r2_medio(sin):.3f}"
    )
