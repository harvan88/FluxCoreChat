# Plan operativo — Fase 2: Observabilidad mínima obligatoria

**Fecha:** 2026-03-25
**Fase:** 2
**Estado:** ready
**Gate anterior:** Fase 1 validada para planificación de Fase 2
**Objetivo principal:** consolidar y validar una trazabilidad mínima, consistente y operativamente confiable del pipeline cognitivo completo, sin depender de supuestos documentales ni de observabilidad informal.

---

## 1. Objetivo exacto de la fase

La Fase 2 no busca todavía construir el trace store final ni abrir la migración de capabilities.

Busca una sola cosa:

> **Demostrar y endurecer que una ejecución cognitiva puede reconstruirse de punta a punta con telemetría mínima confiable, correlacionable y consumible por Kernel Console sin romper soberanía ni aislamiento del pipeline.**

Esto incluye dos dimensiones:

- **existencia real de trazas** en todos los pasos mínimos del pipeline,
- **consistencia operativa de correlación** entre los eventos emitidos.

---

## 2. Diagnóstico de partida

El repositorio ya contiene trabajo parcial e incluso avanzado de telemetría.

### 2.1 Señales positivas verificadas

Se detectó emisión de `telemetry:pipeline_step` en los pasos:

- `ingreso`
  - `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
- `proyeccion`
  - `apps/api/src/core/projections/chat-projector.ts`
- `worker`
  - `apps/api/src/workers/cognition-worker.ts`
- `dispatcher`
  - `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `runtime`
  - `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
- `certificacion`
  - `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- `entrega`
  - `apps/api/src/core/message-core.ts`

También existe transmisión controlada por WebSocket en:

- `apps/api/src/websocket/ws-handler.ts`
  - suscripción `subscribe_telemetry`
  - filtro por `role === 'kernel_console'`

Y existe renderizado visual en frontend en:

- `apps/web/src/components/monitor/VisualPipeline.tsx`

### 2.2 Problemas o huecos detectados

Aunque la infraestructura existe, todavía no está cerrada como fase validada dentro del roadmap actual.

Huecos identificados:

- **`H1` — Correlación todavía frágil**
  - varios pasos usan `messageId` basado en `last_signal_seq` o `triggerSignalId`, pero otros admiten fallback a IDs distintos
  - esto puede producir agrupación correcta en la mayoría de casos, pero no garantiza una semántica única y demostrable de correlación

- **`H2` — Seguridad de suscripción todavía mínima**
  - `ws-handler.ts` filtra por `role === 'kernel_console'`, pero ese control es de payload y debe revisarse como pista operativa real, no asumirse como garantía completa por sí mismo

- **`H3` — Sin store técnico persistente de trazas**
  - la pista actual es esencialmente efímera: `coreEventBus` + WebSocket + estado local de UI
  - esto es aceptable para Fase 2 si queda explícito, pero no satisface todavía la separación completa `Kernel vs Trace Store` definida en el roadmap

- **`H4` — Drift documental**
  - `docs/reconstruction-phase-1/telemetry/IMPLEMENTATION_PIPELINE_TELEMETRY.md` declara estado `Producción / Live`
  - el roadmap canónico vigente aún exige validación empírica fase por fase antes de aceptar observabilidad como base de fases posteriores

- **`H5` — Contrato útil pero todavía mínimo**
  - `PipelineTelemetryEvent` soporta `runtimeId`, `latencyMs`, `errorDetail`, `newSignalId`, `triggerSignalId`
  - todavía falta decidir si la correlación mínima oficial se ancla en `signal_id`, `triggerSignalId`, `turn_id` o una combinación controlada

---

## 3. Resultado de cierre esperado

La fase se considera exitosa si al final del trabajo podemos demostrar esto:

- existe emisión efectiva y verificable en los 7 pasos mínimos del pipeline
- los eventos pueden agruparse por una correlación definida de forma estable
- el runtime efectivo puede inspeccionarse en los pasos donde corresponde
- los fallos de pipeline pueden reconstruirse sin depender solo de logs manuales
- la pista WebSocket hacia Kernel Console queda delimitada como canal técnico controlado
- la fase deja evidencia explícita de qué está validado y qué queda para el trace store definitivo

---

## 4. Alcance

## Incluye

- validación real del contrato `PipelineTelemetryEvent`
- validación del mapa de emisión de los 7 pasos
- endurecimiento mínimo de correlación técnica entre pasos
- revisión explícita del canal WebSocket de telemetría a Kernel Console
- documentación de límites entre observabilidad mínima y trace store futuro
- evidencia manual y/o estática de flujo sano y flujo con error

## Excluye

- implementación completa de trace store persistente
- rediseño total de Kernel Console
- observabilidad distribuida de infraestructura externa
- capability registry
- migración funcional de templates o RAG

---

## 5. Componentes/archivos candidatos

## Backend de eventos

- `apps/api/src/core/telemetry/telemetry.service.ts`
- `apps/api/src/core/events.ts`
- `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/workers/cognition-worker.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
- `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- `apps/api/src/core/message-core.ts`

## Pista WebSocket

- `apps/api/src/websocket/ws-handler.ts`

## Frontend de visualización

- `apps/web/src/components/monitor/VisualPipeline.tsx`

## Documentación relacionada

- `docs/reconstruction-phase-1/telemetry/PIPELINE_VISUAL_TRAZABILIDAD.md`
- `docs/reconstruction-phase-1/telemetry/IMPLEMENTATION_PIPELINE_TELEMETRY.md`
- `docs/reconstruction-phase-1/temp/2026-03-25_fluxcore-production-roadmap.md`

---

## 6. Diseño objetivo de la fase

## 6.1 Contrato mínimo aceptado

Todo evento de esta fase debe preservar como mínimo:

- `messageId`
- `conversationId`
- `step`
- `status`
- `timestamp`

Y cuando aplique:

- `runtimeId`
- `latencyMs`
- `errorDetail`
- `triggerSignalId`
- `newSignalId`

## 6.2 Regla de correlación mínima

La fase debe definir y demostrar una regla operativa única de lectura:

- el agrupador principal del stream será `messageId`
- cuando exista respuesta AI certificada, deben poder observarse relaciones con `triggerSignalId` y `newSignalId`
- cualquier fallback debe quedar documentado como transicional, no como contrato ideal final

## 6.3 Regla de canal técnico

La pista de telemetría hacia UI debe cumplir:

- no interferir con el pipeline principal
- no abrir broadcast indiscriminado
- quedar explícitamente restringida al caso de monitoreo técnico de Kernel Console

## 6.4 Regla de verdad arquitectónica

Al cierre de la fase debe quedar explícito que:

- **Kernel** sigue siendo el journal soberano de hechos certificados
- la telemetría de Fase 2 es **observabilidad técnica mínima**, no sustituto del Kernel
- el **trace store persistente** sigue siendo trabajo posterior

---

## 7. Tareas técnicas de la fase

## T1 — Confirmar y endurecer contrato de telemetría

- [ ] revisar `PipelineTelemetryEvent` contra uso real
- [ ] eliminar ambigüedades obvias de naming si aparecen
- [ ] documentar correlación oficial mínima aceptada

## T2 — Validar cobertura de los 7 pasos

- [ ] verificar `ingreso`
- [ ] verificar `proyeccion`
- [ ] verificar `worker`
- [ ] verificar `dispatcher`
- [ ] verificar `runtime`
- [ ] verificar `certificacion`
- [ ] verificar `entrega`

## T3 — Endurecer pista WebSocket

- [ ] revisar control de suscripción a telemetría
- [ ] confirmar que el stream no se broadcasté a clientes generales
- [ ] documentar supuestos de seguridad actuales y huecos pendientes

## T4 — Validar renderizado útil en Kernel Console

- [ ] confirmar agrupación por `messageId`
- [ ] confirmar visibilidad de `runtimeId`
- [ ] confirmar visibilidad de errores y latencias cuando existan
- [ ] confirmar comportamiento de limpieza/ruido en sesión

## T5 — Registrar evidencia de operación

- [ ] flujo sano end-to-end
- [ ] flujo con error de runtime o dispatcher
- [ ] diferencias entre hechos certificados y trazas técnicas

---

## 8. Checklist de aceptación

- [ ] los 7 pasos mínimos emiten telemetría verificable
- [ ] existe una regla explícita y documentada de correlación mínima
- [ ] la UI técnica puede agrupar eventos sin depender de heurísticas ocultas
- [ ] `runtimeId` aparece cuando corresponde en la ruta cognitiva
- [ ] errores técnicos relevantes pueden verse en la pista
- [ ] la pista WebSocket no opera como broadcast abierto general
- [ ] quedó documentado el límite entre telemetría mínima y trace store futuro
- [ ] quedó registrado cualquier drift documental detectado
- [ ] existe evidencia suficiente para habilitar Fase 3

---

## 9. Pruebas obligatorias

## 9.1 Estáticas / de inspección

### U1 — Contrato y cobertura
- [ ] el contrato soporta los campos realmente usados
- [ ] todos los pasos requeridos emiten eventos

### U2 — Correlación
- [ ] `messageId` puede seguirse desde `ingreso` hasta `entrega` o hasta fallo terminal
- [ ] `triggerSignalId` y `newSignalId` quedan interpretables cuando aplique

## 9.2 Integración

### I1 — Flujo sano de respuesta AI
- [ ] se observan eventos ordenables de `ingreso` a `entrega`
- [ ] el `runtimeId` real es visible en dispatcher/runtime

### I2 — Flujo con error
- [ ] un error de runtime o dispatcher queda visible como evento técnico
- [ ] la falla no rompe la emisión del resto de la pista crítica

### I3 — Suscripción controlada
- [ ] un cliente no autorizado no recibe stream de telemetría
- [ ] un cliente de Kernel Console sí recibe el stream esperado

## 9.3 Manuales

### M1 — Semáforo visible
- [ ] la UI técnica muestra estados por paso
- [ ] es posible identificar soberanía de runtime sin leer logs crudos

### M2 — Exportabilidad mínima
- [ ] el operador técnico puede copiar o inspeccionar la traza completa de una sesión visible

---

## 10. Evidencia requerida

Para cerrar la fase deberán quedar registrados al menos:

- una nota de validación de flujo sano
- una nota de validación de flujo fallido
- referencias a archivos donde se emiten los 7 pasos
- definición explícita de correlación mínima aceptada
- registro de drift documental si persiste

---

## 11. Hallazgos bloqueantes esperables

- inconsistencias de `messageId` entre ingreso y respuesta AI
- eventos que existan pero no aporten suficiente metadata útil
- controles de suscripción WebSocket más débiles de lo que sugiere la documentación histórica
- componentes UI que consuman el stream pero sin criterio formal de aceptación

---

## 12. Riesgos esperados

- **`R1`**
  - al endurecer correlación pueden aparecer consumidores implícitos del contrato actual

- **`R2`**
  - la validación puede mostrar que parte de la telemetría existente era correcta pero no suficientemente especificada

- **`R3`**
  - la documentación histórica puede quedar en conflicto con el roadmap vigente y requerir normalización documental

---

## 13. Criterio de salida

La Fase 2 podrá cerrarse solamente si queda demostrado que:

- el pipeline cognitivo tiene una observabilidad mínima operativa y coherente,
- esa observabilidad ya permite investigar fallos reales sin depender exclusivamente de logs manuales,
- y el sistema está listo para pasar a Fase 3 sin volver a mezclar trazabilidad improvisada con capacidades de plataforma.

Si eso no queda demostrado, Fase 3 no se habilita.
