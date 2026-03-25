---
id: "vector-store-deletion-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/vector-store-deletion.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (FluxCore Schema), OpenAIDriver" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Servicio de Borrado en Cascada de Conocimiento" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Assistant link protection (Conflict check), OpenAI file unlinking, OpenAI store deletion, Local DB record cleanup, Error recovery and logging" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ VectorStoreDeletionService

## 🎯 Propósito
Este servicio gestiona la eliminación segura y exhaustiva de bases de conocimiento (Vector Stores) del sistema. Su responsabilidad es asegurar que no queden orfandades, tanto en la base de datos local de FluxCore como en la infraestructura de los proveedores externos (OpenAI).

## 🚥 Protección de Integridad (Conflict Check)
Antes de proceder con cualquier borrado, el servicio realiza una guarda crítica:
-   **Validación de Uso**: Comprueba si el Vector Store está vinculado a algún Asistente activo.
-   **Aborto Preventivo**: Si existe una vinculación, lanza un error con código 409 (Conflict) y lista los nombres de los asistentes que están usando la información, impidiendo que la IA pierda su "memoria" accidentalmente.

## 🧬 Pipeline de Borrado en Cascada
Si el store es elegible para borrado, ejecuta una secuencia de 4 pasos:
1.  **Discovery**: Obtiene la lista de todos los archivos vinculados al store.
2.  **Limpieza Externa (OpenAI)**: Por cada archivo, llama al driver para des-vincularlo y eliminarlo físicamente de los servidores del proveedor.
3.  **Eliminación del Store**: Borra el contenedor lógico en el proveedor externo.
4.  **Purgado Local**: Elimina finalmente los registros de la base de datos Drizzle (`fluxcore_vector_stores` y `fluxcore_vector_store_files`).

## 🛡️ Minimización de Costes
Al realizar el borrado físico de los archivos en OpenAI como parte de la cascada, el servicio garantiza que la cuenta del cliente no siga acumulando cargos por almacenamiento de vectores que ya no son accesibles desde el panel de control de FluxCore.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { vectorStoreDeletionService } from 'apps/api/src/services/vector-store-deletion.service.ts';

// Ejemplo de invocación típica
const result = await vectorStoreDeletionService.execute(params);
```
