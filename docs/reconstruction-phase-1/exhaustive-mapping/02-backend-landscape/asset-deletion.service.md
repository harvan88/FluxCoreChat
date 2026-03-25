---
id: "asset-deletion-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/asset-deletion.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Storage Adapter, Asset Audit Service, Drizzle (assets, relations)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Purga y Limpieza de Storage" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account-level purge, Orphan detection, Physical file deletion, Soft-delete orchestration" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ AssetDeletionService

## 🎯 Propósito
Este servicio es el responsable de la limpieza física y lógica de los archivos del sistema. Asegura que cuando un dato debe ser eliminado (por petición del usuario o por purga de cuenta), no queden residuos en los proveedores de storage (S3, Local, etc.) ni referencias huérfanas en la base de datos.

## 🧹 Purga de Cuentas (`purgeAccountAssets`)
Es una pieza crítica en el flujo de eliminación de cuentas de FluxCore. Se encarga de:
1. Identificar todos los assets vinculados a la cuenta.
2. Eliminar las relaciones con mensajes, plantillas y planes.
3. Eliminar físicamente los archivos del storage.
4. Limpiar sesiones de subida pendientes y sus archivos temporales.

## 🕵️ Detección de Huérfanos
El método `isAssetOrphaned` verifica si un archivo sigue siendo necesario. Un archivo es considerado huérfano si no tiene vínculos activos con mensajes, plantillas o planes de ejecución, permitiendo su recolección de basura asincrónica.

## 🛡️ Niveles de Eliminación
- **Soft Delete (`deleteAsset`)**: Marca el registro como eliminado pero mantiene el archivo físico por un periodo de gracia (configurado en `AssetRegistryService`).
- **Hard Delete (`purgeAsset`)**: Elimina inmediatamente el registro y el archivo físico del storage.

## 🛠️ Resiliencia de Red
El servicio recolecta errores de storage durante las purgas masivas en un array `storageErrors`, permitiendo completar la purga de la base de datos incluso si un archivo individual en el storage no puede ser borrado, evitando estados de bloqueo en el borrado de cuentas.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { assetDeletionService } from 'apps/api/src/services/asset-deletion.service.ts';

// Ejemplo de invocación típica
const result = await assetDeletionService.execute(params);
```
