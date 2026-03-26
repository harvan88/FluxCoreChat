# Asistentes Local — Cutover Prep hacia capabilities canónicas

## Objetivo

Dejar explícito el recorte mínimo para migrar `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts` a la plataforma consolidada **sin rediseños adicionales**.

## Estado actual

El cutover ya fue aplicado.

Estado resultante:

- `asistentes-local.runtime.ts` ya consume `capabilityLocalRuntimeToolsService`
- ya no conserva defs privadas de `search_knowledge` ni `send_template`
- ya no conserva parser/dispatcher privado de tools
- ya no conserva fetch HTTP interno de RAG
- mantiene temporalmente `ASISTENTES_LOCAL_TOOL_NAMES` como guard de parity
- ese guard evita exponer `list_available_templates`, que hoy sí existe en la oferta canónica general pero no en el contrato histórico del runtime local

## Estado alcanzado antes del cutover

La plataforma ya dispone de estas piezas reutilizables:

- `capability-offer.service.ts`
- `capability-translation.service.ts`
- `capability-execution.service.ts`
- `capability-argument-normalizer.service.ts`
- `capability-local-runtime-tools.service.ts`
- `capability-extra-instructions.service.ts`
- `capability-deps-factory.service.ts`

Esto significa que el runtime local ya no necesita seguir siendo owner de:

- definición de `search_knowledge`
- definición de `send_template`
- parseo manual de tool args
- branching manual entre query capability y command capability
- ejecución HTTP/manual de RAG
- validación manual de templates autorizados

## Qué quedó después del cutover en `asistentes-local.runtime.ts`

Puntos concretos que siguen siendo propios del runtime:

- loop del modelo
- ensamblado de mensajes `tool`
- guard de parity `ASISTENTES_LOCAL_TOOL_NAMES`
- adaptación final del prompt vía `promptBuilder`

## Reemplazo mecánico esperado

### 1. Offer de tools

Antes del cambio:

- el runtime arma `tools: LLMTool[] = []`
- decide `if (hasRAG)` y `if (hasTemplates)`
- empuja defs privadas

Cutover aplicado:

- reemplazar ese bloque por una llamada a `capabilityLocalRuntimeToolsService.listTools({ runtimeConfig, authorizedContext })`

Resultado esperado:

- el runtime deja de conocer defs privadas
- el catálogo queda alineado con `CapabilityOfferService`

### 2. Ejecución de tool calls

Hoy:

- el runtime parsea JSON manualmente
- branch por `toolCall.function.name`
- ejecuta RAG por fetch HTTP propio
- construye `templateAction` manualmente

Cutover esperado:

- reemplazar `this.executeTool(...)` por `capabilityLocalRuntimeToolsService.executeTool(...)`
- pasar:
  - `toolCall`
  - `runtimeConfig`
  - `authorizedContext`
  - `executionContext` derivado de `policyContext` + `runtimeConfig` + último mensaje
  - deps reales de capability execution

Resultado esperado:

- el runtime deja de ser owner de parsing/dispatch/effect mapping
- el command model de templates queda alineado con la plataforma

### 3. Helpers privados retirados con el cutover

Con el cambio aplicado, salieron del runtime:

- `SEARCH_KNOWLEDGE_TOOL`
- `SEND_TEMPLATE_TOOL`
- `executeTool()`
- `executeSearchKnowledge()`
- `executeSendTemplate()`

## Precondición que se resolvió para tocar el runtime

Para el cutover se resolvió la inyección real de dependencias al bridge local usando plataforma compartida:

- `capability-deps-factory.service.ts`
- `capability-local-runtime-tools.service.ts`

## Recomendación

Mantener el wiring real fuera del runtime y no reintroducir infraestructura local.

El runtime debe limitarse a:

- pedir catálogo
- ejecutar tool call
- anexar mensajes `tool`
- devolver acciones declarativas

## Criterio de éxito del cutover

La migración de `asistentes-local` puede considerarse correcta cuando:

- no queden tool defs privadas activas en el archivo
- no queden ejecutores privados de `search_knowledge` o `send_template`
- las tools ofrecidas provengan del offer canónico
- la ejecución pase por capability services compartidos
- el runtime siga devolviendo exactamente `ExecutionAction[]`
- no aparezca nueva lógica de negocio o infraestructura dentro del runtime

Estado actual frente a este criterio:

- cumplido en offer y ejecución
- cumplido en retiro de defs privadas y fetch interno de RAG
- decidido mantener temporalmente el guard de parity `ASISTENTES_LOCAL_TOOL_NAMES` mientras `list_available_templates` no forme parte explícita del contrato de `asistentes-local`
