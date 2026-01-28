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

- **Estado actual**: ✅ Tabla `account_deletion_jobs`, servicio `accountDeletionSnapshotService.generate` y wizard en Settings implementados.
- **Pendiente**: UX de confirmación de descarga (checkbox) ya existe, pero falta telemetría del clic de descarga y advertencia cuando snapshot supere cierto tamaño.

- Crear tabla `account_deletion_jobs` (estado, requesterId, snapshotUrl, snapshotReadyAt, failureReason, timestamps).
- Servicio `AccountDeletionSnapshotService`:
  - Consolida datos (conversaciones, mensajes, contextos, archivos, configuraciones de extensiones, vector stores locales) en archivo ZIP.
  - Publica artefacto en storage (S3/local) y guarda URL.
- API `POST /accounts/:id/delete/snapshot` → encola job, responde con estado `pending` y poll intervals.
- UI en Settings → wizard 3 pasos (reglas → descarga → confirmación) usando `DoubleConfirmationDeleteButton` solo para abrir modal.
- Estado `snapshotRequired=true` hasta que usuario descargue (checkbox “Confirmo que descargué…”).

**Archivos afectados**: `packages/db/src/schema/account-deletion-jobs.ts` (nuevo), `apps/api/src/services/account-deletion.snapshot.ts` (nuevo), `apps/web/src/components/settings/AccountDeletionWizard.tsx` (nuevo), `apps/web/src/services/accountDeletion.ts` (nuevo client).

---

## 4. Hito AD-130 — Limpieza Externa (OpenAI) Secuencial

**Objetivo**: eliminar asistentes, archivos y vector stores externos usando APIs oficiales.

- **Estado actual**: ⚠️ Parcial. El worker llama `fluxcoreService.deleteAssistant` y `deleteVectorStoreCascade`, pero no separa fases (assistants/files/stores) ni persiste `externalState` detallado.
- **Pendiente**: crear `account-deletion.external.ts` con retries, manejo 404 benigno, y registrar progreso/errores en `account_deletion_jobs.externalState`.

- Reutilizar `openai-sync.service.ts` para exponer métodos `deleteAssistant(externalId)`, `deleteFile`, `deleteVectorStore` con retries y detección de 404 benigno.
- Job runner consume listas desde `fluxcore_assistants`, `fluxcore_vector_store_files`, `fluxcore_vector_stores` filtradas por `backend='openai'` / `runtime='openai'`.
- Orden obligatorio: asistentes → archivos → vector stores. Cada fase marca progreso en `account_deletion_jobs.externalState`.
- En caso de error, job pasa a `failed_external_cleanup` y aborta local delete.

**Archivos afectados**: `apps/api/src/services/openai-sync.service.ts`, `apps/api/src/services/account-deletion.external.ts` (nuevo), `packages/db/src/schema/fluxcore-assistants.ts`, `fluxcore-vector-stores.ts` (ya existentes, solo lecturas).

---

## 5. Hito AD-140 — Eliminación Local en Cascada

**Objetivo**: remover definitivamente todos los datos de FluxCore tras éxito externo.

- **Estado actual**: ⚠️ Parcial. El worker limpia automation rules, fluxcore entities, conversations/messages, relationships y cierra cuentas/actors dentro de una transacción. Se emite `account:deleted` y el cliente limpia Dexie.
- **Pendiente**: extender el purge a créditos/ledger/tablas auxiliares y encapsular la lógica en un `AccountPurgeService` con lista exhaustiva de tablas.

- Crear servicio `AccountPurgeService` con transacción `db.transaction(async (tx) => {...})`.
- Orden sugerido:
  1. Automation rules / triggers
  2. Fluxcore entities (`fluxcore_*`)
  3. Conversations/messages/participants (`messages`, `conversations`, `conversation_participants`)
  4. Relationships/context overlays
  5. Credits / ledgers / system tables
  6. Accounts + actors
- Ningún soft delete; utilizar `delete` + cascadas en schema.
- Al finalizar, invocar limpieza Dexie: emitir evento WS `account:deleted` para que clientes llamen `clearAccountData` y `deleteAccountDatabase`.

**Archivos afectados**: `apps/api/src/services/account-deletion.local.ts` (nuevo), `apps/api/src/websocket/events.ts`, `apps/web/src/hooks/useWebSocket.ts` (nuevo handler), `apps/web/src/store/accountStore.ts` (reset state al recibir evento).

---

## 6. Hito AD-150 — Worker / Background Processing

**Objetivo**: ejecutar el proceso completo fuera del request/response.

- **Estado actual**: ⚠️ Parcial. `AccountDeletionWorker` con `setInterval` corre desde `server.ts` y procesa snapshots+external+local cleanup.
- **Pendiente**: mover a cola dedicada (Redis/Bun queue), exponer métricas (`account_deletion_duration_seconds`), health-check/monitoring y endpoint admin.

- Introducir cola `account-deletion` (Redis o Bun queue). Productor: endpoint `/delete/confirm` encola job.
- Worker `scripts/account-deletion-worker.ts` o `apps/api/src/workers/account-deletion.worker.ts` que:
  1. Reconfirma prohibiciones (defensa en profundidad).
  2. Llama a Snapshots → OpenAI cleanup → Local cleanup.
  3. Actualiza `account_deletion_jobs.status` (`pending`, `snapshot_ready`, `external_cleanup`, `local_cleanup`, `completed`, `failed`).
- Logs detallados + métrica Prometheus (`account_deletion_duration_seconds`).
- Endpoint admin `GET /internal/account-deletion-jobs` para monitorear.

**Archivos afectados**: `apps/api/src/workers`, `apps/api/src/server.ts` (registro worker/cron), `scripts/README.md`.

---

## 7. Hito AD-160 — UX Final y Redirección

**Objetivo**: experiencia consistente con instrucciones (redirigir al inicio tras confirmar, proceso background).

- **Estado actual**: ⚠️ Parcial. La sección “Eliminar cuenta” existe y muestra wizard/estado, y se reciben notificaciones vía WS.
- **Pendiente**: cerrar tabs/redirigir automáticamente al confirmar, toasts globales durante el worker y banner “Eliminación en curso”.

- Nueva sección “Eliminar Cuenta” dentro de Settings → AccountsSection.
- Flujo:
  1. Usuario abre tab → ve checklist de reglas + botón “Generar snapshot”.
  2. Tras snapshot listo, botón “Eliminar definitivamente” habilita `DoubleConfirmationDeleteButton`.
  3. Al confirmar, se lanza petición `POST /accounts/:id/delete/confirm`, se muestra modal “Procesando en segundo plano…” y se redirige al Home (`/`) cerrando tabs de la cuenta.
- Notificaciones vía toast + websocket al completar/fallar.
- UI usa componentes canónicos (Button, Card, Alert) y respeta densidad VSCode-like.

**Archivos afectados**: `apps/web/src/components/settings/AccountsSection.tsx`, `apps/web/src/components/settings/AccountDeletionWizard.tsx`, `apps/web/src/store/panelStore.ts` (cerrar tabs), `apps/web/src/store/uiStore.ts` (redirección).

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
