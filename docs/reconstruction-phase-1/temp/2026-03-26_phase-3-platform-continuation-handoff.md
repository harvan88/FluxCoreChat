# Continuidad operativa — consolidación de plataforma antes de adopción en runtimes

**Fecha:** 2026-03-26
**Estado:** guía operativa vigente
**Propósito:** dejar una guía ejecutable para continuar la consolidación de capabilities compartidas de FluxCore incluso si la próxima iteración la realiza otra IA con menos contexto o menor capacidad.

---

## 1. Regla no negociable de continuidad

La prioridad operativa vigente es esta:

> **Primero se consolida la plataforma común de capabilities, contexto autorizado y offer canónica. Recién después se adaptan los runtimes para consumirla.**

Esto implica:

- no introducir lógica nueva de knowledge, templates o tool execution dentro de runtimes durante esta etapa
- usar archivos de runtime solo como fuente de lectura para detectar lógica que debe extraerse o ser absorbida por plataforma
- considerar inválida cualquier solución que mejore un runtime puntual pero deje sin resolver la fuente común de verdad

---

## 2. Qué ya quedó hecho

## 2.1 Contrato común de entrada al runtime

Ya quedó materializado en plataforma:

- `apps/api/src/core/fluxcore-types.ts`
  - `RuntimeInput`
  - `AuthorizedRuntimeContext`
  - `RuntimeServices`
  - `RuntimeToolExecutionResult`

Resultado:

- el runtime ya puede recibir contexto autorizado y servicios compartidos sin consultar infraestructura cruda directamente

## 2.2 Construcción platform-owned del `RuntimeInput`

Ya quedó materializado:

- `apps/api/src/services/fluxcore/runtime-input-factory.service.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`

Resultado:

- el dispatcher ya no arma inline el wiring principal
- la orquestación pasó a depender de una pieza reutilizable y más cercana al canon

## 2.3 Base canónica inicial de capabilities

Ya quedó materializado:

- `apps/api/src/core/capabilities/index.ts`
- `apps/api/src/core/capabilities/knowledge.capability.ts`
- `apps/api/src/core/capabilities/templates.capability.ts`
- `apps/api/src/services/capability-registry.service.ts`
- `apps/api/src/services/capability-offer.service.ts`

Resultado:

- ya existe una definición más explícita de capability con `id`, `slug`, `version`, `domain`, `kind`, `outputSchema` y `usageHints`
- ya existe una primera resolución de offer por ejecución concreta

## 2.4 Tool catalog transicional alineado parcialmente a la fuente canónica

Ya quedó materializado:

- `apps/api/src/services/tool-registry.service.ts`
- `apps/api/src/services/capability-translation.service.ts`
- `apps/api/src/services/capability-execution.service.ts`
- `apps/api/src/services/capability-deps-factory.service.ts`
- `apps/api/src/services/ai-tools.service.ts`
- `apps/api/src/services/openai-sync.service.ts`
- `apps/api/src/services/capability-openai-compat.service.ts`
- `apps/api/src/services/capability-instruction.service.ts`
- `apps/api/src/services/capability-argument-normalizer.service.ts`
- `apps/api/src/services/capability-openai-tool-response.service.ts`
- `apps/api/src/services/capability-openai-offer.service.ts`
- `apps/api/src/services/capability-extra-instructions.service.ts`
- `apps/api/src/services/capability-local-runtime-tools.service.ts`
- `docs/reconstruction-phase-1/temp/2026-03-26_asistentes-local-cutover-prep.md`

Resultado:

- el registry ya puede consumir definiciones desde la base canónica
- ya ofrece `search_knowledge`, `list_available_templates` y `send_template` filtrados por autorización efectiva
- `capability-translation.service.ts` ya separa la traducción respecto del registro canónico
- `capability-execution.service.ts` ya separa la ejecución concreta respecto del catálogo/offer
- `capability-deps-factory.service.ts` ya centraliza el wiring compartido de RAG/templates para evitar duplicación
- el contrato canónico ya soporta `translationStrategy` e `instructionBlock` reusable por capability
- `capability-instruction.service.ts` ya expone lectura centralizada de instruction blocks canónicos
- `capability-argument-normalizer.service.ts` ya centraliza la normalización de argumentos reusable por capability
- `capability-openai-tool-response.service.ts` ya concentra el tool loop OpenAI-compatible para respuesta de tools
- `capability-openai-offer.service.ts` ya concentra la offer OpenAI-compatible usada por bridges legacy
- `capability-extra-instructions.service.ts` ya concentra el ensamblado reusable de instrucciones extra
- `capability-local-runtime-tools.service.ts` ya gobierna la offer/ejecución canónica consumida por `asistentes-local`
- `tool-registry.service.ts` sigue siendo transicional, pero ya no tiene consumers activos detectados; quedó como artefacto de clase listo para retiro cuando convenga
- `openai-sync.service.ts` ya consume traducción canónica para definir tools de asistentes OpenAI
- `capability-openai-compat.service.ts` ya concentra la compatibilidad OpenAI común para definición y ejecución
- `ai-tools.service.ts` quedó reducido a una fachada residual sin consumidores activos detectados en el árbol actual
- parte del legacy en `extensions/fluxcore-asistentes/src/tools/*` ya consume definiciones, instruction blocks y tool-loop canónicos desde plataforma
- `extensions/fluxcore-asistentes/src/tools/registry.ts` ya no tiene consumers activos detectados y quedó listo para retiro
- `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts` quedó como wrapper residual sin consumers activos detectados
- `extensions/fluxcore-asistentes/src/prompt-utils.ts` quedó reducido a compat wrapper puro sin consumers activos detectados
- `asistentes-local.runtime.ts` ya consume el bridge canónico para tools y dejó de ser owner de defs privadas, parser propio y transporte HTTP interno de RAG
- el guard local `ASISTENTES_LOCAL_TOOL_NAMES` preserva parity del runtime mientras la plataforma canónica sigue siendo la fuente de verdad
- hoy ese guard evita exponer `list_available_templates` en `asistentes-local`, porque esa tool todavía no formaba parte de su contrato histórico
- `asistentes-openai.runtime.ts` ya toma identidad/reglas desde `authorizedContext` y estilo/instrucciones desde `runtimeConfig`, reduciendo drift de contexto dentro del runtime
- `runtime-style.service.ts` y `runtime-instruction-context.service.ts` extraen la resolución de estilo y el armado de directivas/instrucciones autorizadas a la plataforma compartida
- `prompt-builder.service.ts` y ambos runtimes ahora consumen estas piezas compartidas, eliminando duplicación de lógica de estilo y atención
- el recorte mecánico del cambio quedó documentado en `2026-03-26_asistentes-local-cutover-prep.md`

---

## 3. Qué falta para cerrar la consolidación de plataforma

## 3.1 Pendiente crítico P0-P1

### A. Eliminar la doble fuente de verdad viva de tools

Pendiente principal:

- `apps/api/src/services/ai-tools.service.ts` ya no debe tratarse como catálogo primario y ahora sobrevive solo como fachada residual, lista para retiro cuando resulte seguro hacerlo

Trabajo requerido:

- terminar de clasificarlo como bridge transicional explícito
- decidir si se retira o si se conserva como shim temporal

Estado actual de consumidores:

- no se detectaron consumidores activos restantes de `aiToolService` en el árbol actual luego de migrar:
  - `openai-sync.service.ts`
  - `extensions/fluxcore-asistentes-openai/src/index.ts`
  - `ai-orchestrator.tmp.ts`

### B. Separar con más pureza definición, offer y ejecución

Pendiente principal:

- `tool-registry.service.ts` todavía mezcla responsabilidades

Trabajo requerido:

- mantener `capability-registry.service.ts` como fuente primaria de definición
- mantener `capability-offer.service.ts` como fuente primaria de autorización/oferta
- dejar `tool-registry.service.ts` como adapter/bridge transicional o degradarlo explícitamente

### C. Clasificar definiciones privadas todavía vivas en runtimes/extensiones

Pendiente principal:

- todavía siguen existiendo definiciones y ejecutores privados fuera de la plataforma canónica

Trabajo requerido:

- usar `2026-03-26_runtime-private-tool-definition-inventory.md` como inventario operativo de esta deuda
- priorizar primero el legacy de `extensions/fluxcore-asistentes/src/tools/*`
- retirar físicamente wrappers residuales de extensiones legacy cuando resulte seguro hacerlo
- seguir extrayendo a plataforma el armado reusable de instructions/contexto para runtimes remotos
- validar que los nuevos servicios compartidos de estilo e instrucciones cubran los casos de uso de todos los runtimes
- no reintroducir defs privadas o ejecutores privados dentro de runtimes

### C. Cerrar el modelo canónico de command capability para templates

Pendiente principal:

- hoy `send_template` todavía conserva una transición híbrida entre ejecución mediada y efecto directo heredado

Trabajo requerido:

- fijar si la capability final será `send_template` o `propose_send_template`
- hacer que el runtime exprese intención declarativa y que la ejecución final quede mediada por plataforma/`ExecutionAction`
- evitar que el contrato final dependa de side effects directos dentro de tool execution

### D. Cerrar RAG como query capability universal

Pendiente principal:

- aunque la capability ya existe en plataforma, todavía falta demostrar que gobierna realmente el consumo cross-runtime y reemplaza caminos privados heredados

Trabajo requerido:

- asegurar que `search_knowledge` sea la única definición primaria
- eliminar dependencia futura de implementaciones privadas o transporte HTTP interno desde runtimes
- dejar el criterio de autorización y offer completamente gobernado por plataforma

---

## 4. Qué NO hay que hacer todavía

No hacer todavía:

- modificar `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts` salvo para lectura diagnóstica
- adaptar `Fluxi` a la nueva capa mientras sigan existiendo catálogos paralelos o ambigüedad en command/query ownership
- retirar legacy por intuición sin demostrar parity funcional
- reintroducir tool defs privadas o fetches internos de RAG dentro de runtimes ya migrados

Razón:

- hacerlo ahora movería el drift desde plataforma hacia cada runtime y volvería a multiplicar fuentes de verdad

---

## 5. Orden estricto recomendado para terminarlo

## Paso 1 — Cerrar catálogo paralelo

Objetivo:

- clasificar y degradar `ai-tools.service.ts`

Resultado esperado:

- `ai-tools.service.ts` deja de definir tools primarias
- queda absorbido o marcado únicamente como bridge transicional de ejecución

## Paso 2 — Terminar la separación canónica interna

Objetivo:

- dejar inequívoco qué servicio define, cuál ofrece y cuál solo traduce/ejecuta transicionalmente

Resultado esperado:

- definición: `capability-registry.service.ts`
- offer/autorización: `capability-offer.service.ts`
- traducción: `capability-translation.service.ts`
- ejecución: `capability-execution.service.ts`
- wiring compartido de deps: `capability-deps-factory.service.ts`
- bridge/catalogación transicional: `tool-registry.service.ts`

## Paso 3 — Cerrar templates como command capability coherente

Objetivo:

- dejar un contrato final consistente con `ExecutionAction[]`

Resultado esperado:

- command capability sin side effect directo ambiguo
- regla de mediación documentada y trazable

## Paso 4 — Cerrar knowledge/RAG como query capability universal

Objetivo:

- demostrar que la capability de plataforma gobierna la consulta reusable

Resultado esperado:

- sin definiciones privadas runtime-owned
- sin HTTP interno como solución estructural

## Paso 5 — Extender adopción runtime

Objetivo:

- extender el contrato común a más runtimes después del primer cutover exitoso

Resultado esperado:

- `asistentes-local` ya adoptado
- `asistentes-openai`
- luego `Fluxi` si aplica a sus capacidades compartidas

---

## 6. Definición práctica de terminado para esta consolidación

La consolidación puede considerarse suficientemente cerrada cuando se cumplan todos estos puntos:

- existe una sola fuente primaria para definir capabilities compartidas
- existe una sola fuente primaria para resolver offer/autorización por ejecución
- `ai-tools.service.ts` dejó de ser catálogo semántico paralelo
- `search_knowledge` quedó resuelto como query capability platform-owned
- templates quedaron alineadas con command capability mediada por plataforma
- al menos un runtime ya consume la plataforma sin redefinir tools ni ejecutar RAG por camino privado
- el tracker y el plan de Fase 3 reflejan ese estado sin ambigüedad

---

## 7. Estimación operativa de faltante

## 7.1 Para cerrar la consolidación de plataforma después del primer runtime adoptado

Estimación razonable actual:

- **completado:** aproximadamente `55%` a `65%`
- **faltante:** aproximadamente `30%` a `40%`

Justificación:

- el contrato común y el wiring principal ya existen
- ya hay registro y offer iniciales
- `ai-tools` ya fue degradado al punto de no tener consumidores activos detectados, pero todavía faltan los cierres de command model final para templates y el cierre universal de RAG
- `asistentes-local` ya dejó de ser fuente privada de definición/ejecución, pero persisten wrappers residuales en extensiones legacy inventariadas en `2026-03-26_runtime-private-tool-definition-inventory.md`
- parte de la semántica reusable de prompting ya empezó a moverse al contrato canónico mediante `instructionBlock`, pero todavía falta que los bridges legacy la consuman desde plataforma

## 7.2 Para terminar todo el programa hasta adopción runtime + limpieza fuerte de legacy

Estimación razonable actual:

- **completado:** aproximadamente `35%` a `45%`
- **faltante:** aproximadamente `55%` a `65%`

Justificación:

- todavía quedan Fase 2 por validar formalmente, Fase 3 por cerrar realmente, y luego Fases 4 a 9
- la parte ya más encaminada es la disciplina arquitectónica y la base de plataforma
- la parte todavía costosa es migración productiva, parity cross-runtime y retiro ordenado de legacy

---

## 8. Cómo debería continuar la próxima IA

Si la continuación la toma otra IA, debería seguir esta secuencia mínima:

1. leer `2026-03-25_fluxcore-execution-tracker.md`
2. leer `2026-03-25_phase-3-capabilities-platform-plan.md`
3. leer este documento completo
4. revisar estos archivos de código:
   - `apps/api/src/core/fluxcore-types.ts`
   - `apps/api/src/core/capabilities/*`
   - `apps/api/src/services/capability-registry.service.ts`
   - `apps/api/src/services/capability-offer.service.ts`
   - `apps/api/src/services/tool-registry.service.ts`
   - `apps/api/src/services/ai-tools.service.ts`
   - `apps/api/src/services/fluxcore/runtime-input-factory.service.ts`
5. avanzar primero sobre plataforma y documentación de transición
6. no tocar runtimes hasta que el catálogo paralelo y el modelo final de capabilities queden más cerrados

---

## 9. Decisión registrada

Queda registrado que la prioridad operativa correcta para continuar FluxCore es:

- consolidar primero la plataforma común de capabilities y contexto autorizado
- usar los runtimes actuales como referencia de extracción, no como destino de nuevos parches funcionales
- abrir adopción runtime solo cuando la plataforma ya sea una fuente de verdad suficientemente estable
