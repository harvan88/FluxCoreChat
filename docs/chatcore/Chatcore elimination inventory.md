# ChatCore — Inventario de Eliminación
**Versión:** 1.1  
**Estado:** Referencia para el refactor  
**Propósito:** Lista exhaustiva de todo lo que debe desaparecer. Nada se toca hasta que su reemplazo esté operativo. Al terminar, el sistema debe estar limpio de todo lo que aparece aquí.

---

## Tablas de base de datos

| Tabla / Columna | Razón | Reemplazada por | Fase |
|---|---|---|---|
| `media_attachments` | Sistema legacy sin dedup, con URLs hardcoded a disco | `assets` + `message_assets` | ~~Fase 6~~ ✅ |
| `messageEnrichments` (tabla actual) | Enriquecimiento acoplado al mensaje | `asset_enrichments` | ~~Fase 3~~ ✅ |
| `conversations.account_id` (columna) | Concepto de "propietario" que no existe en el modelo | `conversation_participants WHERE role='recipient'` | ~~Fase 6~~ ✅ |
| `conversations.unread_count_a/b` (columnas) | Contadores acoplados a ownership binario | Derivado de `conversation_participants` | ~~Fase 6~~ ✅ |

---

## Servicios y funciones backend

| Elemento | Archivo | Razón | Reemplazado por | Fase |
|---|---|---|---|---|
| `FileUploadService` | `apps/api/src/services/file-upload.service.ts` | Upload legacy sin Asset System | `AssetGatewayService` | ~~Fase 6~~ ✅ |
| Burn-in en `AudioEnrichmentService.enrichAudioMessage()` | `apps/api/src/services/audio-enrichment.service.ts` ~línea 70 | Sobreescribe `content.text`, viola inmutabilidad | INSERT en `asset_enrichments` | Fase 3 |
| Guard sin-texto en `ChatProjector` | `apps/api/src/core/projections/chat-projector.ts` | Descarta mensajes válidos de solo-media | Constraint SQL en `messages` | Fase 2 |
| `MediaOrchestrator` escuchando `core:message_received` | `apps/api/src/services/media-orchestrator.service.ts` | Acoplado al mensaje, debe ser agnóstico al origen | Migrar a escuchar `asset:ready` | Fase 3 |
| `broadcastToRelationship(relationshipId)` | `apps/api/src/core/message-core.ts` | No funciona para anonymous threads ni observers | `broadcastToConversation(conversationId)` | Fase 4 |
| Resolución de participantes via `relationships` en `CognitionWorker` | `apps/api/src/workers/cognition-worker.ts` | Resuelve PolicyContext con cuenta incorrecta | `entry.target_account_id` de `conversation_participants` | Fase 2 |
| `conversationService.ensureConversation()` sin `targetAccountId` | `apps/api/src/services/conversation.service.ts` | Permite crear conversaciones sin destinatario | Versión que requiere `targetAccountId` explícito | Fase 2 |

---

## Endpoints HTTP legacy

| Endpoint | Razón | Reemplazado por | Fase |
|---|---|---|---|
| `POST /upload/file` | Upload legacy sin Asset System | `POST /api/assets/upload-session` + commit | ~~Fase 6~~ ✅ |
| `POST /upload/audio` | Upload legacy de audio sin Asset System | `POST /api/assets/upload-session` tipo audio | ~~Fase 6~~ ✅ |

---

## Frontend

| Elemento | Archivo | Razón | Reemplazado por | Fase |
|---|---|---|---|---|
| `useOfflineMessages` como fuente principal en `ChatView` | `apps/web/src/hooks/useOfflineFirst.ts` | Genera duplicados, flujo paralelo al WebSocket | `useChat` directo | Fase 1 |
| `SyncManager.createMessage()` en flujo online | `apps/web/src/db/sync/syncManager.ts` ~línea 122 | POST redundante cuando hay conexión | Eliminado del flujo online | Fase 1 |
| `SyncManager.fetchMessages()` automático post-WebSocket | `apps/web/src/db/sync/syncManager.ts` ~línea 484 | Re-fetch redundante, causa duplicados | WebSocket como única fuente | Fase 1 |
| WebSocket subscription por `relationshipId` | `apps/web/src/hooks/useWebSocket.ts` | No funciona para anonymous threads | Subscription por `conversationId` | Fase 4 |

---

## Patrones de código a erradicar

| Patrón | Por qué es problema | Reemplazo |
|---|---|---|
| `conversation.account_id` para resolver destinatario | El dueño puede ser el iniciador | `conversation_participants WHERE role='recipient'` |
| `relationship.accountAId/BId` para broadcasting | Rompe con anonymous threads | `conversation_participants` |
| `content.text = transcriptionResult.transcription` | Muta contenido sagrado | INSERT en `asset_enrichments` |
| `content.media[].url` en mensajes nuevos | URLs hardcoded, no intercambiables | Solo `assetId` en `content.media[]` |
| `media_attachments.message_id` (FK directa) | Segunda fuente de verdad para media | Solo `message_assets` |
| `IF !content.text THEN return` en ChatProjector | Descarta mensajes válidos | Constraint SQL + aceptar todo con media |

---

## Checklist de cierre

- [x] `media_attachments` vacía → tabla eliminada
- [x] `messageEnrichments` vacía → tabla eliminada, reemplazada por `asset_enrichments`
- [x] Ningún query lee `conversation.account_id` para resolver destinatario
- [x] Ningún query usa `relationship.accountAId/BId` para broadcasting
- [x] Grep `UPDATE messages SET content` → cero resultados post-persist
- [x] Grep `content.media[].url` en INSERT → cero resultados
- [x] `POST /upload/file` y `/upload/audio` → eliminados o retornan 410
- [ ] `SyncManager` no instanciado cuando `navigator.onLine === true`
- [x] WebSocket subscriptions usan `conversationId` en todos los clientes
- [x] `CognitionWorker` usa `target_account_id` de `conversation_participants`
- [ ] Cero auto-relaciones en `relationships`
- [ ] Constraint `account_a_id != account_b_id` en `relationships`
- [x] `ChatProjector` acepta mensajes sin `content.text`
- [x] `AudioEnrichmentService` escribe a `asset_enrichments`, no a `content.text`
- [x] `MediaOrchestrator` escucha `asset:ready`, no `core:message_received`

---

*Al terminar el refactor, cada ítem de esta lista debe estar tachado. Si queda alguno sin resolver, el refactor no está completo.*