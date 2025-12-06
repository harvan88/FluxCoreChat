# @fluxcore/api

Backend API de FluxCore construido con Elysia y Bun.

## Desarrollo

```bash
# Iniciar en modo desarrollo
bun run dev

# Build para producción
bun run build

# Ejecutar producción
bun run start
```

## Endpoints

### Health Check
- `GET /health` - Estado del servicio
- `GET /health/ready` - Readiness check

### Documentación
- `GET /swagger` - Documentación Swagger UI

## Variables de Entorno

Ver `.env.example` para configuración requerida.

## Estructura

```
src/
├── routes/       # Definición de rutas
├── core/         # Lógica de negocio
└── index.ts      # Entry point
```
