---
id: "asset-relations-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/asset-relations.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AssetAuditService, AssetRegistryService, CoreEventBus, Drizzle (messageAssets, templateAssets, planAssets)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor del Grafo de Vínculos de Assets" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Entity linking (Messages/Templates/Plans), Ownership verification, Positional ordering for galleries, Slot mapping for templates, Plan readiness validation, Atomic unlinking with audit logs" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssetRelationsService

## 🎯 Propósito
Este servicio gestiona el grafo social de los archivos. Un solo `Asset` físico puede estar vinculado a múltiples mensajes, plantillas o planes de trabajo. `AssetRelationsService` mantiene la integridad de estos vínculos y asegura que las entidades "vean" los archivos correctos.

## 🚥 Tipos de Vínculos
-   **Messages**: Fotos o documentos enviados en un chat. Soporta `position` para definir el orden en galerías.
-   **Templates**: Archivos adjuntos permanentes de una respuesta predefinida. Utiliza `slot` (ej: "brochure", "logo") para facilitar el mapeo dinámico.
-   **Execution Plans (WES)**: Archivos necesarios para completar una tarea. Introduce el concepto de `dependencyType` (ej: un archivo puede ser 'required' para poder avanzar el estado de la tarea).

## 🧬 Validación de Propiedad
Antes de crear cualquier vínculo, el servicio ejecuta `verifyAssetOwnership`. Esto previene ataques de inyección de archivos donde un usuario intenta vincular el `assetId` de otra cuenta a sus propios mensajes, delegando en el ARS la validación final de integridad.

## 🛡️ Auditoría e Integridad
Cada operación de link/unlink dispara un registro en `AssetAuditService` y emite eventos en el `coreEventBus` (`asset:linked`). Además, para los planes de trabajo, el servicio ofrece `getPlanAssetStatus`, que determina de forma atómica si una tarea puede proceder basándose en si todos los archivos requeridos están en estado `ready`.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetRelationsService } from 'apps/api/src/services/asset-relations.service.ts';

// Ejemplo de invocación típica
const result = await assetRelationsService.execute(params);
```
