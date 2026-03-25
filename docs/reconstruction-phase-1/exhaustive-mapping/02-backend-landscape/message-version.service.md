---
id: "message-version-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/message-version.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (messages)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Versionamiento y Edición de Mensajes (v1.3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Version creation, Edit window enforcement (15m), Revert to version, Version history retrieval, Current version resolution" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MessageVersionService

## 🎯 Propósito
Este servicio implementa la lógica de inmutabilidad revisada de FluxCore. En lugar de sobreescribir mensajes, el sistema mantiene un historial de versiones para cada edición, permitiendo auditoría y la posibilidad de revertir cambios.

## 🚥 Regla de Oro (15 Minutos)
-   **Ventana de Edición**: Un mensaje solo puede ser editado dentro de los **15 minutos** posteriores a su creación física (`createdAt`).
-   **Invariante**: Pasado este tiempo, el mensaje queda "congelado" para garantizar la integridad de la conversación.

## 🧬 Mecánica de Versionamiento
1.  **`originalId`**: Al editar, se crea una nueva fila en la tabla `messages`. Esta nueva fila apunta al `id` del primer mensaje enviado (`originalId`).
2.  **`isCurrent`**: Solo una fila por cada `originalId` tiene la bandera `isCurrent = true`. El resto se consideran historial.
3.  **`version`**: Contador incremental para cada edición exitosa.

## 🔄 Reversión
El servicio permite "Revertir a una versión previa". Esto no borra las versiones fallidas, sino que crea una **nueva versión** (ej. Versión 4) cuyo contenido es idéntico a una anterior (ej. Versión 2), manteniendo la línea de tiempo intacta.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { messageVersionService } from 'apps/api/src/services/message-version.service.ts';

// Ejemplo de invocación típica
const result = await messageVersionService.execute(params);
```
