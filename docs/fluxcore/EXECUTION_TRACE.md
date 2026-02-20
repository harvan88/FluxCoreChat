# ⛔ DEPRECADO — Parcialmente superado por ARCHITECTURE_MAP.md §5

# Flux Core — Execution Trace Document (v2.1)

Esta traza describe el **camino real** que sigue un mensaje hoy (febrero 2026) con Kernel activo, Projectors operando y runtime soberano conectado vía `runtime-gateway`.

---

## 1. Certificación del hecho (Kernel)

1. **Observación física:** Un adapter externo (WhatsApp/Telegram/UI) inserta la evidencia en la Journal (`fluxcore_signals`).
2. **Transaction Outbox:** El record queda en `fluxcore_outbox` esperando ser despachado.
3. **Heartbeat:** `kernelDispatcher.start()` (ver `apps/api/src/core/kernel-dispatcher.ts`) detecta pendientes, marca `processed_at` y emite `coreEventBus.emit('kernel:wakeup')`.
4. **Projectors despiertan:** `startProjectors()` (identity + chat) consume el Journal en orden, garantizando idempotencia (`BaseProjector` en `apps/api/src/core/kernel/base.projector.ts`).

---

## 2. Materialización de chat (Projectors → MessageCore)

1. **IdentityProjector:** Resuelve actores y direcciones (`apps/api/src/services/fluxcore/identity-projector.service.ts`).
2. **ChatProjector:** Para señales `EXTERNAL_INPUT_OBSERVED`, deriva `conversationId` y contenido y llama a `messageCore.receive()` con `type: 'incoming'` (ver `apps/api/src/core/projections/chat-projector.ts#101-115`).
3. **Persistencia + broadcast:** `MessageCore` guarda el mensaje, actualiza conversación/relationship y emite `core:message_received` con `{ envelope, result }` (`apps/api/src/core/message-core.ts#37-95`).

---

## 3. Delegación al runtime soberano

1. **Driver registrado:** `MessageDispatchService` escucha `core:message_received` desde `apps/api/src/services/message-dispatch.service.ts` (reemplaza al histórico AIOrchestrator).
2. **Guard Clauses activas:** Si `result.success` o `targetAccountId` faltan, el flujo se detiene con log `MessageDispatch ABORT`.
3. **PolicyContext:** Se resuelve vía `fluxPolicyContextService.resolve()` para la cuenta objetivo (`apps/api/src/services/flux-policy-context.service.ts`).
4. **Extension Interceptors:** Se invoca `extensionHost.processMessage()`. Si alguna extensión detiene la propagación, el flujo termina aquí.
5. **Runtime Gateway:** Se invoca `runtimeGateway.handleMessage({ envelope, policyContext })`. El gateway selecciona el adaptador (e.g. `FluxCoreRuntimeAdapter` o `AgentRuntimeAdapter`) según la configuración de la cuenta (`apps/api/src/services/runtime-gateway.service.ts`).
6. **Acciones:** El runtime retorna acciones explícitas (`send_template`, `send_message`, etc.) que `MessageDispatchService` ejecuta mediante `messageCore` o servicios especializados.

---

## 4. Estados operativos observados

* **Kernel Vivo:** Logs esperados al inicio: `[KernelDispatcher] Started (wake-up only)` y `[ProjectorRunner] Starting projectors (log-driven mode)`.
* **Runtime en transición:** La IA ahora se invoca vía `runtimeGateway`. `MessageDispatchService` se inicializa en `server.ts` y escucha eventos.
* **Abortos actuales:** La condición `if (!targetAccountId)` en el dispatcher impide respuestas cuando la proyección no determina destinatario; esto mantiene el sistema silencioso hasta que se registre la relación adecuada.

---

## 5. Próximos ajustes (derivados de esta traza)

1. **Desacoplar runtime del servidor HTTP:** mover la suscripción al `coreEventBus` a un entrypoint de Kernel para que el driver pueda vivir sin `server.ts`.
2. **Registrar conversaciones automáticamente:** asegurar que el projector o un proceso de bootstrap haga `messageCore.registerConversation()` para evitar WARN de actividad.
3. **Documentar login vía Kernel:** añadir en este mismo documento la traza de autenticación cuando las señales correspondientes existan (Refactor 2 del plan vigente).

---

## 6. Traza Activa — Login vía Kernel (Refactor 2 Completado)

> **Estado:** 🟢 IMPLEMENTADO (Feb 2026). La UI consume el estado soberano de sesiones proyectado por el Kernel.

1. **Ingreso de señal**
   - `Identity.LoginRequested` (`fact_type = EXTERNAL_INPUT_OBSERVED`): un adapter de UI certifica que un humano envió credenciales/magic link.
   - Payload mínimo (`evidence_raw`): `{ accountPerspective, identifier, method, deviceHash }`.
2. **Verificación**
   - `IdentityProjector` valida identidad física y, si procede, emite `Identity.LoginSucceeded` (mismo fact type, distinta evidencia) con `{ accountId, actorId, scopes }`.
   - Fallos generan `Identity.SessionInvalidated` (`fact_type = EXTERNAL_STATE_OBSERVED`).
3. **Projector de Sesiones**
   - Lee las señales anteriores, mantiene `fluxcore_session_projection` (cursor por actorId) con campos: `sessionId`, `accountId`, `scopes`, `status`, `lastSeenAt`, `deviceHash`.
   - Cada wake-up sincroniza la tabla/stream consumida por la UI.
4. **Exposición a la UI**
   - El servidor HTTP ya expone `GET /kernel/sessions/active` (ver `apps/api/src/routes/kernel-sessions.routes.ts`). Filtra por `accountId/actorId/status` y devuelve la proyección soberana ordenada por `updated_at DESC`. También se puede publicar via WebSocket (`kernel:sessions.updated`) una vez que exista el stream.
5. **Consumo en frontend**
   - `useKernelSessions` + `KernelSessionsSection` (`apps/web/src/hooks/useKernelSessions.ts` y `apps/web/src/components/settings/KernelSessionsSection.tsx`) consultan periódicamente el endpoint, escuchan `kernel:session_updated` y muestran las sesiones activas/pending en Settings → Kernel. La UI deja de depender de estado local: basta refrescar la proyección para continuar tras reinicios.

### Estado de Implementación

- **Señales:** `Identity.LoginRequested`, `Identity.LoginSucceeded`, `Identity.SessionInvalidated` registradas en Canon.
- **Projector:** `SessionProjector` (`apps/api/src/services/session-projector.service.ts`) materializa `fluxcore_session_projection`.
- **Endpoint:** `GET /kernel/sessions/active` expone la proyección.
- **UI:** `KernelSessionsSection` (Settings) visualiza sesiones activas en tiempo real.
- **Validación:** Flujo probado mediante inyección de proyección y verificación en UI.

_Última actualización: alineada con `c:\Users\harva\.windsurf\plans\fluxcore-runtime-login-plan-63d8df.md`._
