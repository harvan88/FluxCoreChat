---
id: "kernel-sessions-routes"
type: "api-routes"
status: "stable"
criticality: "medium"
location: "apps/api/src/routes/kernel-sessions.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Kernel (Session Management Stub)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Monitorización de Sesiones de Kernel" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Active session discovery, Actor/Account filtering, Device hash tracking, Scope visibility check" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Kernel Sessions Routes

## 🎯 Propósito
Las `Kernel Sessions Routes` proporcionan visibilidad sobre las sesiones de cómputo y acceso activas en el motor de realidad de FluxCore. Se utilizan para monitorizar quién (qué actor) está operando actualmente bajo qué permisos (scopes) y desde qué dispositivo.

## 🚥 Estado de Sesión (Snapshot)
El endpoint central `/active` permite obtener una foto de las conexiones vivas procesadas por el Kernel. Cada sesión incluye:
-   **Actor e Inquilino**: Vinculación clara entre quién actúa y quién paga.
-   **Método de Entrada**: Cómo se originó la sesión (ej: `magic_link`, `webchat`, `api_key`).
-   **Device Hash**: Huella digital del dispositivo para detección de accesos concurrentes no autorizados.

## 🧬 Control de Scopes
Permite auditar los permisos efectivos de una sesión activa (ej: `read:kernel`, `write:messages`). Esto es vital para asegurar que el principio de "mínimo privilegio" se está cumpliendo durante las interacciones remotas con el sistema de señales.

## 🛡️ Transparencia Operativa
Esta ruta sirve como la base para el panel de "Sesiones Activas" en la consola de administración, permitiendo a los administradores ver en tiempo real la carga de actores sobre el sistema y detectar rápidamente anomalías en los patrones de acceso.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './kernel-sessions.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/kernel/sessions', router);
```
