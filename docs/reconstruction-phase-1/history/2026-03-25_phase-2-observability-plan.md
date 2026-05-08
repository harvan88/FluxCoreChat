# Plan operativo â?? Fase 2: Observabilidad m?­nima obligatoria

**Fecha:** 2026-03-25
**Fase:** 2
**Estado:** ready
**Gate anterior:** Fase 1 validada para planificaci??n de Fase 2
**Objetivo principal:** consolidar y validar una trazabilidad m?­nima, consistente y operativamente confiable del pipeline cognitivo completo, sin depender de supuestos documentales ni de observabilidad informal.

---

## 1. Objetivo exacto de la fase

La Fase 2 no busca todav?­a construir el trace store final ni abrir la migraci??n de capabilities.

Busca una sola cosa:

> **Demostrar y endurecer que una ejecuci??n cognitiva puede reconstruirse de punta a punta con telemetr?­a m?­nima confiable, correlacionable y consumible por Kernel Console sin romper soberan?­a ni aislamiento del pipeline.**

Esto incluye dos dimensiones:

- **existencia real de trazas** en todos los pasos m?­nimos del pipeline,
- **consistencia operativa de correlaci??n** entre los eventos emitidos.

---

## 2. Diagn??stico de partida

El repositorio ya contiene trabajo parcial e incluso avanzado de telemetr?­a.

### 2.1 Se??ales positivas verificadas

Se detect?? emisi??n de `telemetry:pipeline_step` en los pasos:

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

**ACTUALIZACI?“N (2026-04-01):**
- **Observabilidad corregida en asistentes-local:** Se agreg?? `logLLMCompletion` para logging expl?­cito de respuestas crudas del LLM
- **Fases cubiertas:** `main` y `template_follow_up` con detalles de provider, model, finishReason, content, toolCalls y usage
- **Impacto:** Elimina la "oscuridad" en las trazas al exponer la respuesta cruda antes de transformaci??n a acciones

Tambi??n existe transmisi??n controlada por WebSocket en:

- `apps/api/src/websocket/ws-handler.ts`
  - suscripci??n `subscribe_telemetry`
  - filtro por `role === 'kernel_console'`

Y existe renderizado visual en frontend en:

- `apps/web/src/components/monitor/VisualPipeline.tsx`

### 2.2 Problemas o huecos detectados

Aunque la infraestructura existe, todav?­a no est?? cerrada como fase validada dentro del roadmap actual.

Huecos identificados:

- **`H1` â?? Correlaci??n todav?­a fr??gil**
  - varios pasos usan `messageId` basado en `last_signal_seq` o `triggerSignalId`, pero otros admiten fallback a IDs distintos
  - esto puede producir agrupaci??n correcta en la mayor?­a de casos, pero no garantiza una sem??ntica ??nica y demostrable de correlaci??n

- **`H2` â?? Seguridad de suscripci??n todav?­a m?­nima**
  - `ws-handler.ts` filtra por `role === 'kernel_console'`, pero ese control es de payload y debe revisarse como pista operativa real, no asumirse como garant?­a completa por s?­ mismo

- **`H3` â?? Sin store t??cnico persistente de trazas**
  - la pista actual es esencialmente ef?­mera: `coreEventBus` + WebSocket + estado local de UI
  - esto es aceptable para Fase 2 si queda expl?­cito, pero no satisface todav?­a la separaci??n completa `Kernel vs Trace Store` definida en el roadmap

- **`H4` â?? Drift documental**
  - `docs/reconstruction-phase-1/telemetry/IMPLEMENTATION_PIPELINE_TELEMETRY.md` declara estado `Producci??n / Live`
  - el roadmap can??nico vigente a??n exige validaci??n emp?­rica fase por fase antes de aceptar observabilidad como base de fases posteriores

- **`H5` â?? Contrato ??til pero todav?­a m?­nimo**
  - `PipelineTelemetryEvent` soporta `runtimeId`, `latencyMs`, `errorDetail`, `newSignalId`, `triggerSignalId`
  - todav?­a falta decidir si la correlaci??n m?­nima oficial se ancla en `signal_id`, `triggerSignalId`, `turn_id` o una combinaci??n controlada

---

## 3. Resultado de cierre esperado

La fase se considera exitosa si al final del trabajo podemos demostrar esto:

- existe emisi??n efectiva y verificable en los 7 pasos m?­nimos del pipeline
- los eventos pueden agruparse por una correlaci??n definida de forma estable
- el runtime efectivo puede inspeccionarse en los pasos donde corresponde
- los fallos de pipeline pueden reconstruirse sin depender solo de logs manuales
- la pista WebSocket hacia Kernel Console queda delimitada como canal t??cnico controlado
- la fase deja evidencia expl?­cita de qu?? est?? validado y qu?? queda para el trace store definitivo

---

## 4. Alcance

## Incluye

- validaci??n real del contrato `PipelineTelemetryEvent`
- validaci??n del mapa de emisi??n de los 7 pasos
- endurecimiento m?­nimo de correlaci??n t??cnica entre pasos
- revisi??n expl?­cita del canal WebSocket de telemetr?­a a Kernel Console
- documentaci??n de l?­mites entre observabilidad m?­nima y trace store futuro
- evidencia manual y/o est??tica de flujo sano y flujo con error

## Excluye

- implementaci??n completa de trace store persistente
- redise??o total de Kernel Console
- observabilidad distribuida de infraestructura externa
- capability registry
- migraci??n funcional de templates o RAG

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

## Frontend de visualizaci??n

- `apps/web/src/components/monitor/VisualPipeline.tsx`

## Documentaci??n relacionada

- `docs/reconstruction-phase-1/telemetry/PIPELINE_VISUAL_TRAZABILIDAD.md`
- `docs/reconstruction-phase-1/telemetry/IMPLEMENTATION_PIPELINE_TELEMETRY.md`
- `docs/reconstruction-phase-1/temp/2026-03-25_fluxcore-production-roadmap.md`

---

## 6. Dise??o objetivo de la fase

## 6.1 Contrato m?­nimo aceptado

Todo evento de esta fase debe preservar como m?­nimo:

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

## 6.2 Regla de correlaci??n m?­nima

La fase debe definir y demostrar una regla operativa ??nica de lectura:

- el agrupador principal del stream ser?? `messageId`
- cuando exista respuesta AI certificada, deben poder observarse relaciones con `triggerSignalId` y `newSignalId`
- cualquier fallback debe quedar documentado como transicional, no como contrato ideal final

## 6.3 Regla de canal t??cnico

La pista de telemetr?­a hacia UI debe cumplir:

- no interferir con el pipeline principal
- no abrir broadcast indiscriminado
- quedar expl?­citamente restringida al caso de monitoreo t??cnico de Kernel Console

## 6.4 Regla de verdad arquitect??nica

Al cierre de la fase debe quedar expl?­cito que:

- **Kernel** sigue siendo el journal soberano de hechos certificados
- la telemetr?­a de Fase 2 es **observabilidad t??cnica m?­nima**, no sustituto del Kernel
- el **trace store persistente** sigue siendo trabajo posterior

---

## 7. Tareas t??cnicas de la fase

## T1 â?? Confirmar y endurecer contrato de telemetr?­a

- [ ] revisar `PipelineTelemetryEvent` contra uso real
- [ ] eliminar ambig??edades obvias de naming si aparecen
- [ ] documentar correlaci??n oficial m?­nima aceptada

## T2 â?? Validar cobertura de los 7 pasos

- [ ] verificar `ingreso`
- [ ] verificar `proyeccion`
- [ ] verificar `worker`
- [ ] verificar `dispatcher`
- [ ] verificar `runtime`
- [ ] verificar `certificacion`
- [ ] verificar `entrega`

## T3 â?? Endurecer pista WebSocket

- [ ] revisar control de suscripci??n a telemetr?­a
- [ ] confirmar que el stream no se broadcast?? a clientes generales
- [ ] documentar supuestos de seguridad actuales y huecos pendientes

## T4 â?? Validar renderizado ??til en Kernel Console

- [ ] confirmar agrupaci??n por `messageId`
- [ ] confirmar visibilidad de `runtimeId`
- [ ] confirmar visibilidad de errores y latencias cuando existan
- [ ] confirmar comportamiento de limpieza/ruido en sesi??n

## T5 â?? Registrar evidencia de operaci??n

- [ ] flujo sano end-to-end
- [ ] flujo con error de runtime o dispatcher
- [ ] diferencias entre hechos certificados y trazas t??cnicas

---

## 8. Checklist de aceptaci??n

- [ ] los 7 pasos m?­nimos emiten telemetr?­a verificable
- [ ] existe una regla expl?­cita y documentada de correlaci??n m?­nima
- [ ] la UI t??cnica puede agrupar eventos sin depender de heur?­sticas ocultas
- [ ] `runtimeId` aparece cuando corresponde en la ruta cognitiva
- [ ] errores t??cnicos relevantes pueden verse en la pista
- [ ] la pista WebSocket no opera como broadcast abierto general
- [ ] qued?? documentado el l?­mite entre telemetr?­a m?­nima y trace store futuro
- [ ] qued?? registrado cualquier drift documental detectado
- [ ] existe evidencia suficiente para habilitar Fase 3

---

## 9. Pruebas obligatorias

## 9.1 Est??ticas / de inspecci??n

### U1 â?? Contrato y cobertura
- [ ] el contrato soporta los campos realmente usados
- [ ] todos los pasos requeridos emiten eventos

### U2 â?? Correlaci??n
- [ ] `messageId` puede seguirse desde `ingreso` hasta `entrega` o hasta fallo terminal
- [ ] `triggerSignalId` y `newSignalId` quedan interpretables cuando aplique

## 9.2 Integraci??n

### I1 â?? Flujo sano de respuesta AI
- [ ] se observan eventos ordenables de `ingreso` a `entrega`
- [ ] el `runtimeId` real es visible en dispatcher/runtime

### I2 â?? Flujo con error
- [ ] un error de runtime o dispatcher queda visible como evento t??cnico
- [ ] la falla no rompe la emisi??n del resto de la pista cr?­tica

### I3 â?? Suscripci??n controlada
- [ ] un cliente no autorizado no recibe stream de telemetr?­a
- [ ] un cliente de Kernel Console s?­ recibe el stream esperado

## 9.3 Manuales

### M1 â?? Sem??foro visible
- [ ] la UI t??cnica muestra estados por paso
- [ ] es posible identificar soberan?­a de runtime sin leer logs crudos

### M2 â?? Exportabilidad m?­nima
- [ ] el operador t??cnico puede copiar o inspeccionar la traza completa de una sesi??n visible

---

## 10. Evidencia requerida

Para cerrar la fase deber??n quedar registrados al menos:

- una nota de validaci??n de flujo sano
- una nota de validaci??n de flujo fallido
- referencias a archivos donde se emiten los 7 pasos
- definici??n expl?­cita de correlaci??n m?­nima aceptada
- registro de drift documental si persiste

---

## 11. Hallazgos bloqueantes esperables

- inconsistencias de `messageId` entre ingreso y respuesta AI
- eventos que existan pero no aporten suficiente metadata ??til
- controles de suscripci??n WebSocket m??s d??biles de lo que sugiere la documentaci??n hist??rica
- componentes UI que consuman el stream pero sin criterio formal de aceptaci??n

---

## 12. Riesgos esperados

- **`R1`**
  - al endurecer correlaci??n pueden aparecer consumidores impl?­citos del contrato actual

- **`R2`**
  - la validaci??n puede mostrar que parte de la telemetr?­a existente era correcta pero no suficientemente especificada

- **`R3`**
  - la documentaci??n hist??rica puede quedar en conflicto con el roadmap vigente y requerir normalizaci??n documental

---

## 13. Criterio de salida

La Fase 2 podr?? cerrarse solamente si queda demostrado que:

- el pipeline cognitivo tiene una observabilidad m?­nima operativa y coherente,
- esa observabilidad ya permite investigar fallos reales sin depender exclusivamente de logs manuales,
- y el sistema est?? listo para pasar a Fase 3 sin volver a mezclar trazabilidad improvisada con capacidades de plataforma.

Si eso no queda demostrado, Fase 3 no se habilita.

---

## ?? Gobernanza de Documentación Exhaustiva (Canon §7.0)

Según el estándar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentación técnica sincronizada con la implementación real exclusivamente en `docs/reconstruction-phase-1/exhaustive-mapping/`. 

- **Soberanía de Código:** Ningún cambio en el Kernel o Runtimes se considera "Terminado" (Done) sin su correspondiente actualización en el Landscape del Backend o UI bajo los esquemas de Tiers definidos.
- **Prohibición de Basura:** Todo documento fuera de la carpeta oficial (incluyendo este archivo temporal) se considera transitorio y debe ser purgado o consolidado una vez validada la fase.
- **Actualización Continua:** La documentación es un componente vivo del sistema y el monitor de calidad (`DocumentationQualityPanel`) es el único juez de la cobertura real.

---
## ?? Gobernanza de Documentación Exhaustiva (Canon §7.0)

Según el estándar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentación técnica sincronizada con la implementación real exclusivamente en docs/reconstruction-phase-1/exhaustive-mapping/.

- **Soberanía de Código:** Ningún cambio en el Kernel o Runtimes se considera "Terminado" (Done) sin su correspondiente actualización en el Landscape del Backend o UI bajo los esquemas de Tiers definidos.
- **Prohibición de Basura:** Todo documento fuera de la carpeta oficial (incluyendo este archivo temporal) se considera transitorio y debe ser purgado o consolidado una vez validada la fase.
- **Actualización Continua:** La documentación es un componente vivo del sistema y el monitor de calidad (DocumentationQualityPanel) es el único juez de la cobertura real.
---
