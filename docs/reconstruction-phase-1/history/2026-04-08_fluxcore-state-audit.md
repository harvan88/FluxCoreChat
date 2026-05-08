# Auditoría de estado actual — FluxCore Cognitive Platform

**Fecha:** 2026-04-08
**Estado:** auditoría empírica actualizada
**Propósito:** establecer el estado real del sistema contrastando documentación temporal de marzo con código actual, base de datos real y build ejecutado.

---

## 1. Fuentes de verdad usadas

Esta auditoría se apoya exclusivamente en:

- código actual en `apps/api/src/**`, `packages/db/src/**`
- base de datos PostgreSQL accesible en `localhost:5432/fluxcore`
- validación ejecutable mediante `bun run build`

Los documentos en `docs/reconstruction-phase-1/temp/**` se trataron como **claims históricos a validar**, no como verdad cerrada.

---

## 2. Verificaciones ejecutadas

## 2.1 Código

Se relevaron y contrastaron, entre otros:

- `apps/api/src/server.ts`
- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/workers/cognition-worker.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/runtime-selection.service.ts`
- `apps/api/src/services/runtime-composition.service.ts`
- `apps/api/src/services/fluxcore/runtime-input-factory.service.ts`
- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/capability-registry.service.ts`
- `apps/api/src/services/capability-offer.service.ts`
- `apps/api/src/services/capability-execution.service.ts`
- `apps/api/src/services/capability-local-runtime-tools.service.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`
- `apps/api/src/core/capabilities/knowledge.capability.ts`
- `apps/api/src/services/retrieval.service.ts`
- `apps/api/src/routes/fluxcore-runtime.routes.ts`
- `apps/api/src/services/ai-trace.service.ts`
- `apps/api/src/services/ai.service.ts`
- `apps/api/src/telemetry/tracer.ts`

## 2.2 Base de datos real

Se verificó conexión real a PostgreSQL con lectura directa.

Resultados empíricos principales:

- `account_runtime_config`
  - `@fluxcore/asistentes` = 3 cuentas
  - `@fluxcore/fluxi` = 1 cuenta

- `fluxcore_assistants`
  - `active + local` = 13
  - `draft + local` = 2
  - `production + openai` = 1

- `fluxcore_assistant_tools`
  - `templates` = 6 asignaciones
  - `file_search` = 2 asignaciones

- `fluxcore_template_settings`
  - `authorize_for_ai = true` = 3
  - `authorize_for_ai = false` = 2

- `fluxcore_vector_stores`
  - `local + draft` = 3
  - `openai + completed` = 1
  - `openai + production` = 1

- `fluxcore_assistant_vector_stores`
  - `total_links = 4`
  - `enabled_links = 4`

- `fluxcore_document_chunks`
  - `total_chunks = 0`
  - `chunks_with_embedding = 0`
  - `vector_stores_with_chunks = 0`

- observabilidad persistida
  - `ai_traces = 0`
  - `ai_signals = 0`

- forma real de JSONB en asistentes
  - `model_config=object, timing_config=object` = 13
  - `model_config=object, timing_config=string` = 3

## 2.3 Build

Se ejecutó:

```bash
bun run build
```

Resultado:

- `@fluxcore/db` build OK
- `@fluxcore/api` build OK
- el monorepo falla por errores TypeScript en `@fluxcore/web`

Errores observados en Web:

- imports no usados
- props/tipos incompatibles (`ButtonSize`, `AvatarSize`, `UploadAudioFn`)
- errores TS de componentes en `src/components/monitor/**`, `src/extensions/fluxcore/components/**`, `src/public-profile/components/**`, `src/main.tsx`, `src/hooks/useChat.ts`

---

## 3. Estado real verificado del sistema

## 3.1 Arquitectura cognitiva base

**Veredicto:** implementada y operativa.

Sigue siendo verdadero en código actual que:

- `server.ts` inicia Kernel, projectors, runtime registry y `cognitionWorker`
- `ChatProjector` actúa como puente bidireccional
- la respuesta AI vuelve vía `AI_RESPONSE_GENERATED`
- `ActionExecutor` media efectos en vez de escribir directamente en ChatCore

Conclusión:

> La macroarquitectura `FluxCore -> Kernel -> ChatCore` está vigente y sí existe en el camino ejecutable actual.

## 3.2 Separación `PolicyContext` / `RuntimeSelection` / `RuntimeComposition`

**Veredicto:** parcialmente consolidada y más avanzada que varios documentos de marzo.

Hallazgos:

- `cognitive-dispatcher.service.ts` ya consume:
  - `runtimeSelectionService`
  - `runtimeCompositionService`
  - `runtimeInputFactoryService`
- `fluxPolicyContextService.resolvePolicyContext()` ya devuelve solo contexto de negocio autorizado en el camino principal actual
- `runtimeInputFactoryService` ya construye `authorizedContext` y `services`

Deuda viva:

- `fluxPolicyContextService` todavía conserva `resolveContext()` híbrido que devuelve `{ policyContext, runtimeConfig }`
- `runtime-config.service.ts` y `account-runtime-config.ts` conservan naming legacy / drift semántico
- en DB conviven estados de asistentes `active` y `production`

Conclusión:

> La separación canónica ya no es solo plan; existe en producción parcial. Pero todavía no está cerrada como única semántica limpia del sistema.

## 3.3 Capabilities platform-first

**Veredicto:** Fase 3 materializada en grado avanzado.

Evidencia en código:

- `capability-registry.service.ts`
- `capability-offer.service.ts`
- `capability-execution.service.ts`
- `capability-local-runtime-tools.service.ts`
- `runtime-input-factory.service.ts`

Hallazgo clave:

- `asistentes-local.runtime.ts` ya no es dueño primario del catálogo de tools
- `asistentes-local` consume la offer/ejecución canónica mediante `capabilityLocalRuntimeToolsService`
- `search_knowledge` ya está definido como capability de plataforma
- templates ya están alineadas al modelo `CALL_TEMPLATE` -> `ExecutionAction { type: 'send_template' }`

Conclusión:

> La documentación temporal que todavía describe Fase 3 como principalmente preparatoria quedó desactualizada frente al código actual.

## 3.4 Templates

**Veredicto:** implementadas, operativas y con evidencia funcional adicional de usuario.

Evidencia técnica:

- `template-registry.service.ts` sigue siendo SSOT razonable de autorización/instrucciones
- `asistentes-local.runtime.ts` parsea `CALL_TEMPLATE:<template_id>` y lo traduce a `send_template`
- `runtime-input-factory.service.ts` conserva mediación declarativa para template actions
- en DB hay templates autorizadas para AI y la tool `templates` está asignada a asistentes

Evidencia operativa adicional:

- pruebas manuales reportadas por usuario desde perfil público y chat directo respondiendo correctamente con templates

Conclusión:

> Templates ya no deben tratarse como eje incierto. El estado real es de funcionalidad operativa, aunque todavía puede requerir endurecimiento y documentación canónica final.

## 3.5 RAG

**Veredicto:** lógica implementada, pero validación funcional bloqueada por ausencia de corpus indexado.

Evidencia en código:

- `retrieval.service.ts` implementa embedding + búsqueda pgvector + construcción de contexto
- `knowledge.capability.ts` define `search_knowledge` como capability canónica
- `/fluxcore/runtime/rag-context` existe y usa `retrievalService.buildContext(...)`
- `ragConfigRoutes` está montado en `server.ts`

Evidencia en DB:

- existen vector stores y enlaces a asistentes
- existe al menos 1 archivo en `fluxcore_vector_store_files`
- **pero `fluxcore_document_chunks` está completamente vacío**

Implicación metodológica:

- hoy no hay base empírica para validar recuperación real end-to-end
- el bloqueo actual no es principalmente de contrato ni de wiring
- el bloqueo real es de **datos indexados / embeddings disponibles**

Conclusión:

> RAG está en estado `implementado pero no validable todavía con valor real`, porque falta corpus materializado en chunks/embeddings.

## 3.6 Observabilidad

**Veredicto:** parcial, heterogénea y no cerrada en el pipeline vivo principal.

Evidencia:

- existe observabilidad efímera por event bus en `telemetry/tracer.ts`
- existe modelo persistido en DB vía `ai-trace.service.ts`
- `aiTraceService.persistTrace()` está conectado en `ai.service.ts`

Hallazgo crítico:

- `ai_traces = 0`
- `ai_signals = 0`
- el camino de persistencia observado está conectado a `ai.service.ts`, no al corazón actual `CognitionWorker -> CognitiveDispatcher -> RuntimeGateway -> ActionExecutor`

Conclusión:

> La observabilidad existe como capacidad, pero no está demostrada como cobertura persistida del pipeline cognitivo actual. El gap no es teórico: la DB real hoy no contiene evidencia de uso.

## 3.7 Gobernanza temporal del turno

**Veredicto:** pendiente.

Evidencia:

- `fluxPolicyContext` resuelve `turnWindowMs`, `turnWindowTypingMs`, `turnWindowMaxMs`
- `ChatProjector` mantiene `TURN_WINDOW_MS = 3000` hardcodeado
- `CognitionWorker` usa un delay fijo de 4000 ms sobre wakeup

Conclusión:

> La plataforma temporal todavía no está unificada; sigue habiendo lógica distribuida e hardcodeada.

## 3.8 Estado del frontend respecto del programa

**Veredicto:** deuda activa que impacta entrega global pero no invalida la arquitectura backend cognitiva.

El build del monorepo falla por Web, no por API/DB.

Conclusión:

> El sistema cognitivo backend está más maduro que el estado global del repositorio. El siguiente plan debe separar claramente backend/platform consolidation de frontend build health.

---

## 4. Drift documental detectado

## 4.1 Drift fuerte

Quedaron desactualizados frente al código actual los documentos de marzo que todavía afirman o sugieren que:

- `RuntimeInput.services` no está materializado
- `asistentes-local` todavía es dueño directo del catálogo/ejecución privada de tools
- `search_knowledge` sigue dependiendo estructuralmente de HTTP interno runtime-owned
- la plataforma de capabilities está solo declarada pero no operativa

## 4.2 Drift parcial aún vigente

Siguen siendo válidos los documentos que señalan:

- mezcla residual/histórica en `flux-policy-context.service.ts`
- inconsistencia de estados canónicos de asistentes
- coexistencia de naming/runtime IDs legacy
- deuda de gobernanza temporal del turno
- necesidad de cleanup/documentación consolidada

---

## 5. Punto real del programa

## Sí está hecho o muy avanzado

- macroarquitectura Kernel / FluxCore / ChatCore
- selección/composición runtime en camino principal
- `RuntimeInput` platform-owned con `authorizedContext` + `services`
- base canónica de capabilities
- adopción efectiva de `asistentes-local`
- templates operativas
- OpenAI runtime alineado a `authorizedContext`

## Está parcial / abierto

- pureza final de `fluxPolicyContextService`
- cierre semántico de estados y runtime IDs
- observabilidad persistida del pipeline cognitivo vigente
- gobernanza temporal del turno
- cleanup documental y cleanup residual legacy

## No está listo para declarar cerrado

- RAG validado end-to-end con corpus real
- parity observable cross-runtime con evidencia persistida
- monorepo en build verde global

---

## 6. Decisión sobre RAG

## No es el momento de “evaluar calidad RAG”

Sí es el momento de:

1. verificar por qué no hay `fluxcore_document_chunks`
2. completar carga/indexación/embeddings reales
3. recién después ejecutar validación funcional y comparativa de retrieval

Justificación:

- sin chunks ni embeddings, cualquier prueba de RAG sería metodológicamente débil
- el problema actual no parece estar en el contrato `search_knowledge`, sino en la ausencia de material indexado

---

## 7. Plan de acción recomendado

## Paso 1 — Cerrar evidencia operativa canónica

Objetivo:

- conectar o verificar persistencia de trazas del pipeline cognitivo vigente

Trabajo:

- decidir si `ai-trace.service.ts` debe integrarse al camino `CognitionWorker -> CognitiveDispatcher -> RuntimeGateway -> ActionExecutor`
- registrar `turn_id`, `runtime_id`, `assistant_id`, tools ofrecidas/llamadas y acciones ejecutadas desde el pipeline canónico

## Paso 2 — Resolver drift semántico de runtime y assistants

Objetivo:

- eliminar ambigüedad de estados y naming

Trabajo:

- unificar vocabulario entre schema, servicios y DB viva para estados (`active`, `production`, `disabled`, `draft`)
- revisar `account_runtime_config` y su default histórico/documental

## Paso 3 — Desbloquear RAG por datos reales

Objetivo:

- lograr primer escenario RAG validable

Trabajo:

- auditar ingestión/indexación de vector stores
- poblar `fluxcore_document_chunks`
- confirmar embeddings persistidos
- ejecutar prueba controlada con y sin RAG

## Paso 4 — Salud global del repositorio

Objetivo:

- recuperar `bun run build` verde en monorepo

Trabajo:

- corregir errores TS de `apps/web`
- no mezclar esa deuda con la consolidación arquitectónica backend

## Paso 5 — Consolidación documental

Objetivo:

- dejar una única lectura vigente y explícita del estado actual

Trabajo:

- tratar los documentos de marzo como históricos
- consolidar hallazgos validados en documentación activa bajo `docs/reconstruction-phase-1`
- deprecar claims que ya no reflejan el código actual

---

## 8. Conclusión ejecutiva

La documentación temporal de marzo fue útil para ordenar el programa, pero el sistema real hoy está **más avanzado en platform capabilities y templates** de lo que esos documentos muestran.

El estado real verificado es este:

- **Kernel + pipeline cognitivo:** reales y operativos
- **Capabilities platform-first:** ya materializadas en grado importante
- **Templates:** funcionando
- **RAG:** implementado pero hoy bloqueado por ausencia de chunks/embeddings en DB
- **Observabilidad persistida:** no demostrada en el pipeline vivo actual
- **Repo global:** backend fuerte, frontend todavía bloquea build total

La prioridad correcta ya no es “diseñar la plataforma de capabilities”, sino **cerrar evidencia, normalizar drift semántico y desbloquear RAG con datos reales**.
