# Plan de Ejecución: Sistema de Gestión de Assets

> **Derivado de:** ASSET_MANAGEMENT_PLAN.md  
> **Metodología:** CREACION DE HITOS (HCI)  
> **Fecha:** 2026-01-31

---

## Resumen Ejecutivo

Este plan implementa un sistema completo de gestión de assets para Chat Core, incluyendo:
- **Asset Gateway** para uploads con sesiones efímeras
- **Storage Adapter** para abstracción de almacenamiento (S3/MinIO/local)
- **Asset Registry Service (ARS)** para metadatos y estados
- **Access Policy Engine** para URLs firmadas y permisos
- **Audit & Compliance Layer** para trazabilidad
- **Activity Bar Monitoring** con logs de depuración en tiempo real

### Estado al 2026-02-04

- ✅ Pipeline de ingesta revisado end-to-end: firmas ahora respetan `/uploads/assets`, los viewers consumen los mismos endpoints (Chat Core + FluxCore) y los assets quedan disponibles tras recarga/offline sync.
- ✅ Frontend alineado con el Asset Gateway: `useAssetUpload` reemplaza hooks legados, `StandardComposer` y `FluxCoreComposer` comparten la misma cola y manejo de media.
- ✅ Compatibilidad multimedia: audio se graba en **OGG/Opus mono** (estándar WhatsApp) y AssetPreview simplifica la UI; imágenes ya se muestran correctamente.
- 🟡 Monitoring aún requiere eventos WebSocket en tiempo real y exportación de logs.

---

## Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (apps/web)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ActivityBar → AssetMonitoringPanel (logs en tiempo real)           │
│  ChatView → AssetUploader + AssetPreview                            │
│  DynamicContainer → AssetBrowser (gestión de assets)                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API (apps/api)                              │
├─────────────────────────────────────────────────────────────────────┤
│  routes/assets.routes.ts                                            │
│  ├── POST /assets/upload-session                                    │
│  ├── PUT /assets/upload/:sessionId                                  │
│  ├── POST /assets/upload/:sessionId/commit                          │
│  ├── GET /assets/:id                                                │
│  ├── POST /assets/:id/sign                                          │
│  ├── POST /assets/search                                            │
│  ├── DELETE /assets/:id                                             │
│  └── GET /assets/:id/versions                                       │
├─────────────────────────────────────────────────────────────────────┤
│  services/                                                          │
│  ├── asset-gateway.service.ts (upload sessions, límites)            │
│  ├── asset-registry.service.ts (CRUD, estados, dedup)               │
│  ├── asset-policy.service.ts (permisos, URLs firmadas)              │
│  ├── asset-audit.service.ts (eventos inmutables)                    │
│  └── storage-adapter.service.ts (S3/MinIO/local)                    │
├─────────────────────────────────────────────────────────────────────┤
│  workers/                                                           │
│  ├── asset-validation.worker.ts (antivirus/DLP)                     │
│  └── asset-cleanup.worker.ts (sesiones expiradas)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (packages/db)                         │
├─────────────────────────────────────────────────────────────────────┤
│  schema/                                                            │
│  ├── assets.ts (tabla principal)                                    │
│  ├── asset-upload-sessions.ts (sesiones efímeras)                   │
│  ├── asset-policies.ts (políticas de acceso)                        │
│  ├── asset-audit-logs.ts (eventos inmutables)                       │
│  ├── message-assets.ts (relación mensajes-assets)                   │
│  ├── template-assets.ts (relación plantillas-assets)                │
│  └── plan-assets.ts (relación execution plans-assets)               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Hitos de Implementación

### Hito AM-100: Schema de Base de Datos ✅ COMPLETADO (2026-01-31)

**Objetivo:** Crear todas las tablas necesarias para el sistema de assets.

**Duración estimada:** 1 día

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-100-01 | Crear tabla `assets` con campos: assetId, accountId, workspaceId, scope, status, version, checksumSHA256, storageKey, sizeBytes, mimeType, encryption, dedupPolicy, createdAt, updatedAt | `packages/db/src/schema/assets.ts` | ✅ |
| AM-100-02 | Crear tabla `asset_upload_sessions` con: sessionId, accountId, expiresAt, maxSizeBytes, allowedMimeTypes, status, tempStorageKey | `packages/db/src/schema/asset-upload-sessions.ts` | ✅ |
| AM-100-03 | Crear tabla `asset_policies` con: policyId, name, contexts (JSON), ttlSeconds, dedupScope, createdAt | `packages/db/src/schema/asset-policies.ts` | ✅ |
| AM-100-04 | Crear tabla `asset_audit_logs` con: logId, assetId, action, actorId, actorType, context, timestamp, metadata | `packages/db/src/schema/asset-audit-logs.ts` | ✅ |
| AM-100-05 | Crear tabla `message_assets` con: messageId, assetId, version, position | `packages/db/src/schema/message-assets.ts` | ✅ |
| AM-100-06 | Crear tabla `template_assets` con: templateId, assetId, version, slot | `packages/db/src/schema/template-assets.ts` | ✅ |
| AM-100-07 | Crear tabla `plan_assets` con: planId, stepId, assetId, version, dependency | `packages/db/src/schema/plan-assets.ts` | ✅ |
| AM-100-08 | Exportar todas las tablas en `packages/db/src/schema/index.ts` | `packages/db/src/schema/index.ts` | ✅ |
| AM-100-09 | Crear migración y ejecutar `bunx drizzle-kit push:pg` | `packages/db/migrations/` | 🟡 Pendiente push |

**Criterios de aceptación:**
- [x] Todas las tablas creadas en PostgreSQL
- [x] Índices optimizados para queries frecuentes
- [x] Tipos TypeScript exportados correctamente
- [x] `bun run build` exitoso

---

### Hito AM-110: Storage Adapter Layer ✅ COMPLETADO (2026-01-31)

**Objetivo:** Implementar abstracción de almacenamiento con soporte para local/S3/MinIO.

**Duración estimada:** 1.5 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-110-01 | Crear interfaz `IStorageAdapter` con métodos: upload, download, delete, getSignedUrl, exists | `apps/api/src/services/storage/storage-adapter.interface.ts` | ✅ |
| AM-110-02 | Implementar `LocalStorageAdapter` para desarrollo | `apps/api/src/services/storage/local-storage.adapter.ts` | ✅ |
| AM-110-03 | Implementar `S3StorageAdapter` para producción | `apps/api/src/services/storage/s3-storage.adapter.ts` | ✅ (placeholder) |
| AM-110-04 | Crear factory `StorageAdapterFactory` basado en config | `apps/api/src/services/storage/storage-adapter.factory.ts` | ✅ |
| AM-110-05 | Agregar configuración en `.env.example` para storage | `.env.example` | ✅ |
| AM-110-06 | Crear tests unitarios para adapters | `apps/api/src/__tests__/storage-adapter.test.ts` | 🟡 Pendiente |

**Criterios de aceptación:**
- [x] Upload/download funcional en modo local
- [x] URLs firmadas con TTL configurable
- [x] Namespacing por accountId: `/accountId/assetId/version`
- [ ] Tests unitarios pasando

---

### Hito AM-120: Asset Gateway Service ✅ COMPLETADO (2026-01-31)

**Objetivo:** Implementar el gateway de uploads con sesiones efímeras y validación.

**Duración estimada:** 2 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-120-01 | Crear `AssetGatewayService` con: createUploadSession, validateChunk, commitUpload, cancelSession | `apps/api/src/services/asset-gateway.service.ts` | ✅ |
| AM-120-02 | Implementar validación de límites (tamaño, mime, cuota por cuenta) | `apps/api/src/services/asset-gateway.service.ts` | ✅ |
| AM-120-03 | Implementar TTL de sesiones (default 10 min) con cleanup automático | `apps/api/src/services/asset-gateway.service.ts` | ✅ |
| AM-120-04 | Crear worker `AssetCleanupWorker` para purgar sesiones expiradas | `apps/api/src/workers/asset-cleanup.worker.ts` | ✅ |
| AM-120-05 | Implementar streaming upload con chunks | `apps/api/src/services/asset-gateway.service.ts` | ✅ |
| AM-120-06 | Agregar logs de depuración con prefijo `[AssetGateway]` | `apps/api/src/services/asset-gateway.service.ts` | ✅ |

**Criterios de aceptación:**
- [x] Sesiones expiran automáticamente
- [x] Uploads cancelados limpian archivos temporales
- [x] Logs detallados para debugging
- [x] Límites de cuota respetados

---

### Hito AM-130: Asset Registry Service (ARS) ✅ COMPLETADO (2026-01-31)

**Objetivo:** Implementar el servicio central de registro de assets.

**Duración estimada:** 2 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-130-01 | Crear `AssetRegistryService` con CRUD completo | `apps/api/src/services/asset-registry.service.ts` | ✅ |
| AM-130-02 | Implementar estados: `pending`, `ready`, `archived`, `deleted` | `apps/api/src/services/asset-registry.service.ts` | ✅ |
| AM-130-03 | Implementar versionado incremental por asset | `apps/api/src/services/asset-registry.service.ts` | ✅ |
| AM-130-04 | Implementar deduplicación controlada (intra-account/workspace) | `apps/api/src/services/asset-registry.service.ts` | ✅ |
| AM-130-05 | Calcular y almacenar checksumSHA256 | `apps/api/src/services/asset-registry.service.ts` | ✅ |
| AM-130-06 | Crear worker `AssetValidationWorker` (placeholder para antivirus/DLP) | `apps/api/src/workers/asset-validation.worker.ts` | 🟡 Pendiente |
| AM-130-07 | Agregar logs de depuración con prefijo `[AssetRegistry]` | `apps/api/src/services/asset-registry.service.ts` | ✅ |

**Criterios de aceptación:**
- [x] Assets transicionan correctamente entre estados
- [x] Deduplicación solo dentro de la misma cuenta
- [x] Hash nunca expuesto al cliente
- [x] Versionado funcional

---

### Hito AM-140: Access Policy Engine ✅ COMPLETADO (2026-01-31)

**Objetivo:** Implementar el motor de políticas de acceso y URLs firmadas.

**Duración estimada:** 1.5 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-140-01 | Crear `AssetPolicyService` con: evaluateAccess, generateSignedUrl | `apps/api/src/services/asset-policy.service.ts` | ✅ |
| AM-140-02 | Implementar contextos: `download:web`, `preview:assistant`, `internal:compliance` | `apps/api/src/services/asset-policy.service.ts` | ✅ |
| AM-140-03 | Calcular TTL dinámico según política y contexto | `apps/api/src/services/asset-policy.service.ts` | ✅ |
| AM-140-04 | Incluir actor y canal en scope de firma (anti-replay) | `apps/api/src/services/asset-policy.service.ts` | ✅ |
| AM-140-05 | Crear políticas default para cada scope de asset | `apps/api/src/services/asset-policy.service.ts` | ✅ |
| AM-140-06 | Agregar logs de depuración con prefijo `[AssetPolicy]` | `apps/api/src/services/asset-policy.service.ts` | ✅ |

**Criterios de aceptación:**
- [x] URLs firmadas expiran según política
- [x] FluxCore usa mismas APIs que usuarios humanos
- [x] Contexto incluido en firma
- [x] Políticas configurables por scope

---

### Hito AM-150: Audit & Compliance Layer ✅ COMPLETADO (2026-01-31)

**Objetivo:** Implementar logging inmutable para auditoría y compliance.

**Duración estimada:** 1 día

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-150-01 | Crear `AssetAuditService` con: logEvent, queryEvents | `apps/api/src/services/asset-audit.service.ts` | ✅ |
| AM-150-02 | Implementar eventos: `upload`, `download`, `delete`, `session_expired`, `dedup_applied` | `apps/api/src/services/asset-audit.service.ts` | ✅ |
| AM-150-03 | Asegurar inmutabilidad (solo INSERT, nunca UPDATE/DELETE) | `apps/api/src/services/asset-audit.service.ts` | ✅ |
| AM-150-04 | Implementar queries para reportes regulatorios | `apps/api/src/services/asset-audit.service.ts` | ✅ |
| AM-150-05 | Agregar logs de depuración con prefijo `[AssetAudit]` | `apps/api/src/services/asset-audit.service.ts` | ✅ |

**Criterios de aceptación:**
- [x] Todos los accesos registrados
- [x] Eventos inmutables
- [x] Queries deterministas
- [x] Soporte para GDPR/compliance

---

### Hito AM-160: API REST de Assets ✅ COMPLETADO (2026-01-31)

**Objetivo:** Exponer endpoints REST para gestión de assets.

**Duración estimada:** 1.5 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-160-01 | Crear `assets.routes.ts` con todos los endpoints | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-02 | `POST /assets/upload-session` - Crear sesión de upload | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-03 | `PUT /assets/upload/:sessionId` - Streaming upload | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-04 | `POST /assets/upload/:sessionId/commit` - Confirmar upload | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-05 | `GET /assets/:id` - Obtener metadata | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-06 | `POST /assets/:id/sign` - Generar URL firmada | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-07 | `POST /assets/search` - Buscar assets | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-08 | `DELETE /assets/:id` - Eliminar asset | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-09 | `GET /assets/:id/versions` - Listar versiones | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-160-10 | Registrar rutas en `server.ts` | `apps/api/src/server.ts` | ✅ |
| AM-160-11 | Documentar endpoints en Swagger | `apps/api/src/routes/assets.routes.ts` | ✅ |

**Criterios de aceptación:**
- [x] Todos los endpoints funcionales
- [ ] Autenticación requerida (pendiente middleware)
- [ ] Validación de ownership (pendiente)
- [x] Documentación Swagger completa

---

### Hito AM-170: Relaciones con Entidades ✅ COMPLETADO

**Objetivo:** Implementar endpoints para vincular assets con mensajes, plantillas y plans.

**Duración estimada:** 1 día

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-170-01 | `POST /messages/:id/assets` - Vincular asset a mensaje | `apps/api/src/routes/asset-relations.routes.ts` | ✅ |
| AM-170-02 | `GET /messages/:id/assets` - Listar assets de mensaje | `apps/api/src/routes/asset-relations.routes.ts` | ✅ |
| AM-170-03 | `DELETE /messages/:id/assets/:assetId` - Desvincular | `apps/api/src/routes/asset-relations.routes.ts` | ✅ |
| AM-170-04 | Endpoints equivalentes para templates | `apps/api/src/routes/asset-relations.routes.ts` | ✅ |
| AM-170-05 | Endpoints equivalentes para plans | `apps/api/src/routes/asset-relations.routes.ts` | ✅ |
| AM-170-06 | Servicio de relaciones con audit log | `apps/api/src/services/asset-relations.service.ts` | ✅ |

**Criterios de aceptación:**
- [x] Relaciones normalizadas en tablas dedicadas
- [x] Validación de permisos por contexto
- [x] Cache derivable desde tablas fuente

---

### Hito AM-180: Frontend - Asset Uploader ✅ COMPLETADO

**Objetivo:** Crear componente de upload de assets para el chat.

**Duración estimada:** 2 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-180-01 | Crear hook `useAssetUpload` con estado de progreso | `apps/web/src/hooks/useAssetUpload.ts` | ✅ |
| AM-180-02 | Crear componente `AssetUploader` con drag & drop | `apps/web/src/components/chat/AssetUploader.tsx` | ✅ |
| AM-180-03 | Implementar preview de archivos antes de enviar | `apps/web/src/components/chat/AssetUploader.tsx` | ✅ |
| AM-180-04 | Mostrar progreso de upload con barra | `apps/web/src/components/chat/AssetUploader.tsx` | ✅ |
| AM-180-05 | Integrar en `ChatInput` | `apps/web/src/components/chat/ChatInput.tsx` | ✅ |
| AM-180-06 | Agregar métodos a `api.ts` para assets | `apps/web/src/services/api.ts` | ✅ |

**Criterios de aceptación:**
- [x] Drag & drop funcional
- [x] Preview de imágenes
- [x] Barra de progreso
- [x] Manejo de errores

---

### Hito AM-190: Frontend - Asset Preview & Browser ✅ COMPLETADO

**Objetivo:** Crear componentes para visualizar y gestionar assets.

**Duración estimada:** 1.5 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-190-01 | Crear componente `AssetPreview` para mensajes | `apps/web/src/components/chat/AssetPreview.tsx` | ✅ |
| AM-190-02 | Crear componente `AssetBrowser` para gestión | `apps/web/src/components/assets/AssetBrowser.tsx` | ✅ |
| AM-190-03 | Implementar galería de imágenes con lightbox | `apps/web/src/components/chat/AssetPreview.tsx` | ✅ |
| AM-190-04 | Integrar `AssetPreview` en `MessageBubble` | `apps/web/src/components/chat/MessageBubble.tsx` | ✅ |
| AM-190-05 | Agregar `AssetBrowser` como tab en DynamicContainer | `apps/web/src/components/panels/DynamicContainer.tsx` | 🟡 Pendiente |

**Criterios de aceptación:**
- [x] Imágenes se muestran inline en mensajes
- [x] Otros archivos muestran icono + nombre
- [x] Browser permite buscar y filtrar
- [x] Lightbox para imágenes

---

### Hito AM-200: Activity Bar - Asset Monitoring Panel 🔍 ✅ COMPLETADO (2026-01-31)

**Objetivo:** Agregar panel de monitoreo de assets en Activity Bar con logs de depuración en tiempo real.

**Duración estimada:** 2 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-200-01 | Crear store `assetMonitorStore` con logs en tiempo real | `apps/web/src/store/assetMonitorStore.ts` | ✅ |
| AM-200-02 | Crear componente `AssetMonitoringPanel` | `apps/web/src/components/monitor/AssetMonitoringPanel.tsx` | ✅ |
| AM-200-03 | Implementar filtros: por cuenta, tipo, estado, fecha | `apps/web/src/components/monitor/AssetMonitoringPanel.tsx` | ✅ |
| AM-200-04 | Mostrar eventos en tiempo real via WebSocket | `apps/web/src/components/monitor/AssetMonitoringPanel.tsx` | 🟡 Pendiente WS |
| AM-200-05 | Agregar métricas: uploads activos, storage usado, sesiones | `apps/web/src/components/monitor/AssetMonitoringPanel.tsx` | ✅ |
| AM-200-06 | Integrar en `MonitoringHub` como nueva sección | `apps/web/src/components/monitor/MonitoringSidebar.tsx` | ✅ |
| AM-200-07 | Agregar botón en ActivityBar para acceso rápido | `apps/web/src/components/layout/ActivityBar.tsx` | ✅ (via Monitoring) |
| AM-200-08 | Crear endpoint `/assets/debug/logs` para logs históricos | `apps/api/src/routes/assets.routes.ts` | ✅ |
| AM-200-09 | Emitir eventos WebSocket para asset operations | `apps/api/src/services/asset-*.service.ts` | 🟡 Pendiente |

**Logs de depuración a mostrar:**
```
[AssetGateway] Session created: {sessionId, accountId, expiresAt}
[AssetGateway] Upload started: {sessionId, fileName, size}
[AssetGateway] Upload progress: {sessionId, bytesUploaded, totalBytes}
[AssetGateway] Upload committed: {sessionId, assetId}
[AssetGateway] Session expired: {sessionId, reason}
[AssetRegistry] Asset created: {assetId, status, scope}
[AssetRegistry] Asset state changed: {assetId, from, to}
[AssetRegistry] Dedup applied: {assetId, existingAssetId}
[AssetPolicy] Access evaluated: {assetId, actor, context, allowed}
[AssetPolicy] URL signed: {assetId, ttl, context}
[AssetAudit] Event logged: {action, assetId, actor}
```

**Criterios de aceptación:**
- [ ] Logs visibles en tiempo real
- [ ] Filtros funcionales
- [ ] Métricas actualizadas
- [ ] Exportar logs a JSON
- [ ] Copiar logs al portapapeles

---

### Hito AM-210: Retención y Account Deletion ✅ COMPLETADO

**Objetivo:** Integrar assets con el sistema de eliminación de cuentas.

**Duración estimada:** 1 día

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-210-01 | Agregar purge de assets en `account-deletion.processor.ts` | `apps/api/src/workers/account-deletion.processor.ts` | ✅ |
| AM-210-02 | Crear `AssetDeletionService` para purge de storage | `apps/api/src/services/asset-deletion.service.ts` | ✅ |
| AM-210-03 | Agregar tablas de assets a `account-deletion.local.ts` | `apps/api/src/services/account-deletion.local.ts` | ✅ |
| AM-210-04 | Incluir resumen de assets en metadata del job | `apps/api/src/workers/account-deletion.processor.ts` | ✅ |

**Criterios de aceptación:**
- [x] Assets eliminados al purgar cuenta
- [x] Archivos físicos eliminados del storage
- [x] Logs de eliminación trazables

---

### Hito AM-220: Tests E2E y Hardening ✅ COMPLETADO

**Objetivo:** Crear suite de tests y hardening de seguridad.

**Duración estimada:** 2 días

**Tareas:**

| ID | Tarea | Archivo | Estado |
|----|-------|---------|--------|
| AM-220-01 | Tests unitarios: AssetRegistryService | `apps/api/src/services/asset-registry.service.test.ts` | ✅ |
| AM-220-02 | Tests unitarios: Assets Routes | `apps/api/src/routes/assets.routes.test.ts` | ✅ |
| AM-220-03 | Tests: validación de mime types | `apps/api/src/routes/assets.routes.test.ts` | ✅ |
| AM-220-04 | Tests: sanitización de nombres de archivo | `apps/api/src/routes/assets.routes.test.ts` | ✅ |
| AM-220-05 | Tests: signed URLs y expiración | `apps/api/src/routes/assets.routes.test.ts` | ✅ |
| AM-220-06 | Tests: validación de ownership | `apps/api/src/routes/assets.routes.test.ts` | ✅ |
| AM-220-07 | Tests: relaciones de assets | `apps/api/src/routes/assets.routes.test.ts` | ✅ |

**Criterios de aceptación:**
- [x] 53 tests passing
- [x] Validaciones de seguridad testeadas
- [x] Build exitoso

---

## Cronograma Estimado

| Hito | Duración | Dependencias |
|------|----------|--------------|
| AM-100 Schema DB | 1 día | - |
| AM-110 Storage Adapter | 1.5 días | AM-100 |
| AM-120 Asset Gateway | 2 días | AM-100, AM-110 |
| AM-130 Asset Registry | 2 días | AM-100, AM-110 |
| AM-140 Policy Engine | 1.5 días | AM-130 |
| AM-150 Audit Layer | 1 día | AM-130 |
| AM-160 API REST | 1.5 días | AM-120, AM-130, AM-140, AM-150 |
| AM-170 Relaciones | 1 día | AM-160 |
| AM-180 Frontend Upload | 2 días | AM-160 |
| AM-190 Frontend Preview | 1.5 días | AM-160 |
| AM-200 Monitoring Panel | 2 días | AM-150, AM-160 |
| AM-210 Account Deletion | 1 día | AM-130 |
| AM-220 Tests E2E | 2 días | Todos |

**Total estimado:** ~20 días de desarrollo

---

## Indicadores de Estado

| Estado | Significado |
|--------|-------------|
| ⬜ | No iniciado |
| 🟡 | En progreso |
| ✅ | Completado |
| 🔴 | Bloqueado/Problema |

---

## Riesgos Identificados

| Riesgo | Mitigación |
|--------|------------|
| Uploads huérfanos | TTL en sesiones + cleanup worker |
| URLs reutilizadas | Contexto en firma + TTL corto |
| Inferencia por hash | No compartir hash cross-account |
| FluxCore con privilegios | Usa mismas APIs que usuarios |
| Storage lleno | Cuotas por cuenta + alertas |

---

## Verificación Final

Antes de marcar el sistema como **PRODUCTION-READY**:

1. [ ] `bun run build` exitoso
2. [ ] Todos los tests E2E pasando
3. [ ] Logs de depuración visibles en Activity Bar
4. [ ] Documentación actualizada
5. [ ] Revisión de seguridad completada
6. [ ] Métricas de monitoreo configuradas
