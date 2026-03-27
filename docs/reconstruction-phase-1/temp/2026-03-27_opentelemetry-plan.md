# Implementación de Observabilidad Distribuida: Estado Final y Arquitectura

**Fecha:** 27 de Marzo, 2026
**Ubicación:** `docs/reconstruction-phase-1/temp/2026-03-27_opentelemetry-plan.md` (ACTUALIZADO: Estado Implementado)
**Estado:** ✅ **COMPLETADO E INYECTADO**

---

## 1. Resumen de la Solución (Causa y Efecto)

Se ha eliminado la "ceguera" del sistema mediante la implementación de un motor de trazabilidad basado en estándares OpenTelemetry, pero optimizado para el ecosistema FluxCore. El sistema ahora captura **payloads íntegros (incluyendo plantillas de seguridad autorizadas)** y los visualiza en un árbol jerárquico forense en tiempo real.

### Componentes de la Arquitectura Desplegada:

1.  **Soberanía de Huella (`apps/api/src/telemetry/tracer.ts`)**: Servicio central que genera `traceId` y `spanId`. Incluye protección contra referencias circulares (`util.inspect`) para asegurar que historiales complejos de IA no rompan la serialización de WebSockets.
2.  **Inyección en el Punto Crítico (`cognitive-dispatcher.service.ts`)**: Se envolvió la llamada al Gateway de IA (`runtimeGateway.invoke`) con un logger forense que atrapa el objeto `RuntimeInput` justo antes de salir del sistema.
3.  **Tubería de Telemetría (`ws-handler.ts`)**: Se habilitó una "vía rápida" en los WebSockets para que el evento `telemetry:distributed_trace` llegue exclusivamente a usuarios con rol administrativo (Harvan Account).
4.  **Visor Forense en Cascada (`KernelConsole.tsx`)**: Reconstrucción total de la UI. Se pasó de una tabla plana a una **Vista Waterfall (Cascada)** que agrupa eventos por causalidad y permite expandir objetos JSON masivos.

---

## 2. Mapa de Implementación (Archivos Editados)

| Archivo | Responsabilidad | Cambio Clave |
| :--- | :--- | :--- |
| `apps/api/src/telemetry/tracer.ts` | **Motor OTel** | Inicialización de `BasicTracerProvider` y wrapper `trackCognitiveStep`. |
| `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts` | **Inyección** | Captura del `PayloadEnorme` (Plantillas + Historial) antes de invocar a la IA. |
| `apps/api/src/core/events.ts` | **Tipado** | Definición del evento `telemetry:distributed_trace` en el Bus de Eventos. |
| `apps/api/src/websocket/ws-handler.ts` | **Propagación** | Envío de trazas OTel a los suscriptores suscritos a `kernel_console`. |
| `apps/web/src/components/monitor/KernelConsole.tsx` | **Visualización** | Implementación del Árbol Recursivo y Recuperación Híbrida (Legacy DB + Live OTel). |

---

## 3. Guía de Uso Forense (Debug de Plantillas)

### ¿Cómo ver las plantillas autorizadas?
1.  Abre el panel **Kernel Console** en el Frontend.
2.  Asegúrate de tener seleccionada la cuenta correcta (o estar logueado como Harvan).
3.  **Envía un mensaje en vivo** (vía WhatsApp o Chat Widget).
4.  Aparecerá una nueva entrada en el panel izquierdo llamada `IA_RUNTIME_INVOCATION`.
5.  Haz click para ver la cascada, expande el nodo y presiona el botón **[Inspeccionar Payload Crudo]**.
6.  Verás el objeto JSON completo; busca la propiedad `policyContext` o `runtimeConfig`. Ahí reside la "verdad" de lo que se le envió a la IA.

### Notas de Operación:
*   **Modo Híbrido**: El panel carga automáticamente las señales antiguas de la DB (`[Legacy DB]`), pero estas **no tienen payload completo** por diseño (ahorro de espacio en disco).
*   **Live-Only Payloads**: El rastreo profundo de plantillas ocurre **exclusivamente en tiempo real**. Debes tener el panel abierto y enviar un mensaje para "atrapar" la carga al vuelo.
*   **Seguridad**: El acceso al visor profundo está restringido por `HARVAN_ACCOUNT_ID` para evitar fugas de datos sensibles a otros usuarios de la plataforma.

---

## 4. Próximos Pasos (Opcional)
*   **Persistencia Selectiva**: Si se requiere que los payloads de plantillas se guarden para auditoría forense posterior (no solo live), se deberá crear una tabla `fluxcore_trace_payloads` en PostgreSQL vinculada al `traceId`. Por ahora, la solución Live satisface el requerimiento de debug de ingeniería.

---
*Documento ratificado por Antigravity (IA) como registro de la Fase 1 de Observabilidad Cognitiva.*
