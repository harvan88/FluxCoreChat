# Agente IA de Eliminación de Cuentas — Plan de Ejecución por Hitos

> Documento derivado de la revisión completa del monorepo (apps/api, apps/web, packages/db, extensions/*).
> Estado del repositorio: bun run dev activo, docker-compose (postgres/redis) en marcha.

---

## 0. Contexto Actual (verificado 2026-01-29)

1. **Flujo de eliminación implementado**: `AccountDeletionService` ejecuta request/snapshot/confirm; al pulsar "Eliminar definitivamente" el job se encola y la cuenta se bloquea mientras el worker corre en background (@apps/api/src/services/account-deletion.service.ts, @apps/api/src/workers/account-deletion.worker.ts).
2. **Rutas**: `apps/api/src/routes/accounts.routes.ts` expone `POST /:id/delete/request`, `/snapshot`, `/confirm`, `GET /:id/delete/job` y `/snapshot/download`. Actualmente la confirmación no requiere haber descargado el snapshot; simplemente marca la cuenta para eliminación inmediata.
3. **Frontend**: Settings > Accounts muestra el wizard (`AccountDeletionWizard`) con botón “Eliminar definitivamente” que dispara el banner de proceso en curso sin esperar descarga previa; `useAccountDeletion` maneja los pasos y estados (@apps/web/src/components/accounts/AccountDeletionWizard.tsx, @apps/web/src/hooks/useAccountDeletion.ts`).
4. **Persistencia local**: `clearAccountData`/`deleteAccountDatabase` existen y `useWebSocket` escucha `account:deleted` para limpiar Dexie cuando el worker completa (@apps/web/src/hooks/useWebSocket.ts).
5. **Pruebas**: `ensureAccountDeletionAuth` ya devuelve `{ mode, targetAccountId, sessionAccountId }` y las pruebas correspondientes están actualizadas (bun test en verde a 2026-01-29) (@apps/api/src/middleware/account-deletion-auth.ts@44-104, @apps/api/src/middleware/account-deletion-auth.test.ts@24-88).
6. **Recursos OpenAI**: `fluxcoreService.deleteAssistant` y `deleteVectorStoreCascade` ya eliminan asistentes/vector stores locales + OpenAI, reutilizados por el worker.

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

- **Estado actual**: ⚠️ **En curso (middleware operativo, pruebas aún rojas).** Toda la superficie de `/accounts/:id/delete/*` delega en `requireAccountDeletionAuthFromContext`, que a su vez usa `ensureAccountDeletionAuth` para contrastar sesión vs. `ACCOUNT_DELETE_FORCE` (@apps/api/src/middleware/account-deletion-auth.ts@1-104). Las rutas (`request`, `snapshot`, `snapshot/ack`, `confirm`, `snapshot/download`) ya utilizan el middleware central (@apps/api/src/routes/accounts.routes.ts@217-500).
- **Seeds/admin**: `packages/db/src/seed-system-admins.ts` y `packages/db/src/seed-test-baseline.ts` otorgan el scope `ACCOUNT_DELETE_FORCE`, y `systemAdminService.hasScope` expone la verificación centralizada (@apps/api/src/services/system-admin.service.ts@1-112).
- **Pruebas**: `apps/api/src/middleware/account-deletion-auth.test.ts` y `apps/api/src/routes/account-deletion.routes.test.ts` siguen fallando porque las expectativas sólo contemplan `{ mode }`, mientras que el middleware retorna también `targetAccountId` y `sessionAccountId` cuando aplica (@apps/api/src/middleware/account-deletion-auth.test.ts@23-88). Necesitamos actualizar los asserts/snapshots y volver a ejecutar `bun test` antes de cerrar el hito.

- **Pendientes inmediatos**:
  1. Ajustar los tests para reflejar el nuevo contrato del middleware (owner vs force) y dejar la suite en verde.
  2. Documentar en la UI/admin cómo se expone el scope `ACCOUNT_DELETE_FORCE` (sin bloquear AD-110).

**Archivos afectados**: `apps/api/src/routes/accounts.routes.ts`, `apps/api/src/middleware/account-deletion-auth.ts`, `apps/api/src/services/system-admin.service.ts`, `packages/db/src/seed-system-admins.ts`, `packages/db/src/seed-test-baseline.ts`.

---

## 3. Hito AD-120 — Snapshot & Consentimiento Expreso

**Objetivo**: ofrecer descarga íntegra y consentimiento expreso ANTES o DESPUÉS de confirmar, según la nueva política.

- **Estado actual**: ✅ **Actualizado 2026-01-30.** El backend ya permite confirmar inmediatamente, pero ahora protege la secuencia completa:
  - `AccountDeletionService.confirmDeletion()` genera y persiste `snapshotDownloadToken` (TTL 48h) y marca `metadata.snapshotGeneration.pending` cuando todavía no existe ZIP.
  - `AccountDeletionExternalService` fuerza la generación del snapshot antes de pasar a limpieza externa/local; el worker revisa `snapshotReadyAt` y no avanza de fase hasta que exista el archivo.
  - Nuevas migraciones `028-030_*` desacoplaron `account_deletion_jobs`/`account_deletion_logs` de los FKs sobre `accounts`, evitando que la evidencia desaparezca cuando se purga la cuenta.
  - Portal público (`/account-deletions/:jobId?token=…`) permite descargar aun sin sesión; el wizard expone el enlace y copia/abre en pestaña aparte.
- **Pendientes**:
  1. Añadir pruebas automáticas (unitarias + e2e) que validen el nuevo contrato del portal/token.
  2. Documentar en el runbook la rotación manual del token y el procedimiento para regenerar snapshots si expiran.
  3. Revisar UX final para que el wizard muestre de forma explícita el TTL restante.

**Archivos afectados**: `packages/db/migrations/024_account_deletion_snapshot_consent.sql`, `packages/db/src/schema/account-deletion.ts`, `apps/api/src/services/account-deletion.service.ts`, `apps/api/src/routes/accounts.routes.ts`, `apps/api/src/routes/account-deletion.routes.test.ts`, `apps/web/src/services/api.ts`, `apps/web/src/services/accounts.ts`, `apps/web/src/hooks/useAccountDeletion.ts`, `apps/web/src/components/accounts/AccountDeletionWizard.tsx`.

### 3.1 Hito AD-125 — Portal/Post-confirmación de Descarga

**Objetivo**: entregar el respaldo al usuario después de confirmar la eliminación, sin requerir acceso a la cuenta ni correo electrónico.

- **Estado actual**: ✅ **Portal operativo 2026-01-30.**
  1. Token seguro generado al confirmar y almacenado en `metadata.snapshotDownloadToken` con TTL 48h.
  2. Rutas públicas (`GET /account-deletions/:jobId/status|download?token=…`) expuestas y consumidas por la nueva página pública `AccountDeletionPortalPage`.
  3. Portal React muestra estado, expiración y botón de descarga; incluye panel “Actividad reciente” para depurar requests y asegura que sólo se comunique la ventana de 48h.
  4. Hook `useAccountDeletion` construye `snapshotPortalUrl` con `window.location.origin` y redirige automáticamente tras confirmar.
- **Pendientes**:
  - Automatizar la limpieza de ZIPs expirados y reflejarlo en `metadata.snapshotExpiredAt`.
  - Añadir métrica/log específico cuando el portal descarga exitosamente (para AD-170).
  - UX: mostrar CTA secundario para copiar el enlace directamente desde el banner global.

---

## 4. Hito AD-130 — Limpieza Externa (OpenAI) Secuencial

**Objetivo**: eliminar asistentes, archivos y vector stores externos usando APIs oficiales y dejar constancia auditable del contrato entre dominios.

- **Estado actual**: ✅ Implementado (2026-01-28). `AccountDeletionExternalService` (@apps/api/src/services/account-deletion.external.ts@1-325) opera localmente en tres fases determinísticas (assistants → files → vectorStores), registrando el avance en `account_deletion_jobs.externalState`. Cada fase consulta Drizzle directamente (`fluxcore_assistants`, `fluxcore_vector_store_files`, `fluxcore_vector_stores`) y delega en:
  1. `fluxcoreService.deleteAssistant` para asistencias locales/externalizadas;
  2. `removeFileFromOpenAIVectorStore` + `deleteOpenAIFile` para quitar archivos de OpenAI antes de limpiar la tabla local;
  3. `deleteVectorStoreCascade` para eliminar stores y vínculos.
  Todos los llamados se envuelven en `runWithRetry` con backoff [5s, 15s, 45s] y tratan los 404 como éxito idempotente.
- **Token/metadata**: se genera un token firmado (`generateDeletionToken`) y se persiste en `job.metadata.externalDeletionToken` sólo para auditoría interna; no hay handshake externo ni polling porque la eliminación ocurre dentro del mismo backend.
- **Worker**: `accountDeletionExternalService.run(job)` se invoca desde `processExternalCleanup` antes de avanzar a `local_cleanup` (ver @apps/api/src/workers/account-deletion.processor.ts@83-118). Fallas elevan `markDeletionJobFailed` con `failed_external_cleanup` y quedan trazadas en `account_deletion_logs`.
- **Validación**: requiere semillas con recursos OpenAI (`bun run packages/db/src/seed-test-baseline.ts`). Las rutas y guardias ya están cubiertas por tests; faltan pruebas unitarias específicas del servicio externo (tarea abierta para AD-170/observabilidad).

**Archivos afectados**: `apps/api/src/services/account-deletion.external.ts`, `apps/api/src/services/openai-sync.service.ts`, `apps/api/src/services/vector-store-deletion.service.ts`, `apps/api/src/workers/account-deletion.processor.ts`, tablas `fluxcore_*` en `packages/db`.

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

**Objetivo**: experiencia consistente con instrucciones (redirigir al inicio o al portal de descarga tras confirmar, proceso background transparente).

- **Estado actual**: ✅ Implementado (2026-01-30). La UI elimina el antiguo `AccountDeletionBanner` y se apoya en toasts + redirecciones inmediatas: si el usuario preserva datos se abre el portal `/account-deletions/:jobId`, de lo contrario se vuelve a Conversaciones. `useAccountDeletion` continúa orquestando la UX (toasts, cambio de actividad, snapshot UX) y `useWebSocket` finaliza la limpieza local cuando llega `account:deleted` (reset layout, tabs, cuenta seleccionada). Al no depender del banner global, desktop y mobile quedan libres de overlays permanentes.
- **Pendiente**: ejercicios manuales/E2E para validar transiciones con múltiples cuentas y documentar en el Runbook cómo intervenir si el portal muestra estados incongruentes.

**Archivos afectados**: `apps/web/src/hooks/useAccountDeletion.ts`, `apps/web/src/hooks/useWebSocket.ts`, `apps/web/src/store/uiStore.ts`, `apps/web/src/components/accounts/AccountDeletionWizard.tsx`, `apps/web/src/components/layout/Layout.tsx`, `apps/web/src/pages/AccountDeletionPortalPage.tsx`, `apps/web/src/components/ui/ToastStack.tsx`.

---

## 8. Hito AD-170 — Auditoría, Observabilidad y Documentación

**Objetivo**: dejar trazabilidad completa y manual operativo.

- **Estado actual**: ⚠️ Parcial, pero con mejoras recientes.
  - `account_deletion_logs` ahora preserva evidencia aun después del purge gracias a migraciones `028-030` (se eliminaron FKs cascada).
  - El portal público registra actividad local (panel “Actividad reciente”) para depurar sin abrir la consola.
  - Falta documentar el runbook completo y agregar telemetría/alertas externas.
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
