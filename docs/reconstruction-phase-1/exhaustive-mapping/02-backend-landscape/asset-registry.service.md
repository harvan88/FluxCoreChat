---
id: "asset-registry-service"
type: "infrastructure-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/asset-registry.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AssetGatewayService, StorageAdapters, CoreEventBus, Drizzle (assets)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asset Registry Service (ARS)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Content-Addressable Storage (CAS) sharding, SHA256 Deduplication, Multi-status lifecycle (pending/ready/deleted), Versioning management, Policy-based pruning" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssetRegistryService

## 🎯 Propósito
El `AssetRegistryService` (ARS) es el cerebro detrás de la gestión de archivos en FluxCore. No solo registra la existencia de documentos, sino que implementa una arquitectura de almacenamiento inteligente optimizada para la integridad de datos y la eficiencia de espacio.

## 🚥 Almacenamiento Direccionable por Contenido (CAS)
El servicio implementa un sistema de sharding basado en el contenido:
1.  **Hashing**: Calcula el checksum SHA256 del archivo.
2.  **Sharding**: Distribuye los archivos en el storage usando los primeros 4 caracteres del hash como prefijos de directorio (`assets/avatars/ab/cd/hash16`). Esto evita cuellos de botella en sistemas de archivos con muchos registros.

## 🧬 Deduplicación Inteligente
Implementa políticas de deduplicación configurables (`DedupPolicy`):
-   **Intra-account**: Evita duplicados dentro de la misma cuenta.
-   **Intra-workspace**: Comparte el mismo binario físico entre diferentes cuentas del mismo workspace.
-   **None**: Permite duplicidad si el caso de uso lo requiere (ej: archivos temporales).

## 🛡️ Ciclo de Vida y Retención
Gestiona un flujo de estados estricto:
-   **Pending**: Durante el upload y movimiento inicial.
-   **Ready**: Tras validación de integridad (SHA256 match) y emisión del evento `asset:ready`.
-   **Deleted (Soft)**: El registro se oculta pero el binario permanece por un periodo de gracia de 30 días.
-   **Purged (Hard)**: Eliminación física definitiva del storage y la DB.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetRegistryService } from 'apps/api/src/services/asset-registry.service.ts';

// Ejemplo de invocación típica
const result = await assetRegistryService.execute(params);
```
