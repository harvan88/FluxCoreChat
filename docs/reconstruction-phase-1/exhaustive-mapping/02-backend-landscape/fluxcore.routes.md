---
id: "fluxcore-routes"
type: "api-routes"
status: "stable"
criticality: "critical"
location: "apps/api/src/routes/fluxcore.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCoreService, OpenAISyncService, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API Maestra de Entidades FluxCore" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Assistant CRUD and Activation, Instruction management, Vector Store lifecycle, On-demand OpenAI metadata sync, Active mode (auto/suggest/off) global setup" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ FluxCore Routes

## 🎯 Propósito
Las `FluxCore Routes` constituyen el plano de gestión principal (Control Plane) para todas las entidades que componen un sistema de IA en la plataforma: Asistentes, Instrucciones y Bases de Conocimiento (Vector Stores). Es la API que permite orquestar cómo se ve y se comporta la IA del inquilino.

## 🚥 Gestión de Asistentes
Permite administrar el ciclo de vida completo de los asistentes:
-   **Configuración Dual**: Maneja tanto parámetros locales (timing, delay inteligente) como remotos (modelos de OpenAI,IDs externos).
-   **Activación Atómica**: El endpoint `/activate` asegura que solo un asistente esté marcado como "activo" por cuenta en un momento dado, evitando conflictos de personalidad.
-   **Modo Operativo**: Controla globalmente si la IA opera en modo `auto` (responde sola), `suggest` (propone borradores) u `off`.

## 🧬 Bases de Conocimiento y Sincronización
Gestiona la persistencia de los Vector Stores. Una característica crítica es la **Sincronización On-Demand**: al solicitar el detalle de un store, el sistema consulta en tiempo real a OpenAI para asegurar que los metadatos de archivos y estados de procesamiento estén actualizados antes de responder al frontend.

## 🛡️ Instrucciones Reutilizables
Centraliza la gestión de `instructions`, permitiendo que bloques de texto (personalidad, políticas legales, guías de estilo) sean creados una vez y vinculados a múltiples asistentes, facilitando la consistencia de marca en grandes organizaciones.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './fluxcore.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/fluxcore', router);
```
