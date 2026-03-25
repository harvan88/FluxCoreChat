---
id: "permission-validator-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/permission-validator.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FluxCore Types (ContextPermission)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sistema de Validación de Manifestos (FC-156)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Granular scope checking, Context read/write validation, Message sending permission checks, Invalid permission filtering" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ PermissionValidatorService

## 🎯 Propósito
Este servicio es el guardián de la seguridad en el runtime de las extensiones. Se encarga de validar si una extensión o agente posee los permisos necesarios, declarados en su manifiesto, para realizar acciones sensibles dentro de FluxCore.

## 🚥 Scopes de Aplicación
Define y valida un catálogo exhaustivo de permisos técnicos (`ContextPermission`):
-   **Context Read**: Permisos granulares para leer contexto público, privado, de relaciones o histórico (`read:context.*`).
-   **Context Write**: Capacidad de escribir en el `overlay` de contexto para persistir estados temporales.
-   **Acciones**: Permisos para enviar mensajes (`send:messages`) o modificar configuraciones de automatización (`modify:automation`).

## 🧬 Validación Operativa
A diferencia del `PermissionService` (que gestiona activos persistentes), el `Validator` opera en tiempo de ejecución analizando la lista de permisos otorgados a un actor contra el requerimiento de una operación específica, devolviendo una estructura legible con la respuesta (`allowed`) y la razón del rechazo en caso de fallo.

## 🛡️ Filtro de Integridad
Incluye un método estricto (`filterValidPermissions`) que limpia cualquier solicitud de permisos no reconocidos por el sistema, asegurando que las extensiones no puedan auto-asignarse scopes inválidos o "zombie".

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { permissionValidatorService } from 'apps/api/src/services/permission-validator.service.ts';

// Ejemplo de invocación típica
const result = await permissionValidatorService.execute(params);
```
