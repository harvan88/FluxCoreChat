---
id: "vector-store-sync-service"
type: "infrastructure-service"
status: "stable"
criticality: "medium"
location: "apps/api/src/services/vector-store-sync.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAISyncService, Drizzle (FluxCore Schema)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Sincronizador de Estado de Conocimiento" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAI Vector Store listing, Status reconciliation, Usage metrics sync (bytes/files), LastActiveAt updates" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ VectorStoreSyncService

## 🎯 Propósito
El `VectorStoreSyncService` es el responsable de mantener la paridad de información entre la realidad de los proveedores externos (OpenAI) y los espejos de datos locales en la base de datos de FluxCore. Se encarga de actualizar el estado de salud y consumo de las bases de conocimiento.

## 🚥 Reconciliación de Estado
El servicio consulta periódicamente (u on-demand) la API de OpenAI para obtener el snapshot actual de cada Vector Store:
-   **Status**: Actualiza si el store está `completed`, `in_progress` o tiene errores.
-   **Metrics**: Sincroniza el conteo de archivos (`file_counts`) y el espacio en disco consumido (`usage_bytes`).
-   **Actividad**: Registra la fecha de último uso (`last_active_at`) para facilitar la limpieza de almacenes inactivos.

## 🧬 Operación Batch
Optimiza la sincronización procesando todos los stores de la cuenta en un único bucle:
1.  Obtiene la lista completa desde el proveedor.
2.  Cruza cada elemento por su `externalId`.
3.  Actualiza los campos en la tabla `fluxcore_vector_stores` de forma atómica.

## 🛡️ Transparencia Operativa
Este servicio permite que el panel de administración de FluxCore muestre información precisa sobre el progreso del entrenamiento de la IA sin tener que llamar a la API externa de forma síncrona en cada visualización de página, mejorando drásticamente la latencia percibida por el usuario.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { vectorStoreSyncService } from 'apps/api/src/services/vector-store-sync.service.ts';

// Ejemplo de invocación típica
const result = await vectorStoreSyncService.execute(params);
```
