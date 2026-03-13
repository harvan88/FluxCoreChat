# ChatCore · Asset Pipeline (Estado al 2026-02-26)

Este documento concentra la verdad actual sobre el sistema de assets en ChatCore luego de la limpieza de avatares legacy y la consolidación del flujo de archivos.

## 1. Resumen ejecutivo

- **Fuente de verdad única:** La tabla `assets` y sus relaciones (`message_assets`, `template_assets`, `plan_assets`) representan todos los binarios que ingresan a ChatCore (chat, plantillas, planes, avatares). `media_attachments` y `profile.profile->'avatarUrl'` dejaron de ser fuentes activas.
- **Avatares:** `accounts.avatar_asset_id` es el único dato persistente. Las URLs se firman al vuelo mediante `assetPolicyService` (`presentAccountWithAvatar`, `flux-policy-context.service`). Se ejecutó la migración `043_remove_profile_avatar_url.sql` para eliminar claves legacy.
- **Ingesta unificada:** Todos los uploads pasan por `AssetGateway` (sesiones, validaciones, hash, storage abstraction). El mismo flujo alimenta inputs de chat, plantillas y avatares.
- **Frontend:** `AvatarUpload`, `useProfile`, `MessageComposer` y los pickers de plantillas consumen `assetId` como referencia y piden URLs firmadas cuando renderizan.

## 2. Arquitectura del servicio de assets

| Componente | Descripción | Código principal |
| --- | --- | --- |
| **AssetGateway** | Expone endpoints de sesión (`/api/assets/session`, `/upload`, `/commit`), valida MIME/tamaño y coordina uploads chunked. | `apps/api/src/routes/assets.routes.ts`, `AssetUploadSessionService` |
| **AssetRegistryService** | Inserta/actualiza `assets`, maneja scopes (`profile_avatar`, `message_attachment`, etc.), versionado y metadata. | `apps/api/src/services/asset-registry.service.ts` |
| **AssetPolicyService** | Firma URLs según actor/acción/canal, consulta `asset_policies`, `asset_permissions`. Utilizado por accounts, templates, kernel. | `apps/api/src/services/asset-policy.service.ts` |
| **AssetRelationsService** | Crea enlaces N:M hacia mensajes, plantillas, planes, futuros contextos (e.g. RAG). | `apps/api/src/services/asset-relations.service.ts` |
| **AssetAuditService** | Escribe eventos en `asset_audit_logs` (upload_started/completed, signing, policy evaluated). | `apps/api/src/services/asset-audit.service.ts` |
| **Storage adapters** | Implementaciones intercambiables (local, S3). `AssetGateway` sólo habla con la interfaz. | `apps/api/src/storage/*` |
| **Media/Enrichment pipeline** | Escucha `asset:ready` / `core:message_received`, ejecuta conversiones (audio→mp3, waveform, transcripciones) y guarda resultados en `message_enrichments`. | `apps/api/src/services/media-orchestrator.service.ts`, `AudioEnrichmentService` |

**Tablas núcleo**

| Tabla | Propósito |
| --- | --- |
| `assets` | Registro maestro del archivo (owner, scope, checksum, storageKey, status, metadata, retention, versionado).
| `asset_upload_sessions` | Sesiones efímeras con TTL para validar y subir archivos.
| `asset_audit_logs` | Trazabilidad completa por asset/sesión (upload, download, firma, dedup, purge).
| `asset_policies` / `fluxcore_asset_permissions` | Permisos y contextos permitidos al firmar.
| `message_assets`, `template_assets`, `plan_assets` | Relaciones N:M con entidades funcionales.
| `assets_metadata` (JSON) | Espacio para waveform, dimensiones, checksums extra.

## 3. Casos de uso actuales

1. **Inputs de chat (texto + media):**
   - `MessageComposer` usa `useAssetUpload` para cualquier adjunto.
   - Al enviar, `content.media` sólo referencia `assetId` + `type`. `MessageCore` vincula a `message_assets` y dispara el pipeline de enriquecimiento.
   - `MessageBubble` y el widget del visitor piden URLs firmadas para renderizar (imagen/audio/video) y muestran metadata derivada (waveform, duración) desde `asset.metadata`.

2. **Plantillas / Template Manager:**
   - El diseñador de plantillas permite adjuntar imágenes/documentos; se almacenan con scope `template_asset` y se enlazan vía `template_assets`.
   - La UI reusa el mismo `AssetBrowser` para seleccionar assets existentes por cuenta.

3. **Planes / Execution Plans:**
   - Documentos adjuntos a pasos del plan usan `plan_assets` para seguir el versionado.

4. **Avatares de cuentas:**
   - `AvatarUpload.tsx` crea un asset `profile_avatar`, actualiza `accounts.avatar_asset_id` y refresca stores. La presentación firma la URL on-demand (Settings, AccountSwitcher, Conversations, Policy Context, Kernel runtime).

5. **Kernel / Flux Policy Context:**
   - `flux-policy-context.service.ts` firma avatares y otros scopes autorizados cuando un asistente requiere datos (`authorized_data_scopes`).

6. **Integraciones IA / RAG (preparado):**
   - El pipeline de assets ya emite eventos para que Document/AIO services extraigan texto y lo lleven a `message_enrichments` o al vector store (`vector_store_assets` backlog).

## 4. Flujo extremo a extremo

1. **Ingesta:**
   - Frontend utiliza `useAssetUpload`/`uploadAvatarAsset`/`AssetUploader` → crea sesión (`asset_upload_sessions`), sube chunks y hace commit con scope (`profile_avatar`, `message_attachment`, etc.).
   - `AssetGateway` valida MIME/tamaño, calcula checksum, sube al storage (local/S3) y persiste en `assets` con estado `ready` + audit log.

2. **Enlace a dominio:**
   - Mensajes/plantillas/planes usan `AssetRelationsService` para insertar filas en `message_assets`, `template_assets`, `plan_assets`.
   - Avatares actualizan `accounts.avatar_asset_id` vía `accountService.updateAccountAvatar`.

3. **Presentación:**
   - Backend firma URLs sólo cuando se necesitan (`presentAccountWithAvatar`, `flux-policy-context.service.resolveBusinessProfile`).
   - Frontend (AccountSwitcher, AccountSection, ConversationsList, etc.) consume `profile.avatarUrl` ya firmado (TTL corto) y guarda únicamente `avatarAssetId` en estado local.

## 5. Tablas y migraciones relevantes
| Tabla / Script | Propósito |
| --- | --- |
| `assets`, `asset_upload_sessions`, `asset_policies`, `asset_audit_logs` | Núcleo del sistema de assets (estado, sesiones, políticas, auditoría). |
| `message_assets`, `template_assets`, `plan_assets` | Relaciones N:M con entidades de negocio. |
| `accounts.avatar_asset_id` | FK a `assets.id` para avatares de perfil. |
| `043_remove_profile_avatar_url.sql` | (2026-02-26) Limpia `profile.avatarUrl` y documenta `avatar_asset_id` como fuente única. |
| `add_avatar_asset_id.sql` | (2026-02-25) Migró datos legacy y creó `avatar_asset_id`. |

## 6. Estado de pruebas y verificación
- **UI:** Verificada manualmente la carga de avatar (spinner, refresco inmediato) tras los cambios en `AvatarUpload` + `useProfile`.
- **Lint:** `bun run lint` falla actualmente por issues previos en `apps/api/src/core/message-core.ts` (parámetros `string | null`) y `extensions/fluxcore-asistentes/src/prompt-builder.ts` (propiedad `attention` inexistente). No relacionado con assets; requiere follow-up del equipo dueño.
- **Build:** `bun run build` se detiene por las mismas fallas; `@fluxcore/web` compila correctamente tras corregir `AvatarUpload`.

## 7. Próximos pasos sugeridos
1. **Resolver lint/build pendientes:** Normalizar los tipos en `message-core` y alinear `prompt-builder` con `FluxPolicyContext` para que `bun run lint && bun run build` finalicen en verde.
2. **Documentar pasos de operación:**
   - Migraciones se registran en `6. MIGRATIONS_REASONING_PROTOCOL.md` (última entrada: 043_remove_profile_avatar_url).
   - Para aplicar nuevas migraciones: `docker cp` + `docker exec psql -f ...` siguiendo el protocolo.
3. **Monitoreo post-migración:**
   - Verificar que no existan rutas legacy `/uploads/avatars/*`. Una vez confirmado, limpiar el almacenamiento antiguo.
4. **Backlog assets:**
   - Migrar endpoints `/upload/file|audio` al AssetGateway.
   - Adaptar frontend de chat para leer media via `assetId` + signer.
   - Eliminar `media_attachments` cuando ya no existan consumidores.

## 8. Checklist para futuros editores
- Al agregar un nuevo tipo de archivo, definir un `scope` en `assets` y las políticas correspondientes (`asset_policies`).
- Nunca persistir URLs directas; firmarlas según contexto (`assetPolicyService.signAsset`).
- Actualizar este documento cada vez que cambie el flujo end-to-end o se agregue una nueva fase del plan de consolidación.
