# Plan refinado para la gestión de assets en Chat Core

## 1. Arquitectura modular

1. **Asset Gateway (Edge Upload / Access Layer)**  
   - Recibe uploads, aplica límites (tamaño, mime, cuota) y orquesta sesiones efímeras.  
   - No persiste blobs; solo transmite al Storage Adapter y emite eventos.  
   - Genera `uploadSessionId` con TTL estricto (minutos). Si expira sin “commit”, se eliminan metadatos y se purgan fragmentos temporales automáticamente.
2. **Storage Adapter Layer**  
   - Abstracción sobre S3/MinIO/GCS. Se ocupa de rutas físicas y versiones.  
   - No define TTL de acceso; se limita a firmar URLs bajo políticas que recibe del Policy Engine.  
   - Evita compartir buckets entre cuentas sin namespaces separados (`/accountId/assetId/version`).
3. **Asset Registry Service (ARS)**  
   - Registra assets usando IDs opacos (UUID v7/ULID) que representan la intención/ownership, no el contenido.  
   - Mantiene metadatos, estado (`pending`, `ready`, `archived`, `deleted`), hash para integridad y deduplicación controlada intra-account/workspace.  
   - Relaciones con mensajes/plantillas se guardan en tablas explícitas (`message_assets`, `template_assets`); cualquier campo `linkedEntities` se usa solo como cache derivable.
4. **Access Policy Engine**  
   - Define políticas por contexto (actor, canal, acción). Ej.: `download:web`, `preview:assistant`, `internal:compliance`.  
   - TTL de URLs firmadas se calcula por política; el asset no almacena TTL.  
   - Evalúa deduplicación permitida (solo intra-account o intra-workspace salvo política explícita).
5. **Audit & Compliance Layer**  
   - Eventos inmutables para uploads, descargas, expiraciones de sesión y deduplicaciones aprobadas.  
   - Soporta consultas deterministas para auditorías y reportes regulatorios.
6. **Integration Layer (Mensajes, Plantillas, Execution Plans)**  
   - Usa las tablas de relación para resolver qué assets se adjuntan a cada entidad.  
   - Controla que un asset solo sea consumido si la política de contexto lo permite (ej. plantilla solo visible desde cuenta propietaria).

## 2. Modelo de Asset Registry

| Campo | Descripción |
| --- | --- |
| `assetId` | UUID v7/ULID opaco. Identifica la entidad lógica, no el contenido. |
| `accountId`, `workspaceId` | Ownership y límites de deduplicación. |
| `scope` | `message_attachment`, `template_asset`, `execution_plan`, `shared_internal`. |
| `status` | `pending`, `ready`, `archived`, `deleted`. |
| `version` | Secuencia incremental por asset. |
| `checksumSHA256` | Integridad y deduplicación controlada; nunca se expone al cliente. |
| `storageKey` | Ruta física en storage. |
| `sizeBytes`, `mimeType`, `encryption` | Metadatos técnicos. |
| `dedupPolicy` | `none`, `intra_account`, `intra_workspace`, `custom`. |
| `createdAt`, `updatedAt` | Auditoría temporal. |

Las relaciones con mensajes, plantillas y execution plans se modelan en tablas dedicadas (`message_assets`, `template_assets`, `plan_assets`) para que sean derivables y consistentes.

## 3. Flujos operativos

### Upload
1. Cliente solicita `POST /assets/upload-session` → recibe `uploadSessionId` (TTL p. ej. 10 min) y límites (tamaño, dedupPolicy).  
2. Streaming hacia `PUT /assets/upload/:sessionId`. El Storage Adapter guarda temporalmente bajo `tmp/<sessionId>`.  
3. Si el upload supera límites o expira la sesión, el Gateway cancela y limpia.  
4. Al finalizar, ARS crea asset con nuevo `assetId`, estado `pending`, y registra hash.  
5. Worker de validación (antivirus/DLP) marca `ready`. Si detecta duplicado permitido (mismo hash) dentro de la misma cuenta/workspace, enlaza al asset existente según la política; nunca reutiliza blobs cross-account.

### Acceso
1. Cliente/FluxCore invoca `POST /assets/:id/sign` indicando contexto (actor, canal, acción).  
2. Policy Engine valida permisos y devuelve URL firmada con TTL según la política.  
3. Descarga directa desde storage/CDN; Chat Core registra auditoría. FluxCore debe solicitar la URL inmediatamente antes de usarla y no la cachea.

### Eliminación
1. `DELETE /assets/:id` → estado `deleted`, se revocan políticas activas.  
2. Worker aplica retención: purge físico tras `retentionPolicy` (GDPR, account deletion).  
3. Upload sessions limpian automáticamente al expirar para evitar recursos huérfanos.

## 4. Integración con mensajes, plantillas y execution plans
- **Mensajes**: tabla `message_assets` vincula cada mensaje con los assetId/version correspondientes. El runtime valida permisos antes de exponer URLs.  
- **Plantillas**: `template_assets` define qué assets forman parte de cada plantilla; Chat Core resuelve los references al ejecutar la lógica condicional.  
- **Execution Plans**: `plan_assets` asegura que cada step declare sus dependencias y solo avance cuando los assets estén `ready`.

## 5. Seguridad y aislamiento
- Aislamiento multicuenta: deduplicación permitida solo dentro de la cuenta/workspace definido; hashes no se exponen para evitar inferencias.  
- URLs firmadas: generadas per-request con TTL según política, incluyen canal y actor en el scope de la firma para evitar replay.  
- Upload sessions: tokens firmados con TTL; cleanup automático para prevenir uploads permanentes.  
- Auditoría: todo acceso/subida/eliminación genera eventos inmutables vinculados a usuarios, cuentas y execution plans.

## 6. Escalabilidad y determinismo
- AssetId basado en UUID v7 garantiza orden cronológico sin filtrar contenido.  
- CDN maneja blobs; Chat Core cachea solo metadatos/políticas.  
- Deduplicación controlada evita side-channels y reduce storage sin mezclar tenants.  
- El sistema permanece determinista: mismas entradas generan mismos outputs porque las políticas se evalúan siempre en el core.

## 7. Retención y account deletion
- Políticas por scope determinan archivado o eliminación definitiva.  
- Account deletion congela assets, marca `hardDeleteAt` y los purga tras la ventana legal (con excepciones de legal hold documentadas).  
- Right to be forgotten se implementa via workflows sobre assetId/version con trazabilidad completa.

## 8. Consumo por FluxCore
- FluxCore opera como cualquier usuario humano: busca assets permitidos, solicita URL firmada justo antes de usarla y nunca cachea blobs ni URLs.  
- No tiene privilegios especiales ni acceso directo al storage; toda interacción pasa por las APIs públicas de Chat Core.

## 9. APIs mínimas
1. `POST /assets/upload-session`  
2. `PUT /assets/upload/:sessionId`  
3. `POST /assets/upload/:sessionId/commit`  
4. `GET /assets/:id`  
5. `POST /assets/:id/sign`  
6. `POST /assets/search`  
7. `DELETE /assets/:id`  
8. `GET /assets/:id/versions`  
9. Endpoints de relación: `GET/POST message_assets`, `template_assets`, `plan_assets`.

## 10. Riesgos mitigados
- Inferencia por hash: no se comparte hash ni se deduplica cross-account.  
- Uploads huérfanos: sesiones con TTL y cleanup.  
- URLs reutilizadas: contexto en la firma + TTL corto.  
- FluxCore con privilegios: usa exactamente las mismas APIs/políticas.  
- Inconsistencias relacionales: relaciones normalizadas, cualquier cache se recalcula desde tablas fuente.
