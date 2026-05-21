# Plan de Precios y Estimación de Ingresos
## Subsurface Production Allocation — SaaS O&G

**Fecha:** Mayo 2026  
**Modelo de negocio:** SaaS por suscripción, tarifa basada en número de pozos

---

## 1. Contexto y Propuesta de Valor

La plataforma resuelve un problema crítico en la industria de petróleo y gas: la **asignación correcta de producción por arena geológica** dentro de un pozo multilateral o multi-arena. Una asignación incorrecta impacta directamente en:

- Reportes de producción erróneos ante organismos regulatorios
- Decisiones de workover y intervención basadas en datos incorrectos
- Pérdida de valor de reservas estimadas

**Clientes objetivo:**
- Operadoras E&P pequeñas y medianas (1–200 pozos activos)
- Empresas de servicios de ingeniería de yacimientos
- Consultoras independientes de petróleo y gas

---

## 2. Modelo de Tarificación: Costo por Pozo

El indicador de valor central es el **número de pozos activos** gestionados en la plataforma. A mayor cartera de pozos, mayor valor entregado y mayor precio total, con descuento por volumen incorporado en los planes superiores.

### Precio base por pozo / mes (plan mensual)

| Plan         | Pozos incluidos | Precio/pozo/mes |
|--------------|-----------------|-----------------|
| Explorer     | Hasta 10        | USD 30.00       |
| Professional | Hasta 50        | USD 20.00       |
| Enterprise   | Hasta 200       | USD 15.00       |
| Custom       | > 200           | A cotizar       |

---

## 3. Planes y Precios

### Plan Explorer — Hasta 10 pozos

| Ciclo de facturación | Precio/mes | Precio total     | Ahorro vs mensual |
|----------------------|------------|------------------|--------------------|
| **Mensual**          | USD 299    | USD 299/mes      | —                  |
| **Trimestral**       | USD 269    | USD 807/trimestre  | 10% (USD 30/mes)  |
| **Anual**            | USD 239    | USD 2,868/año    | 20% (USD 60/mes)  |

**Incluye:**
- Hasta 10 pozos activos simultáneos
- Asignación de producción por arena (modelos Arps: exponencial, hiperbólico, armónico)
- Curvas de declinación con ajuste Levenberg-Marquardt
- Gestión de eventos e intervenciones (apertura/cierre de arenas)
- Exportación de resultados a Excel
- 2 usuarios
- Soporte por email (respuesta < 48 h)

---

### Plan Professional — Hasta 50 pozos *(Recomendado)*

| Ciclo de facturación | Precio/mes | Precio total       | Ahorro vs mensual |
|----------------------|------------|--------------------|-------------------|
| **Mensual**          | USD 999    | USD 999/mes        | —                 |
| **Trimestral**       | USD 899    | USD 2,697/trimestre | 10% (USD 100/mes) |
| **Anual**            | USD 799    | USD 9,588/año      | 20% (USD 200/mes) |

**Incluye todo lo del Explorer, más:**
- Hasta 50 pozos activos simultáneos
- Usuarios ilimitados
- Modelo de declinación "best fit" automático
- Gestión avanzada de intervenciones multi-evento
- Soporte prioritario (respuesta < 24 h)

---

### Plan Enterprise — Hasta 200 pozos

| Ciclo de facturación | Precio/mes  | Precio total        | Ahorro vs mensual  |
|----------------------|-------------|---------------------|--------------------|
| **Mensual**          | USD 2,999   | USD 2,999/mes       | —                  |
| **Trimestral**       | USD 2,699   | USD 8,097/trimestre  | 10% (USD 300/mes) |
| **Anual**            | USD 2,399   | USD 28,788/año      | 20% (USD 600/mes) |

**Incluye todo lo del Professional, más:**
- Hasta 200 pozos activos simultáneos
- Usuarios ilimitados
- API access para integración con sistemas corporativos
- SLA garantizado (99.5% uptime)
- Gerente de cuenta dedicado
- Soporte 24/7

---

### Plan Custom — Más de 200 pozos

Para carteras de más de 200 pozos o requerimientos especiales (on-premise, integración con ERP, capacitación in situ). Cotización personalizada bajo solicitud.

---

## 4. Comparativa Resumen de Planes

| Característica                  | Explorer | Professional | Enterprise |
|---------------------------------|----------|--------------|------------|
| Pozos activos                   | 10       | 50           | 200        |
| Precio mensual (ciclo mensual)  | USD 299  | USD 999      | USD 2,999  |
| Precio anual (total)            | USD 2,868 | USD 9,588   | USD 28,788 |
| Precio por pozo/mes             | USD 30   | USD 20       | USD 15     |
| Usuarios                        | 2        | Ilimitados   | Ilimitados |
| Exportación Excel               | ✓        | ✓            | ✓          |
| API access                      | —        | —            | ✓          |
| SLA                             | —        | —            | 99.5%      |
| Soporte                         | Email 48h | Prioritario 24h | 24/7     |

---

## 5. Estimación de Costos de Operación (Infraestructura)

La plataforma se despliega en **Render** (según `render.yaml` del repositorio).

### Costos fijos mensuales

| Componente          | Plan Render      | Costo/mes (USD) |
|---------------------|------------------|-----------------|
| Web Service (API)   | Starter (512 MB) | 7               |
| PostgreSQL Database | Starter (1 GB)   | 7               |
| Static Site (Frontend) | Free          | 0               |
| **Total inicial**   |                  | **USD 14/mes**  |

### Costos escalados por número de clientes

| Clientes activos | Web Service     | Base de datos   | Total infra/mes |
|------------------|-----------------|-----------------|-----------------|
| 1–20 clientes    | Starter (USD 7) | Starter (USD 7) | USD 14          |
| 21–50 clientes   | Standard (USD 25) | Standard (USD 20) | USD 45        |
| 51–100 clientes  | Standard (USD 25) | Pro (USD 65)   | USD 90          |
| 101+ clientes    | Pro (USD 85)    | Pro (USD 65)    | USD 150         |

### Otros costos operativos estimados

| Ítem                        | Costo/mes (USD) |
|-----------------------------|-----------------|
| Dominio custom (.com)       | 2               |
| SSL (incluido en Render)    | 0               |
| Monitoreo (Sentry Free)     | 0               |
| Email transaccional (Free tier) | 0           |
| **Total otros costos**      | **USD 2/mes**   |

### Costo total de operación estimado

| Escenario          | Clientes | Infra + ops/mes | Costo anual   |
|--------------------|----------|-----------------|---------------|
| Etapa inicial      | 1–20     | USD 16          | USD 192       |
| Crecimiento        | 21–50    | USD 47          | USD 564       |
| Escala media       | 51–100   | USD 92          | USD 1,104     |
| Escala alta        | 101+     | USD 152         | USD 1,824     |

---

## 6. Proyecciones de Ingresos

### Supuestos del modelo
- Mix de planes: 60% Explorer, 30% Professional, 10% Enterprise
- Descuento promedio aplicado: 5% (mezcla de ciclos de facturación)
- Churn mensual: 2% (tasa conservadora para B2B industrial)

### Año 1 — Fase de lanzamiento (objetivo: 15 clientes)

| Plan         | Clientes | Precio/mes prom. | MRR         |
|--------------|----------|------------------|-------------|
| Explorer     | 9        | USD 284          | USD 2,556   |
| Professional | 4        | USD 949          | USD 3,796   |
| Enterprise   | 2        | USD 2,849        | USD 5,698   |
| **Total**    | **15**   |                  | **USD 12,050** |

- **ARR Año 1:** USD 144,600
- **Costo infraestructura Año 1:** USD ~540
- **Margen bruto Año 1:** ~99.6%

### Año 2 — Crecimiento (objetivo: 40 clientes)

| Plan         | Clientes | Precio/mes prom. | MRR         |
|--------------|----------|------------------|-------------|
| Explorer     | 24       | USD 284          | USD 6,816   |
| Professional | 12       | USD 949          | USD 11,388  |
| Enterprise   | 4        | USD 2,849        | USD 11,396  |
| **Total**    | **40**   |                  | **USD 29,600** |

- **ARR Año 2:** USD 355,200
- **Costo infraestructura Año 2:** USD ~720
- **Margen bruto Año 2:** ~99.8%

### Año 3 — Escala (objetivo: 90 clientes)

| Plan         | Clientes | Precio/mes prom. | MRR         |
|--------------|----------|------------------|-------------|
| Explorer     | 54       | USD 284          | USD 15,336  |
| Professional | 27       | USD 949          | USD 25,623  |
| Enterprise   | 9        | USD 2,849        | USD 25,641  |
| **Total**    | **90**   |                  | **USD 66,600** |

- **ARR Año 3:** USD 799,200
- **Costo infraestructura Año 3:** USD ~1,104
- **Margen bruto Año 3:** ~99.9%

### Resumen de proyección 3 años

| Año | Clientes | MRR        | ARR          | Costo infra  | Ingreso neto  |
|-----|----------|------------|--------------|--------------|---------------|
| 1   | 15       | USD 12,050 | USD 144,600  | USD 540      | USD 144,060   |
| 2   | 40       | USD 29,600 | USD 355,200  | USD 720      | USD 354,480   |
| 3   | 90       | USD 66,600 | USD 799,200  | USD 1,104    | USD 798,096   |

---

## 7. Análisis de Precio por Pozo por Ciclo de Facturación

### Plan Explorer (hasta 10 pozos)

| N° pozos | Mensual total | Trimestral total | Anual total  | Costo/pozo/mes (anual) |
|----------|---------------|------------------|--------------|------------------------|
| 1        | USD 299       | USD 807          | USD 2,868    | USD 239.00             |
| 3        | USD 299       | USD 807          | USD 2,868    | USD 79.67              |
| 5        | USD 299       | USD 807          | USD 2,868    | USD 47.80              |
| 10       | USD 299       | USD 807          | USD 2,868    | USD 23.90              |

### Plan Professional (hasta 50 pozos)

| N° pozos | Mensual total | Trimestral total  | Anual total  | Costo/pozo/mes (anual) |
|----------|---------------|-------------------|--------------|------------------------|
| 10       | USD 999       | USD 2,697         | USD 9,588    | USD 79.90              |
| 25       | USD 999       | USD 2,697         | USD 9,588    | USD 31.96              |
| 40       | USD 999       | USD 2,697         | USD 9,588    | USD 19.98              |
| 50       | USD 999       | USD 2,697         | USD 9,588    | USD 15.98              |

### Plan Enterprise (hasta 200 pozos)

| N° pozos | Mensual total | Trimestral total  | Anual total   | Costo/pozo/mes (anual) |
|----------|---------------|-------------------|---------------|------------------------|
| 50       | USD 2,999     | USD 8,097         | USD 28,788    | USD 47.98              |
| 100      | USD 2,999     | USD 8,097         | USD 28,788    | USD 23.99              |
| 150      | USD 2,999     | USD 8,097         | USD 28,788    | USD 15.99              |
| 200      | USD 2,999     | USD 8,097         | USD 28,788    | USD 11.99              |

---

## 8. Punto de Equilibrio (Break-even)

Con un costo operativo de USD 16/mes en la etapa inicial:

| Plan activo        | Clientes necesarios para break-even |
|--------------------|--------------------------------------|
| Solo Explorer      | 1 cliente (USD 299 >> USD 16)        |
| Solo Professional  | 1 cliente (USD 999 >> USD 16)        |
| Solo Enterprise    | 1 cliente (USD 2,999 >> USD 16)      |

**El punto de equilibrio se alcanza con el primer cliente.** El modelo es altamente eficiente gracias a la naturaleza SaaS con infraestructura de bajo costo.

---

## 9. Métricas Clave a Monitorear

| Métrica               | Descripción                                      | Objetivo Año 1 |
|-----------------------|--------------------------------------------------|----------------|
| MRR                   | Monthly Recurring Revenue                        | USD 12,050     |
| ARR                   | Annual Recurring Revenue                         | USD 144,600    |
| Churn rate            | % clientes que cancelan por mes                  | < 2%           |
| ARPU                  | Average Revenue Per User                         | USD 803/mes    |
| LTV                   | Customer Lifetime Value (ARPU / churn)           | USD 40,150     |
| CAC                   | Costo de adquisición por cliente                 | < USD 500      |
| LTV:CAC ratio         | Eficiencia de adquisición                        | > 80:1         |
| Pozos por cliente     | Utilización promedio del plan                    | 15 pozos       |

---

## 10. Recomendaciones Estratégicas

1. **Lanzar con período de prueba de 14 días** sin tarjeta de crédito para reducir fricción de adopción en la industria O&G, que es conservadora ante nuevas herramientas.

2. **Ofrecer descuento de lanzamiento del 30%** en plan anual para los primeros 10 clientes, generando cash flow anticipado y testimoniales tempranos.

3. **Precio ancla en Enterprise:** La presencia del plan Enterprise (USD 2,999) hace que Professional (USD 999) parezca más accesible (efecto anclaje).

4. **Facturación anual como default:** Pre-seleccionar el ciclo anual en el UI incrementa el porcentaje de contratos anuales, mejorando la predictibilidad de ingresos.

5. **Upsell natural:** Un cliente que comienza con Explorer y crece a 10+ pozos tiene incentivo claro para migrar a Professional, con una transición de precio bien justificada por el valor adicional.
