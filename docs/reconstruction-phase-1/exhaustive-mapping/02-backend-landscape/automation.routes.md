---
id: "automation-routes"
type: "api-routes"
status: "stable"
criticality: "high"
location: "apps/api/src/routes/automation.routes.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AutomationController, AuthMiddleware" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "API de Reglas de Automatización e IA" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Webhook trigger (public), Rule CRUD, Effective mode resolution (account vs relationship), Trigger registration, On-demand trigger evaluation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ Automation Routes

## 🎯 Propósito
Las `Automation Routes` definen los puntos de entrada para configurar el comportamiento autónomo de los agentes y asistentes. Permitan gestionar las reglas que deciden cuándo y cómo la IA debe intervenir en una conversación, ya sea de forma automática, bajo sugerencia, o permaneciendo apagada.

## 🚥 Endpoints Principales
-   **Public Webhook (`/webhook/:token`)**: Punto de entrada sin autenticación para disparadores externos. Valida el token y ejecuta las acciones programadas si el modo lo permite.
-   **Reglas de Cuenta (`/rules/:accountId`)**: Gestión administrativa de los modos de IA y configuraciones de comportamiento global por cuenta.
-   **Resolución de Modo (`/mode/:accountId`)**: Resuelve el "modo efectivo" de automatización, priorizando reglas específicas de la relación sobre las reglas generales de la cuenta.

## 🧬 Disparadores y Evaluación
La API permite registrar múltiples tipos de `triggers` (mensajes, palabras clave, horarios) y ofrece un endpoint de `/evaluate` para que los desarrolladores o el sistema de pruebas comprueben si un mensaje específico dispararía o no una regla de automatización sin necesidad de ejecutar el flujo completo.

## 🛡️ Seguridad
Excepto por el endpoint de webhook, todas las rutas están protegidas por `authMiddleware`, asegurando que solo los propietarios de cuenta o administradores puedan alterar las políticas de intervención de la IA.

## 💡 Ejemplo de Uso
```typescript
// Registrar rutas en el servidor Express/Hono
import { setupRoutes } from './automation.routes';

// Las rutas se registran automáticamente al iniciar el servidor
app.use('/api/automation', router);
```
