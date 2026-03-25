---
id: "vector-store-service"
type: "infrastructure-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/vector-store.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "OpenAIDriver, OpenAISyncService, Drizzle (vectorStores, vectorStoreFiles, files)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Bases de Conocimiento (RAG)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Vector store CRUD, Remote sync with OpenAI, File-to-Store linking, Expiration policy management (after days), Usage metrics aggregation, Cascade deletion" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ VectorStoreService

## 🎯 Propósito
El `VectorStoreService` gestiona la persistencia y sincronización de las bases de conocimiento utilizadas para RAG (Retrieval-Augmented Generation). Permite que los asistentes de FluxCore tengan acceso a información privada y actualizada vinculando archivos locales con motores de búsqueda vectorial remotos (OpenAI).

## 🚥 Dualidad Local-Remoto
El servicio actúa como un orquestador que mantiene paridad entre:
-   **Registros Locales**: Tablas `fluxcore_vector_stores` y `_files` que permiten una UI rápida y auditoría interna.
-   **Objetos Remotos**: Los registros reales en OpenAI (`externalId`) que contienen los embeddings y la lógica de búsqueda.

## 🧬 Sincronización de Archivos
Implementa una lógica de sincronización robusta en `syncVectorStoreFiles`:
-   Actualiza estados (pending, completed, failed).
-   Elimina archivos locales si fueron borrados remotamente.
-   **Placeholder Recovery**: Si detecta un archivo en OpenAI que no existe localmente, crea un registro de placeholder, permitiendo que la base de conocimientos se mantenga funcional incluso tras inconsistencias en el upload local.

## 🛡️ Gestión de Cuotas y Expiración
Gestiona las políticas de retención (`expires_after`). Permite configurar cuándo debe auto-limpiarse un vector store para ahorrar costos de almacenamiento en el proveedor, traduciendo las políticas de FluxCore hacia las directivas nativas de la API de OpenAI.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { vectorStoreService } from 'apps/api/src/services/fluxcore/vector-store.service.ts';

// Ejemplo de invocación típica
const result = await vectorStoreService.execute(params);
```
