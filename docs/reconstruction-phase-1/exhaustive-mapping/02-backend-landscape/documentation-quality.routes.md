---
id: "documentation-quality-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/fluxcore/documentation-quality.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "DocumentationQualityService, Elysia" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Monitorización de Salud Documental" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Quality metrics retrieval, Mechanical Layer 2 building, Real-time status snapshots, Dashboard data exposure" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Documentation Quality Routes

## 🎯 Propósito
Las `Documentation Quality Routes` exponen el estado de salud de la base de conocimiento del proyecto. Proporcionan los datos necesarios para el Panel de Control de Documentación, permitiendo a los desarrolladores identificar rápidamente qué componentes carecen de mapeo técnico.

## 🚥 Métricas de Calidad (`/quality`)
Este endpoint devuelve un snapshot estadístico que incluye:
-   **Porcentaje de Cobertura**: Cuántos archivos de código tienen su correspondiente `.md`.
-   **Progreso por Capas**: Métrica agregada de cuántos documentos han completado Discovery, Connections, Subsystems y Operations.
-   **Lista de Pendientes**: Identificación directa de archivos que requieren atención inmediata.

## 🧬 Automatización de Capa 2 (`/build-layer-2`)
Expone la capacidad de reconstrucción mecánica de la infraestructura:
-   **Propósito**: Analiza los imports y dependencias del código fuente para inyectar automáticamente la sección `Connections` en los archivos de documentación.
-   **Efecto**: Ahorra cientos de horas de mapeo manual, asegurando que la red de interdependencias del backend esté siempre sincronizada con la realidad del código.

## 🛡️ Sincronización de Snapshot
Tras cualquier operación de construcción mecánica, la ruta dispara una re-generación de métricas. Esto asegura que el monitor visual de documentación se actualice inmediatamente, proporcionando feedback instantáneo sobre la mejora de la calidad tras las tareas de reconstrucción.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './documentation-quality.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/documentation/quality', router);
```
