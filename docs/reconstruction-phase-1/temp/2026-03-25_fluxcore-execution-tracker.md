# Tracker de ejecución — FluxCore Cognitive Platform

**Fecha de inicio:** 2026-03-25
**Estado global:** preparación controlada completada
**Regla operativa:** solo una fase puede estar `in_progress` a la vez. Ninguna fase nueva se abre sin evidencia de cierre de la anterior.
**Regla de continuidad vigente:** antes de adaptar runtimes, primero debe quedar suficientemente consolidada la plataforma común de contexto autorizado, capabilities y offer canónica.

---

## 1. Estados permitidos

- `planned`
- `ready`
- `in_progress`
- `blocked`
- `validation_pending`
- `validated`
- `closed`

---

## 2. Estado maestro por fase

| Fase | Nombre | Estado | Gate anterior | Evidencia requerida | Documento principal |
|---|---|---|---|---|---|
| 0 | Contratos canónicos y límites arquitectónicos | `accepted_for_planning` | n/a | RFC aprobado para trabajo | `2026-03-25_phase-0-rfc-canonical-contracts.md` |
| 1 | Separación de resolvers centrales | `validated` | Fase 0 cerrada para planificación | plan de fase + checklist + pruebas | `2026-03-25_phase-1-resolvers-separation-plan.md` |
| 2 | Observabilidad mínima obligatoria | `closed` | Fase 1 validada | trazas de pipeline sano y con fallo | `2026-03-25_phase-2-observability-plan.md` |
| 3 | Plataforma canónica de capabilities | `in_progress` | Fase 2 cerrada | capability registry operativo | `2026-03-25_phase-3-capabilities-platform-plan.md` |
| 4 | Templates como command capability | `ready` | Fase 3 validada | ejecución real de templates vía action mediation | `2026-03-25_fluxcore-production-roadmap.md` |
| 5 | RAG como query capability universal | `planned` | Fase 4 validada | `search_knowledge` cross-runtime | `2026-03-25_fluxcore-production-roadmap.md` |
| 6 | Adaptación de runtimes de asistentes | `planned` | Fase 5 validada | parity local/OpenAI sobre capabilities | `2026-03-25_fluxcore-production-roadmap.md` |
| 7 | Purificación de Fluxi | `planned` | Fase 6 validada | Fluxi sin infraestructura cruda en runtime | `2026-03-25_fluxcore-production-roadmap.md` |
| 8 | Estados de producto, onboarding y fallos | `planned` | Fase 7 validada | inactive mode y errores explícitos probados | `2026-03-25_fluxcore-production-roadmap.md` |
| 9 | Retiro de legacy y hardening final | `planned` | Fase 8 validada | suite final completa aprobada | `2026-03-25_fluxcore-production-roadmap.md` |

---

## 3. Decisión operativa actual

### Decisión vigente

- **Fase 2** queda clausurada y validada tras la captura empírica del flujo sano v8.3 (Signals 1088 -> 1089).
- **Fase 3** (Plataforma de Capabilities) se declara oficialmente **in_progress**.
- Se ha completado la **Purga Legacy P0**: eliminados `ai-tools.service`, `tool-registry.service` y wrappers en extensiones.
- Se ha corregido un **Bug Crítico de Observabilidad UI**: los mensajes en recarga de página ahora se sirven por orden de novedad (most-recent-first) invirtiendo el batch, solucionando la "desaparición" de chats post-refactor.
- La **Soberanía de Plataforma** es ahora la ley: los runtimes (Local y OpenAI) ya operan de forma declarativa para el envío de plantillas.

---

## 4. Registro de avances previstos

| Fecha | Hito | Estado | Evidencia |
|---|---|---|---|
| 2026-03-25 | Análisis arquitectónico exhaustivo | `closed` | `2026-03-25_fluxcore-cognitive-architecture-analysis.md` |
| 2026-03-25 | Matriz plataforma vs runtime | `closed` | `2026-03-25_fluxcore-platform-vs-runtime-ownership-matrix.md` |
| 2026-03-25 | Roadmap técnico de producción | `closed` | `2026-03-25_fluxcore-production-roadmap.md` |
| 2026-03-25 | RFC de Fase 0 | `closed` | `2026-03-25_phase-0-rfc-canonical-contracts.md` |
| 2026-03-25 | Plan operativo de Fase 1 | `closed` | `2026-03-25_phase-1-resolvers-separation-plan.md` |
| 2026-03-25 | Implementación inicial de separación `PolicyContext` / `RuntimeSelection` / `RuntimeComposition` | `closed` | cambios en servicios centrales + dispatcher |
| 2026-03-25 | Validación formal de Fase 1 | `closed` | `2026-03-25_phase-1-validation-record.md` |
| 2026-03-25 | Plan operativo de Fase 2 | `closed` | `2026-03-25_phase-2-observability-plan.md` |
| 2026-03-26 | Validación empírica y cierre de Fase 2 | `closed` | `2026-03-25_phase-2-progress-evidence.md` |
| 2026-03-25 | Plan operativo de Fase 3 | `closed` | `2026-03-25_phase-3-capabilities-platform-plan.md` |
| 2026-03-26 | Preparación técnica anticipada de plataforma para Fase 3 | `closed` | cambios en `fluxcore-types.ts`, `runtime-input-factory.service.ts`, `cognitive-dispatcher.service.ts`, `tool-registry.service.ts` |
| 2026-03-26 | Guía ejecutable de continuidad platform-first | `closed` | `2026-03-26_phase-3-platform-continuation-handoff.md` |
| 2026-03-26 | Purga de Deuda Técnica Legacy (Wrappers & Registry) | `closed` | Eliminación de `ai-tools.service` y `tool-registry.service` |
| 2026-03-26 | Fix: Persistencia y carga de mensajes post-refactor | `closed` | Cambio a query DESC + reverse en `message.service.ts` |
| 2026-03-26 | Inicio formal de Fase 3 (Capabilities Platform) | `in_progress` | Consolidación de `capability-execution` y `action-executor` |

---

## 5. Registro de hallazgos no previstos

| Fecha | Tipo | Fase detectada | Descripción | Impacto | Bloquea | Decisión |
|---|---|---|---|---|---|---|
| 2026-03-25 | `drift documental` | análisis previo | faltan docs de `04-end-to-end-flows` | medio | no | documentar drift y reconstruir en fases posteriores |
| 2026-03-25 | `hueco de diseño` | análisis previo | `PolicyContext` y `runtimeConfig` aparecen mezclados | alto | sí | atacar primero en Fase 1 |
| 2026-03-25 | `deuda legacy` | análisis previo | existen rutas/tool systems paralelos | alto | no inmediato | retirar en Fase 9 luego de migración segura |
| 2026-03-25 | `inconsistencia de datos/contrato` | análisis previo | estados de assistants y runtime IDs no están unificados | alto | no inmediato | normalizar a partir de Fase 1 y fases subsiguientes |
| 2026-03-25 | `bloqueo técnico` | Fase 1 | la validación TypeScript global del repo está contaminada por errores previos en archivos no relacionados con Fase 1 | medio | no | continuar validación focalizada de la fase y no usar el lint global como gate único |
| 2026-03-25 | `drift documental` | Fase 2 preparatoria | existen documentos históricos que describen la telemetría como fully validated/live mientras el roadmap vigente todavía requiere validación empírica formal | medio | no | usar el roadmap y los registros de fase como fuente operativa canónica |
| 2026-03-25 | `deuda de observabilidad UI` | Fase 2 | `Live Cognitive Pipeline` puede permanecer vacío aun cuando la IA responde; por ahora debe tratarse como consola efímera no canónica y no como prueba de fallo del dominio | medio | no | registrar la deuda y continuar la reconstrucción con evidencia operativa más cercana al Kernel |
| 2026-03-25 | `remanente legacy/configuracional` | revisión transversal | `FLUX_NEW_ARCHITECTURE` ya no gobierna el arranque operativo actual; `cognitionWorker` arranca siempre, `config/features.ts` contiene un remanente no usado y la deuda viva real está en piezas como `smartDelayService` y adapters legacy todavía conectados | alto | no inmediato | documentar el remanente, no usar el flag como fuente de verdad y retirar compatibilidades con gates posteriores |
| 2026-03-26 | `bug funcional` | Fase 2/3 | La query de carga de mensajes usaba ASC+LIMIT, devolviendo siempre los mensajes más viejos y ocultando los nuevos tras refactor. | Crítico | Sí | Aplicado Fix: Query DESC + reverse en `MessageService`. |
| 2026-03-26 | `deuda de tipos` | Fase 3 | Falta de import `ExecutionAction` en `capability-openai-compat.service.ts` causaba crash de tipos. | Medio | No | Reparado import. |

---

## 6. Gates globales de seguridad

## Gate G1 — No duplicidad de fuentes de verdad

No puede iniciarse migración de capabilities sin haber estabilizado:
- `PolicyContext`
- `RuntimeSelection`
- `RuntimeComposition`

## Gate G2 — No migrar sin trazabilidad suficiente

No puede iniciarse migración compleja de templates/RAG sin poder reconstruir el pipeline de fallo.

## Gate G3 — No retirar legacy antes de parity funcional

No puede eliminarse una ruta legacy hasta que la ruta nueva pruebe equivalencia funcional o superioridad operacional.

---

## 7. Fase activa autorizada

### Estado actual

- fase activa: **Fase 3**
- siguiente fase autorizada a iniciar: **Fase 4** (tras cierre de F3)
- fase siguiente preparada documentalmente: **Fase 4**
- guía operativa de continuidad vigente: **`2026-03-26_phase-3-platform-continuation-handoff.md`**

### Condición de arranque

La Fase 2 ya comenzó. No se habilita Fase 3 hasta cerrar validación empírica de observabilidad mínima.
La preparación documental de Fase 3 no equivale a inicio real de fase.

---

## 8. Criterio para actualizar este tracker

Actualizar solo cuando ocurra uno de estos eventos:
- inicio real de fase
- bloqueo real
- validación empírica completada
- hallazgo no previsto relevante
- cierre formal de fase

---

## 9. Resumen ejecutivo actual

Hemos completado el cutover a la **Plataforma Cognitive**. La Fase 2 está cerrada con evidencia determinística de trazabilidad. Estamos actualmente en la **Fase 3**, consolidando el catálogo de capacidades. La IA ya no decide por su cuenta cómo enviar mensajes o plantillas; propone acciones que la plataforma ejecuta tras validar la autorización. Se resolvió un bug crítico que impedía ver mensajes nuevos en el frontend tras recargar, garantizando que el sistema sea usable durante la transición.

**Próximo paso decidido:** Finalizar la migración de `search_knowledge` para que sea la fuente única de RAG gobernada por plataforma, eliminando cualquier transporte HTTP privado dentro de los runtimes.
