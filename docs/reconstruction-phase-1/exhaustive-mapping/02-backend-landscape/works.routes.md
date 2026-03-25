---
id: "works-routes"
type: "api-routes"
status: "ratified"
criticality: "critical"
location: "apps/api/src/routes/fluxcore/works.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "WorkEngineService, Drizzle DB, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Ejecución Transaccional (WES-180)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Proposed works listing (Pending resolution), Active works tracking (FSM), Work history filtering (Terminal states), Granular details (Slots & Events), Human-in-the-loop actions (Open/Discard)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Works Routes (Fluxi / WES)

## 🎯 Propósito
La API de Works (WES-180) es la interfaz para gestionar el flujo de vida de las tareas transaccionales en FluxCore. Permite la supervisión humana sobre las intenciones detectadas por la IA y el seguimiento detallado de procesos complejos de negocio.

## 🚥 Gestión de Propuestas (Human-in-the-loop)
Centraliza la resolución de intenciones detectadas por el `FluxiRuntime`:
-   `/proposed`: Lista tareas que la IA cree que el usuario desea realizar pero que requieren confirmación.
-   `/open`: El comando humano para convertir una propuesta en una tarea activa oficial.
-   `/discard`: El comando para rechazar una propuesta de IA errónea.

## 🧬 El Mapa de Estado (Active vs History)
Distingue dinámicamente el estado de la organización:
-   **Active**: Trabajos que están siendo ejecutados, esperando inputs del usuario o esperando confirmación semántica.
-   **History**: Trabajos que han alcanzado estados terminales (`COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`). Mantiene el orden cronológico inverso para facilitar la auditoría.

## 🛡️ Niveles de Detalle (Slots & Events)
El endpoint de detalle (`/:id`) no solo devuelve la cabecera de la tarea, sino que reconstruye su anatomía completa:
1.  **Slots**: El estado actual de los datos recolectados (ej: Fecha de cita, nombre del cliente).
2.  **Events**: La línea temporal de cómo se movió la tarea (ej: "IA extrajo el slot fecha", "Usuario confirmó", "Tarea completada").
Esto proporciona una trazabilidad total para que un operador humano pueda intervenir en cualquier punto del flujo de automatización.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './works.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/works', router);
```
