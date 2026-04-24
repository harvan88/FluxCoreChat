---
id: "db-assets"
type: "database-table"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/assets.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de gestión de archivos (AM-100)" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Relacionado con Accounts, Workspaces, Messages, Templates" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Asset Management System" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Deduplication via SHA256, Storage provider switching (Local/S3), Scope-based access control, Soft/Hard delete lifecycle" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: assets

## 🎯 Propósito
La tabla `assets` es el registro central de todos los recursos binarios (imágenes, documentos, audios) del ecosistema FluxCore. Proporciona una capa de abstracción sobre el almacenamiento físico, permitiendo gestionar metadatos, versiones y políticas de retención de forma agnóstica al proveedor (S3/LocalStorage).

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID lógico del asset. |
| `account_id` | UUID | Not Null | Cuenta dueña del recurso. |
| `scope` | ENUM | Default 'message_attachment' | `message_attachment`, `profile_avatar`, `template_asset`, etc. |
| `status` | ENUM | Default 'pending' | `pending`, `ready`, `archived`, `deleted`. |
| `mime_type` | VARCHAR | Default 'application/octet-stream' | Tipo de contenido. |
| `checksum_sha256` | VARCHAR(64) | Unique per Account | Hash para deduplicación. |
| `storage_key` | VARCHAR | Not Null | Ruta/Key en el sistema de archivos o S3. |
| `storage_provider`| VARCHAR | Default 'local' | `local` o `s3`. |

## 🧬 Relaciones (Connections)
-   **Owner**: Vinculado a `accounts` y opcionalmente a `workspaces`.
-   **Consumers**: Referenciado por `accounts.avatar_asset_id`, `messages` (vía JSON content), y tablas de unión como `message_assets` o `template_assets`.
-   **Audit**: Vinculado a `asset_audit_logs` para rastrear quién accedió o modificó el archivo.

## 🛡️ Reglas de Almacenamiento (Operations)
1.  **Deduplicación Intra-Cuenta**: El constraint `assets_unique_checksum_account` impide que una misma cuenta suba dos veces el mismo archivo físico, ahorrando espacio en disco.
2.  **Ciclo de Vida de Borrado y Escudo de Soberanía**:
    -   **Sovereign Asset Shield:** La base de datos tiene un trigger (`prevent_asset_deletion`) que bloquea comandos `DELETE` crudos (como `DELETE FROM assets;`) para evitar desastres masivos.
    -   **Borrado Granular:** El servicio oficial (`AssetRegistryService.delete`) realiza borrados **físicos reales** (no acumula basura) pero lo hace mediante una transacción certificada que abre el escudo temporalmente para esa fila específica.
    -   **Borrado Total (Manual/Admin):** Si es necesario vaciar la tabla por completo (ej: reseteo de entorno), se debe ejecutar el siguiente SQL para bypasser el escudo:
        ```sql
        BEGIN;
        SET LOCAL "fluxcore.allow_asset_deletion" = 'true';
        DELETE FROM assets; -- O cualquier borrado masivo
        COMMIT;
        ```
    -   **Soft-Delete Opcional:** El sistema aún soporta los estados `archived` y `deleted` para flujos que requieran una "papelera de reciclaje" antes de la purga final.
3.  **Seguridad de Acceso**: El `scope` define las reglas de visibilidad (ej: un `profile_avatar` es público, un `message_attachment` requiere ser participante de la conversación).

## 💡 Ejemplo de Uso
```typescript
// Buscar asset por checksum (deduplicación)
import { db, assets } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const [existing] = await db.select()
  .from(assets)
  .where(and(
    eq(assets.accountId, accountId),
    eq(assets.checksumSha256, sha256Hash)
  )).limit(1);
```
