# ⛔ DEPRECADO — Cubierto por AUDIT_KERNEL_PROJECTORS.md y PROGRESS_LOG.md

# FluxCore Kernel Status

**Estado:** 🟢 ACTIVO & SOBERANO
**Versión:** RFC-0001 (Kernel Freeze)
**Fecha de Activación:** 2026-02-14

---

## Resumen Ejecutivo

El Kernel Soberano ha sido implementado y activado exitosamente. FluxCore opera ahora bajo el modelo de **Log-Driven State**, donde la única fuente de verdad es la secuencia de hechos certificada en `fluxcore_signals`.

## Componentes Activos

| Componente | Estado | Descripción |
| :--- | :---: | :--- |
| **Journal (Schema)** | 🟢 | Tablas canónicas (`fluxcore_signals`) desplegadas. Inmutabilidad garantizada por triggers. |
| **Kernel Core** | 🟢 | `kernel-runtime.ts` levanta `bootstrapKernel`, `kernelDispatcher`, `startProjectors` y `MessageDispatchService` sin depender del HTTP. |
| **Reality Adapters** | 🟢 | `fluxcore/whatsapp-gateway` registrado y activo. Firma digitalmente cada mensaje entrante. |
| **Wiring** | 🟢 | Webhooks de WhatsApp son interceptados por `RealityAdapterService` y certificados antes de entrar al sistema. |
| **Proyectores** | 🟢 | `Identity` y `Chat` leen exclusivamente del Journal sin semántica de negocio en la fuente. |
| **Legacy Archive** | 📦 | Tests y scripts antiguos incompatibles movidos a `src/_legacy_archive`. |

## Métricas Clave

- **Secuencia Inicial:** 1
- **Adapters Registrados:** 1 (`fluxcore/whatsapp-gateway`)
- **Fact Types Soportados:** 6 (Input, State, Delivery, Media, Timer, Connection)

## Observaciones Operativas

- `bun run kernel:start` mantiene al Kernel vivo; `bun run api:dev` puede reiniciarse sin afectar al driver soberano.
- Persisten abortos `Missing targetAccountId`; se requiere registrar conversaciones/proyecciones para completar el loop IA.
- El estado soberano de sesiones ya se expone vía `GET /kernel/sessions/active` (ver `apps/api/src/routes/kernel-sessions.routes.ts`); hoy retorna colecciones vacías hasta que entren señales `Identity.*`.

## Próximos Pasos (No Críticos)

1. **Registro Automático de Conversaciones:** Incorporar projector o bootstrap que ejecute `messageCore.registerConversation()` al iniciar.
2. **Rotación de Secretos:** Mover `development_signing_secret_wa` a variables de entorno.
3. **Telemetría:** Panel de control para visualizar el "Lag de Proyección".
4. **Más Adapters:** Migrar Telegram/Instagram al nuevo modelo de certificación.
