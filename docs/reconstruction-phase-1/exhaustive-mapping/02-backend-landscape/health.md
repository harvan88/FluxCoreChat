---
id: "health-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/health.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore DB (PostgreSQL), Node process (Memory/CPU)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Monitorización y Salud de Producción" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Liveness probe (live), Readiness probe (ready) with DB check, Detailed system metrics, Deep diagnostic (Table record counts), Uptime tracking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Health Routes (Monitoring)

## 🎯 Propósito
Las `Health Routes` proporcionan la interfaz de monitorización para los sistemas de orquestación de contenedores (como Kubernetes) y paneles de supervisión de SRE. Su objetivo es informar de forma rápida y veraz si el servicio está vivo, si está listo para recibir tráfico, y cuál es su estado interno profundo.

## 📍 Endpoints
### Probes de Producción
1.  **Liveness (`/live`)**: Una respuesta instantánea para confirmar que el proceso de Node.js no se ha colgado.
2.  **Readiness (`/ready`)**: Una prueba de dependencias. Verifica la conexión a PostgreSQL y el uso de memoria RAM. Si la memoria supera el 90% o la DB falla, devuelve un estado `degraded` o `unhealthy`.

## 🧬 Diagnóstico Profundo
El endpoint `/diagnostic` ofrece una vista sin precedentes de la salud de los datos (Fase 1 de Reconstrucción). Realiza conteos en caliente de todas las tablas core:
-   **Estructura**: Valida la existencia y accesibilidad de tablas como `accounts`, `signals`, `messages` y `extensionInstallations`.
-   **Métricas de Volumen**: Devuelve el total de registros por tabla, permitiendo detectar de un vistazo anomalías en el crecimiento de datos o tablas vacías inesperadas.

## 🛡️ Métricas de Rendimiento
Expone un sub-endpoint de `/metrics` que devuelve estadísticas crudas del proceso:
-   **Memoria**: Heap used vs total, RSS y memoria externa.
-   **CPU**: Uso de recursos del procesador.
## 🛡️ Middlewares/Auth
Las rutas `/live` y `/ready` suelen ser públicas para que el orquestador (K8s) pueda consumirlas sin token. El sub-endpoint `/diagnostic` requiere autenticación básica o token interno para evitar divulgación de información sensible de métricas.

## 🔗 Dependencias
- **Drizzle ORM (`db`)**: Utilizado para realizar el `SELECT 1` o contar registros en `/diagnostic`.
- **process (Node.js)**: Utilizado para extraer métricas nativas de RAM y CPU.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: health
import { health } from 'apps/api/src/routes/health.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await health.process(input);
```
