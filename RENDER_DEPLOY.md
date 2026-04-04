# Render deploy

Este proyecto ya está preparado para Render con Blueprint en `render.yaml`.

Incluye:
- Web service API (`server`)
- Static site cliente (`client`)
- PostgreSQL administrado en Render

## Pasos
1. En Render, crear `Blueprint` desde este repositorio.
2. Confirmar servicios detectados por `render.yaml`.
3. Deploy.

## Usuario inicial
Al primer arranque de la API, se ejecuta `server/schema.sql` y, si la tabla `users` está vacía, se crea:
- username: `admin`
- password: `hALYSibaCesc`
- rol: admin

## Notas
- La API usa `DATABASE_URL` desde la DB del blueprint.
- El cliente usa `VITE_API_URL=https://subsurface-production-allocation-api.onrender.com`.