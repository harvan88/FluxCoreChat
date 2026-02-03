# Account Deletion Agent – Runbook

> Última actualización: 2026-02-02

## 1. Objetivo
Asegurar la operación del agente de eliminación de cuentas (AccountDeletionService + worker BullMQ) con trazabilidad completa. Este runbook cubre monitoreo, métricas, logging estructurado y procedimientos de intervención.

---

## 2. Componentes Clave

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| Service API | `apps/api/src/services/account-deletion.service.ts` | Orquesta request → snapshot → confirmación y encola jobs. |
| Worker BullMQ | `apps/api/src/workers/account-deletion.queue.ts` | Procesa jobs `external_cleanup` y `local_cleanup`. |
| Procesador | `apps/api/src/workers/account-deletion.processor.ts` | Ejecuta fases, registra métricas y logs estructurados. |
| Snapshots Portal | `apps/api/src/routes/account-deletion.public.routes.ts` | Exposición pública de estado/descarga. |
| Frontend Wizard | `apps/web/src/components/accounts/AccountDeletionWizard.tsx` | UI que guía al usuario. |

---

## 3. Métricas Persistidas (via `metricsService` → `fluxcore_system_metrics`)

| Nombre | Tipo | Descripción | Dimensiones |
|--------|------|-------------|-------------|
| `account_deletion.jobs_processing_total` | counter | Jobs en proceso por fase | `phase` (external_cleanup/local_cleanup) |
| `account_deletion.jobs_failed_total` | counter | Jobs fallidos por fase | `phase` |
| `account_deletion.phase_completed_total` | counter | Fases finalizadas | `phase` |
| `account_deletion.external_cleanup.duration_ms` | histogram | Tiempo de limpieza externa | `accountId` |
| `account_deletion.local_cleanup.duration_ms` | histogram | Tiempo de limpieza local | `accountId` |
| `account_deletion.total_duration.duration_ms` | histogram | Confirmación → completado | `accountId` |
| `account_deletion.queue.waiting` | gauge | Jobs en cola (estado waiting) | — |
| `account_deletion.queue.active` | gauge | Jobs activos | — |
| `account_deletion.queue.completed` | gauge | Total completados | — |
| `account_deletion.queue.failed` | gauge | Total fallidos | — |
| `account_deletion.queue.delayed` | gauge | Jobs diferidos | — |
| `account_deletion.queue.paused` | gauge | Jobs pausados | — |

**Consulta rápida:**
```sql
SELECT *
FROM fluxcore_system_metrics
WHERE metric_name LIKE 'account_deletion%'
ORDER BY recorded_at DESC
LIMIT 200;
```

---

## 4. Logging Estructurado
`account-deletion.processor.ts` emite `console.info('[AccountDeletion]', JSON)` en eventos:

- `job_failed` (campos: jobId, accountId, phase, reason)
- `phase_completed` (nextPhase)
- `job_completed` (summary incluído)

**Uso:** En producción redirigir stdout → stack central. Para debug local, filtrar con `grep "[AccountDeletion]" logs.txt`.

---

## 5. Monitoreo Operativo

1. **Estado de Cola**
   ```ts
   import { getAccountDeletionQueueStats } from 'apps/api/src/workers/account-deletion.queue';
   const stats = await getAccountDeletionQueueStats();
   ```
   Revisar `waiting` y `failed`. Más de 5 jobs en `failed` → investigar.

2. **Tabla de Jobs**
   ```sql
   SELECT id, account_id, status, phase, failure_reason, updated_at
   FROM account_deletion_jobs
   ORDER BY updated_at DESC
   LIMIT 20;
   ```

3. **Logs Críticos**
   - Buscar `critical_attempt` en `account_deletion_logs` para intentos sobre cuentas protegidas.

---

## 6. Playbooks

### 6.1 Reintentar Job Fallido
1. Identificar job `status = 'failed'`.
2. Ver razones en `account_deletion_logs`.
3. Cambiar manualmente `status`→`external_cleanup` o usar endpoint admin (`/internal/account-deletions/:jobId/retry-phase`) cuando esté habilitado.
4. Asegurar que la cola esté corriendo: `startAccountDeletionQueue()`.

### 6.2 Pausar Procesamiento
- Ejecutar `stopAccountDeletionQueue()` (cierra worker y limpia intervalos).
- Para reanudar, `startAccountDeletionQueue()`.

### 6.3 Confirmar Snapshot Token
```sql
SELECT id, metadata->'snapshotDownloadToken' AS token
FROM account_deletion_jobs
WHERE id = '<jobId>';
```
- Si expiró, regenerar confirmando nuevamente o creando token manual (ver servicio).

---

## 7. Troubleshooting

| Síntoma | Posible causa | Acción |
|---------|---------------|--------|
| Jobs quedan en `external_cleanup` | Fallo al eliminar recursos externos | Revisar logs `job_failed`, reintentar. Verificar credenciales OpenAI. |
| Portal muestra 403/410 | Token inválido/expirado | Regenerar token confirmando nuevamente o actualizando `metadata.snapshotDownloadToken`. |
| Muchos jobs en `waiting` | Worker caído o concurrency bajo | Revisar logs de worker, `startAccountDeletionQueue()`, aumentar `ACCOUNT_DELETION_QUEUE_CONCURRENCY`. |
| Usuario recibe 403 en request | Middleware detectó account protegida o falta `ACCOUNT_DELETE_FORCE` | Confirmar scopes con `system_admins`.

---

## 8. Verificación y Tests
1. `bun test apps/api/src/routes/account-deletion.routes.test.ts`
2. `bun run build` (backend/frontend)
3. Prueba manual:
   - Owner elimina su cuenta → completado → portal accesible
   - Admin con `ACCOUNT_DELETE_FORCE` elimina otra cuenta
   - Intento sobre cuenta protegida → rechazo + log `critical_attempt`

---

## 9. Contactos / Responsables
- Equipo Core Backend
- Equipo Infra / DevOps para monitoreo

Mantener este runbook actualizado cada vez que cambie flujo o métricas. Documentar incidentes relevantes en `docs/ACCOUNT_DELETION_AGENT_PLAN.md`.
