# Agente IA de Eliminación de Cuentas — Plan de Ejecución por Hitos

> Documento derivado de la revisión completa del monorepo (apps/api, apps/web, packages/db, extensions/*).
> Estado del repositorio: bun run dev activo, docker-compose (postgres/redis) en marcha.

---

## 0. Contexto Actual (verificado 2026-01-27)

1. **Flujo de eliminación implementado**: existe `AccountDeletionService` con request/snapshot/confirm, `AccountDeletionGuard` y worker en background (@apps/api/src/services/account-deletion.service.ts, @apps/api/src/services/account-deletion.guard.ts, @apps/api/src/workers/account-deletion.worker.ts).
2. **Rutas**: `apps/api/src/routes/accounts.routes.ts` expone `POST /:id/delete/request`, `/snapshot`, `/confirm` y `GET /:id/delete/job` protegidos por autenticación.
3. **Frontend**: Settings > Accounts renderiza `AccountDeletionWizard` con flujo en 3 pasos (@apps/web/src/components/accounts/AccountDeletionWizard.tsx) y el hook `useAccountDeletion` orquesta la API.
4. **Persistencia local**: `clearAccountData`/`deleteAccountDatabase` existen y ahora `useWebSocket` escucha `account:deleted` para limpiar Dexie cuando el worker completa (@apps/web/src/hooks/useWebSocket.ts).
5. **Recursos OpenAI**: `fluxcoreService.deleteAssistant` y `deleteVectorStoreCascade` ya eliminan asistentes/vector stores locales + OpenAI, reutilizados por el worker.

Conclusión: el agente ya está parcialmente operativo; este plan actúa como checklist de brechas pendientes (tests, permisos formales, resiliencia, documentación).

---

## 1. Hito AD-100 — Guardianes y Prohibiciones Absolutas

**Objetivo**: blindar el sistema antes de exponer cualquier acción destructiva.

- **Estado actual**: ✅ **Completado 2026-01-27.**
  - Script `seed:protected-accounts` registra todas las cuentas del owner `harvan@hotmail.es` en `protected_accounts` con trazabilidad (`packages/db/src/seed-protected-accounts.ts`, `package.json`).
  - `AccountDeletionGuard` ahora soporta dependencias inyectables, emite `critical_attempt` diferenciando owner/account, exporta `ensureAccountDeletionAllowed` y es reutilizado por el worker para defensa en profundidad (@apps/api/src/services/account-deletion.guard.ts, @apps/api/src/workers/account-deletion.worker.ts).
  - Nuevos tests unitarios (`account-deletion.guard.test.ts`) validan cuentas protegidas, owners bloqueados y cuentas inexistentes.

- **Pendiente**: _N/A (cerrado)._

- Agregar catálogo `protected_accounts` (accountId, ownerUserId, reason, enforcedBy, createdAt) y/o constraint lógico en `accounts` para emails prohibidos, asegurando que toda cuenta con el **mismo ownerUserId** que `harvan@hotmail.es` quede bloqueada (alcance directo e indirecto). La verificación parte de una consulta única:
  ```sql
  -- Owner real obtenido desde PostgreSQL:
  -- SELECT id FROM users WHERE email = 'harvan@hotmail.es';
  -- → 535949b8-58a9-4310-87a7-42a2480f5746
  SELECT id
  FROM accounts
  WHERE owner_user_id = '535949b8-58a9-4310-87a7-42a2480f5746';
  ```
  Se registran todas esas cuentas en `protected_accounts` y el middleware evita cualquier intento sobre ellas.
- Middleware `ensureAccountDeletionAllowed(accountId)` reutilizable en API + worker **(implementado)**.
- Registro inmediato de intentos prohibidos en `account_deletion_logs` con tipo `critical_attempt` **(implementado)**.
- Tests unitarios (Vitest) que validen bloqueo cuando owner.email === `harvan@hotmail.es` **(implementado).**

**Archivos afectados**: `packages/db` (nueva tabla + seeds), `apps/api/src/middleware`, `apps/api/src/services/account-deletion.guard.ts` (nuevo), `apps/api/src/services/logger.service.ts`.

---

## 2. Hito AD-110 — Autorización Formal (Propietario vs Admin FORCE)

**Objetivo**: garantizar que solo actores válidos inicien el proceso sin emails de verificación.

- **Estado actual**: ⚠️ Parcial. `accountDeletionService.requestDeletion` valida owner+sesión o `systemAdminService.hasScope('ACCOUNT_DELETE_FORCE')`; los endpoints ya existen.
- **Pendiente**: middleware dedicado `requireAccountDeletionAuth`, pruebas de integración y verificación explícita de que `ACCOUNT_DELETE_FORCE` está presente en seeds/UI de admins.

- Extender `system_admins`/roles para incluir permiso `ACCOUNT_DELETE_FORCE`.
- Middleware `requireAccountDeletionAuth`:
  1. Verifica sesión activa (`request.user`, `request.accountId`).
  2. Permite si `session.accountId === targetAccountId`.
  3. Permite si `hasPermission(userId, 'ACCOUNT_DELETE_FORCE')`.
- Actualizar `apps/api/src/routes/accounts.routes.ts` con endpoint `POST /accounts/:accountId/delete/request` protegido por el middleware.
- Añadir pruebas de integración (Supertest) cubriendo 403 por permisos insuficientes.

**Archivos afectados**: `apps/api/src/routes/accounts.routes.ts`, `apps/api/src/services/auth.service.ts`, `apps/api/src/services/system-admin.service.ts`, stores frontend para permisos si se exponen.

---

## 3. Hito AD-120 — Snapshot & Consentimiento Expreso

**Objetivo**: ofrecer descarga íntegra antes de ejecutar eliminación.

- **Estado actual**: ✅ **Completado 2026-01-28.**
  - Nueva migración `024_account_deletion_snapshot_consent.sql` y schema actualizados con `snapshot_downloaded_at`, `snapshot_download_count`, `snapshot_acknowledged_at` + índice dedicado.
  - `AccountDeletionService` exige ambos flags antes de pasar a `external_cleanup`, agrega `acknowledgeSnapshot` y `getSnapshotArtifact`, y registra telemetría (user-agent, timestamps) en metadata.
  - Endpoints REST:
    - `POST /accounts/:id/delete/snapshot/ack` para registrar descargas/consentimiento explícito.
    - `GET /accounts/:id/delete/snapshot/download` entrega el ZIP autenticado y marca descargas.
  - Frontend `AccountDeletionWizard` usa `DoubleConfirmationDeleteButton` existente pero sólo habilita la confirmación cuando `snapshotDownloadedAt` y `snapshotAcknowledgedAt` están presentes; `useAccountDeletion` añadió helpers `downloadSnapshot` y `acknowledgeSnapshot` reutilizados en el wizard.
  - Test de rutas (`apps/api/src/routes/account-deletion.routes.test.ts`) cubre los nuevos endpoints y códigos 409.
- **Pendiente**: añadir monitoreo sobre tamaño del snapshot y avisos UX cuando supere umbrales (no bloqueante para AD-120).

**Archivos afectados**: `packages/db/migrations/024_account_deletion_snapshot_consent.sql`, `packages/db/src/schema/account-deletion.ts`, `apps/api/src/services/account-deletion.service.ts`, `apps/api/src/routes/accounts.routes.ts`, `apps/api/src/routes/account-deletion.routes.test.ts`, `apps/web/src/services/api.ts`, `apps/web/src/services/accounts.ts`, `apps/web/src/hooks/useAccountDeletion.ts`, `apps/web/src/components/accounts/AccountDeletionWizard.tsx`.

---

## 4. Hito AD-130 — Limpieza Externa (OpenAI) Secuencial

**Objetivo**: eliminar asistentes, archivos y vector stores externos usando APIs oficiales y dejar constancia auditable del contrato entre dominios.

- **Estado actual**: ✅ Implementado. `account-deletion.external.ts` genera token firmado, coordina las fases asistentes → archivos → vector stores con retries/404 benigno y actualiza `externalState` estructurado; el worker delega allí antes de pasar a `local_cleanup`.
- **Validación pendiente**: para correr toda la suite se requiere el seed `bun run seed:test-baseline` (crea owner protegido + admin con ACCOUNT_DELETE_FORCE + recursos Fluxcore). Mientras tanto, validar el hito ejecutando sólo los tests de account deletion (`bun test apps/api/src/services/account-deletion.guard.test.ts` y `apps/api/src/routes/account-deletion.routes.test.ts`). Documentado en QUICK_START tras `docker-compose up -d postgres redis`.

- Reutilizar `openai-sync.service.ts` para exponer métodos `deleteAssistant(externalId)`, `deleteFile`, `deleteVectorStore` con retries y detección de 404 benigno.
- Job runner consume listas de referencia (`fluxcore_assistants`, `fluxcore_vector_store_files`, `fluxcore_vector_stores` con `backend/runtime='openai'`) para auditar qué espera borrar, pero la eliminación real ocurre dentro de FluxCore.
- Orden obligatorio: asistentes → archivos → vector stores. Cada fase marca progreso en `account_deletion_jobs.externalState` y sólo avanza si FluxCore reporta éxito.
- En caso de error, el job pasa a `failed_external_cleanup` y se detiene la cascada local; el usuario no recibe la notificación de error, pero queda log interno para intervención.

- Reutilizar `openai-sync.service.ts` para exponer métodos `deleteAssistant(externalId)`, `deleteFile`, `deleteVectorStore` con retries y detección de 404 benigno.
- Job runner consume listas de referencia (`fluxcore_assistants`, `fluxcore_vector_store_files`, `fluxcore_vector_stores` con `backend/runtime='openai'`) para auditar qué espera borrar, pero la eliminación real ocurre dentro de FluxCore.
- Orden obligatorio: asistentes → archivos → vector stores. Cada fase marca progreso en `account_deletion_jobs.externalState` y sólo avanza si FluxCore reporta éxito.
- En caso de error, el job pasa a `failed_external_cleanup` y se detiene la cascada local; el usuario no recibe la notificación de error, pero queda log interno para intervención.

### Diseño técnico propuesto

1. **Servicio `account-deletion.external.ts`**
   - Expone `runExternalCleanup(job: AccountDeletionJob)` y sub-métodos internos: `requestFluxcoreDeletion`, `pollFluxcoreStatus`, `registerPhaseCompletion`.
   - Recibe dependencias (`fluxcoreService`, `openaiSyncService`, `logger`, `retry`) por constructor para facilitar pruebas.
   - Emite `externalState` con estructura:
     ```json
     {
       "externalJobId": "fluxcore-job-123",
       "phases": {
         "assistants": { "status": "completed", "attempts": 2, "finishedAt": "..." },
         "files": { "status": "in_progress", "attempts": 1 },
         "stores": { "status": "pending" }
       },
       "lastFluxcorePayload": { ... },
       "failure": { "code": "shared_resource_blocked", "message": "..." }
     }
     ```
   - Maneja retries exponenciales (p.ej. 3 intentos con backoff 5s/15s/45s) y convierte respuestas 404 de FluxCore/OpenAI en éxitos idempotentes.

2. **Handshake / autorización**
   - `generateDeletionToken(job)` crea JWT (HS256) con `accountId`, `ownerUserId`, `jobId`, `snapshotAckAt`, `exp` a +15 min.
   - `fluxcoreService.requestAccountDeletion({ accountId, token })` → retorna `{ externalJobId, status }`.
   - `pollFluxcoreStatus(externalJobId)` consulta cada 30s hasta recibir `completed` o `failed`. Los payloads se persisten en `externalState.lastFluxcorePayload` para auditoría.

3. **Integración con worker**
   - `processExternalCleanup` delega en el nuevo servicio. Si el servicio retorna `completed`, el worker mueve el job a `local_cleanup`; si lanza error, captura el motivo y llama `markFailed(job, 'failed_external_cleanup:<code>')`.
   - `ensureAccountDeletionAllowed` se ejecuta antes de llamar al servicio para reforzar defensa en profundidad.
   - Se agrega metadata `externalCleanupStartedAt/FinishedAt` y `lastExternalHeartbeatAt` (timestamp de la última respuesta de FluxCore).

4. **Persistencia / migraciones**
   - `account_deletion_jobs.externalState` pasa a JSONB estructurado (ya existe pero se documenta el shape anterior). Se añade índice GIN para consultas por `externalState->>'externalJobId'` si se requiere monitoreo.

5. **Telemetría y logging**
   - Cada transición (`assistants.completed`, `files.failed`) genera una entrada en `account_deletion_logs` con `status='external_cleanup'` y `details.phase`.
   - Se expone métrica `account_external_cleanup_duration_seconds` para Prometheus (opcional, en worker).

**Archivos afectados**: `apps/api/src/services/openai-sync.service.ts`, `apps/api/src/services/account-deletion.external.ts` (nuevo), `apps/api/src/workers/account-deletion.worker.ts`, `packages/db/src/schema/fluxcore-assistants.ts`, `fluxcore-vector-stores.ts` (lecturas) y documentación relacionada.

---

## 5. Hito AD-140 — Eliminación Local en Cascada

**Objetivo**: remover definitivamente todos los datos de FluxCore tras éxito externo.

- **Estado actual**: ✅ Implementado (2026-01-28). Ahora existe `AccountPurgeService` (@apps/api/src/services/account-deletion.local.ts) que ejecuta TODA la cascada dentro de una única transacción y devuelve un resumen (`localCleanupSummary`) con los conteos por tabla.
  - Cobertura: automation (`automation_rules`), extensiones (`extension_contexts`, `extension_installations`), website/workspaces, citas, TODOS los `fluxcore_*` (assistants/instructions/files/vector stores/tool connections/usage/logs/credit transactions/marketplace), créditos (`credits_wallets`, `credits_ledger`, `credits_conversation_sessions`), relationships/conversations/mensajes (por relationship y por sender), protecciones (`protected_accounts`, `system_admins` condicional por owner), `actors` y finalmente `accounts`.
  - El worker delega en el servicio y persiste `metadata.localCleanupSummary` + log detallado (`account_deletion_logs.details.summary`). En caso de fallo, basta reintentar `local_cleanup` y se mantendrá la idempotencia por `where accountId = ...`.
  - El evento `account:deleted` ya es consumido por el frontend: `useWebSocket` ejecuta `clearAccountData` + `deleteAccountDatabase` y reinicia la UI cuando la cuenta eliminada era la seleccionada (@apps/web/src/hooks/useWebSocket.ts, líneas 214‑228).
- **Pendiente**: ampliar cobertura de pruebas (unitarias contra `AccountPurgeService` + integración local cleanup) y exponer el resumen/métricas en dashboards una vez AD-150 habilite el worker en cola.

**Archivos afectados**: `apps/api/src/services/account-deletion.local.ts`, `apps/api/src/workers/account-deletion.worker.ts`, `apps/web/src/hooks/useWebSocket.ts`.

---

## 6. Hito AD-150 — Worker / Background Processing

**Objetivo**: ejecutar el proceso completo fuera del request/response.

- **Estado actual**: ✅ Implementado (2026-01-28). El flujo corre sobre `accountDeletionQueue` (BullMQ + Redis) con flag `ACCOUNT_DELETION_USE_QUEUE`. `AccountDeletionService.confirmDeletion()` encola jobs, `account-deletion.queue.ts` procesa fases con retries/backoff, y `server.ts` conmuta automáticamente entre cola o worker legacy según el flag (incluye graceful shutdown + cierre de Redis).
- **Métricas**: `account-deletion.processor.ts` reporta `account_deletion.jobs_processing_total`, `account_deletion.jobs_failed_total`, `account_deletion.phase_completed_total`, `account_deletion.external_cleanup/local_cleanup` timings y `account_deletion.total_duration`. Falta exportarlos al endpoint `/metrics` y dashboards externos.
- **Admin tooling**: expuesto `/internal/account-deletions` (lista + filtros + stats), `/internal/account-deletions/stats`, y `POST /internal/account-deletions/:jobId/retry-phase` con guard `ACCOUNT_DELETE_FORCE`. Servicio `account-deletion.admin.service.ts` ofrece listar/reintentar/consultar queue stats.
- **Pendiente**: pruebas unitarias/integración para queue worker y endpoints admin, exponer métricas agregadas en `/metrics` y documentar runbook de monitoreo.

### 6.1 Arquitectura propuesta
1. **Queue**: `accountDeletionQueue` (BullMQ) con `jobId = accountDeletionJob.id`. Datos del job = `{ accountId, jobId, requesterUserId, requesterAccountId }` + snapshot metadata opcional.
2. **Producer**: `AccountDeletionService.confirmDeletion()` encola `local_cleanup` cuando cambia estado a `ready_for_processing` (ya ocurre hoy al pasar a `external_cleanup`). Reemplazamos `accountDeletionWorker.start()` por `queue.add`.
3. **Worker**: nuevo `accountDeletionQueueWorker.ts` con BullMQ `Worker`. Procesa fases secuencialmente reutilizando `accountDeletionExternalService` y `accountPurgeService`. Concurrency configurable (default 2) y rate limit (N cuentas/minuto) para no saturar OpenAI ni DB.
4. **Retry/Backoff**: BullMQ maneja reintentos configurables (p.ej. 5 intentos con backoff exponencial). Al exceder, marcamos `accountDeletionJobs.status = 'failed'` y dejamos el job en `failed` para inspección.
5. **Idempotencia**: cada fase verifica `job.status` en DB antes de actuar; si un retry vuelve a entrar en `local_cleanup` ya completado, se salta gracias a `phase` en DB y al resumen guardado.

### 6.2 Observabilidad y métricas
- Exportar métricas Prometheus (via existing `/metrics`):
  - `account_deletion_jobs_total{phase}`
  - `account_deletion_duration_seconds` (histograma, diferencia entre `metadata.requestedAt` y `metadata.localCleanupFinishedAt`).
  - `account_deletion_queue_depth` (gauge leyendo `queue.getWaitingCount()` + `queue.getActiveCount()`).
  - `account_deletion_failures_total{phase,reason}`.
- Logs estructurados en cada transición + `job.attemptsMade` para debug.

### 6.3 Endpoint/Admin tooling
- **Endpoints reales**: `/internal/account-deletions` (GET) devuelve lista paginada + metadata básica; `/internal/account-deletions/stats` expone conteos por estado + `queueStats`; `POST /internal/account-deletions/:jobId/retry-phase` re-enciende fases `external_cleanup`/`local_cleanup` y reencola cuando la cola está habilitada. Todos requieren scope `ACCOUNT_DELETE_FORCE`.
- Pendiente: panel en Admin UI aprovechando estas rutas y mostrar métricas históricas.

### 6.4 Plan de implementación
1. **Infra**: agregar `@bullmq` dependencia en `apps/api` + config Redis (reusar `REDIS_URL`). Crear helper `createQueue(name)` y `createWorker(name, handler)` en `apps/api/src/queues`.
2. **Productor**: en `AccountDeletionService` reemplazar `accountDeletionWorker.start()` (actual) por `accountDeletionQueue.add()` al confirmar borrado. Registrar metadata `queueJobId`.
3. **Worker**: nuevo archivo `account-deletion.queue-worker.ts` que procesa jobs y actualiza `accountDeletionJobs`. Importado desde `server.ts` sólo para iniciar listeners (sin `setInterval`).
4. **Graceful shutdown**: hook en `server.ts` para `queueWorker.close()` y `queue.close()`.
5. **Métricas**: módulo `account-deletion.metrics.ts` que expone `collect()` para `/metrics` y es alimentado desde el worker.
6. **Endpoints admin**: rutas bajo `apps/api/src/routes/admin-account-deletions.routes.ts`, servicio `AccountDeletionMonitorService`.
7. **Tests**: unit tests para `AccountDeletionQueueWorker` (mocks de BullMQ + servicios), pruebas E2E del endpoint admin y caso retry.
8. **Rollout**: feature flag `ACCOUNT_DELETION_USE_QUEUE` durante transición; cuando esté estable se elimina el worker anterior.

**Dependencias externas**: Redis (ya requerido por `docker-compose`). Para producción, considerar `bull-board`/CLI `bunx bullmq-pro` para inspección.

- Introducir cola `account-deletion` (Redis o Bun queue). Productor: endpoint `/delete/confirm` encola job.
- Worker `scripts/account-deletion-worker.ts` o `apps/api/src/workers/account-deletion.worker.ts` que:
  1. Reconfirma prohibiciones (defensa en profundidad).
  2. Llama a Snapshots → OpenAI cleanup → Local cleanup.
  3. Actualiza `account_deletion_jobs.status` (`pending`, `snapshot_ready`, `external_cleanup`, `local_cleanup`, `completed`, `failed`).
- Logs detallados + métrica Prometheus (`account_deletion_duration_seconds`).
- Endpoint admin `GET /internal/account-deletion-jobs` para monitorear.

**Archivos afectados**: `apps/api/src/queues/*`, `apps/api/src/services/account-deletion.service.ts`, `apps/api/src/workers/account-deletion.*`, `apps/api/src/routes/account-deletion.admin.routes.ts`, `apps/api/src/server.ts`.

---

## 7. Hito AD-160 — UX Final y Redirección

**Objetivo**: experiencia consistente con instrucciones (redirigir al inicio tras confirmar, proceso background).

- **Estado actual**: ✅ Implementado (2026-01-28). La UI ahora muestra un banner global de “Eliminación en curso”, toasts para cada transición y redirige automáticamente a Conversaciones mientras se cierra el layout anterior. `useAccountDeletion` dispara las acciones (banner/toasts, cambio de actividad, snapshot UX) y `useWebSocket` finaliza la limpieza local cuando llega `account:deleted` (reset layout, tabs, cuenta seleccionada). Banners/toasts se renderizan en `Layout`, de modo que cualquier vista (desktop o mobile) refleja el estado.
- **Pendiente**: ejercicios manuales/E2E para validar transiciones con múltiples cuentas y documentar en el Runbook cómo intervenir si el banner queda “atascado”.

**Archivos afectados**: `apps/web/src/hooks/useAccountDeletion.ts`, `apps/web/src/hooks/useWebSocket.ts`, `apps/web/src/store/uiStore.ts`, `apps/web/src/components/accounts/AccountDeletionWizard.tsx`, `apps/web/src/components/layout/Layout.tsx`, `apps/web/src/components/ui/AccountDeletionBanner.tsx`, `apps/web/src/components/ui/ToastStack.tsx`.

---

## 8. Hito AD-170 — Auditoría, Observabilidad y Documentación

**Objetivo**: dejar trazabilidad completa y manual operativo.

- **Estado actual**: ⚠️ Parcial. `account_deletion_logs` registra eventos, pero no hay runbook ni webhooks.
- **Pendiente**: redactar `docs/ACCOUNT_DELETION_RUNBOOK.md`, integrar logger/webhook, actualizar `1. EXECUTION_PLAN.md`, y cubrir casos con tests E2E.
- Tabla `account_deletion_logs` (jobId, accountId, requesterId, status, reason, createdAt).
- Integración con logger central y, opcionalmente, webhook (Slack/email) para eventos `critical_attempt`, `job_failed`, `job_completed`.
- Documentar en `docs/ACCOUNT_DELETION_RUNBOOK.md`: pasos para monitoreo, reintentos, recuperación tras fallo OpenAI.
- Actualizar `1. EXECUTION_PLAN.md` bajo nuevo hito “AD – Account Deletion Agent” con checklist de tareas.
- Añadir pruebas E2E (Playwright) que cubran: owner sin permisos (deny), admin FORCE (allow), snapshot flow, notificaciones.

---

## 9. Dependencias y Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Fallo al eliminar recursos OpenAI deja sistema inconsistente | No proceder a cascada local hasta completar; job queda en `failed_external_cleanup` con botón "Reintentar" que re-enciende AD-130. |
| Snapshot grande afecta performance | Generar streaming ZIP + chunk upload al storage; limitar tamaños con aviso. |
| Redirección inmediata confunde al usuario | Mostrar banner persistente "Eliminación en curso" (estado global) hasta recibir evento final. |
| Worker caído | Health check + alerta cuando existan jobs `in_progress` > SLA (e.g., 15 min). |

---

## 10. Checklist de Verificación Final

1. `bun run test` + nuevos tests unitarios.
2. `bun run build` sin errores.
3. Prueba manual:
   - Cuenta no protegida, owner inicia → snapshot → confirm → redirección → WebSocket notifica.
   - Admin con `ACCOUNT_DELETE_FORCE` elimina otra cuenta.
   - Intento sobre `harvan@hotmail.es` → rechaza y log crítico.
4. Documentación actualizada (Quick Start, Runbook, Execution Plan).

---

**Resultado esperado**: proceso irreversible, auditable y seguro para eliminar cuentas, alineado con las reglas formales entregadas y reutilizando los componentes existentes del repositorio.
