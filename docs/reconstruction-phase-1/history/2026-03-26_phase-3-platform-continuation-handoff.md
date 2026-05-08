# Continuidad operativa â?? consolidaci??n de plataforma antes de adopci??n en runtimes

**Fecha:** 2026-03-26
**Estado:** gu?­a operativa vigente
**Prop??sito:** dejar una gu?­a ejecutable para continuar la consolidaci??n de capabilities compartidas de FluxCore incluso si la pr??xima iteraci??n la realiza otra IA con menos contexto o menor capacidad.

---

## 1. Regla no negociable de continuidad

La prioridad operativa vigente es esta:

> **Primero se consolida la plataforma com??n de capabilities, contexto autorizado y offer can??nica. Reci??n despu??s se adaptan los runtimes para consumirla.**

Esto implica:

- no introducir l??gica nueva de knowledge, templates o tool execution dentro de runtimes durante esta etapa
- usar archivos de runtime solo como fuente de lectura para detectar l??gica que debe extraerse o ser absorbida por plataforma
- considerar inv??lida cualquier soluci??n que mejore un runtime puntual pero deje sin resolver la fuente com??n de verdad

---

## 2. Qu?? ya qued?? hecho

## 2.1 Contrato com??n de entrada al runtime

Ya qued?? materializado en plataforma:

- `apps/api/src/core/fluxcore-types.ts`
  - `RuntimeInput`
  - `AuthorizedRuntimeContext`
  - `RuntimeServices`
  - `RuntimeToolExecutionResult`

Resultado:

- el runtime ya puede recibir contexto autorizado y servicios compartidos sin consultar infraestructura cruda directamente

## 2.2 Construcci??n platform-owned del `RuntimeInput`

Ya qued?? materializado:

- `apps/api/src/services/fluxcore/runtime-input-factory.service.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`

Resultado:

- el dispatcher ya no arma inline el wiring principal
- la orquestaci??n pas?? a depender de una pieza reutilizable y m??s cercana al canon

## 2.3 Base can??nica inicial de capabilities

Ya qued?? materializado:

- `apps/api/src/core/capabilities/index.ts`
- `apps/api/src/core/capabilities/knowledge.capability.ts`
- `apps/api/src/core/capabilities/templates.capability.ts`
- `apps/api/src/services/capability-registry.service.ts`
- `apps/api/src/services/capability-offer.service.ts`

Resultado:

- ya existe una definici??n m??s expl?­cita de capability con `id`, `slug`, `version`, `domain`, `kind`, `outputSchema` y `usageHints`
- ya existe una primera resoluci??n de offer por ejecuci??n concreta

## 2.4 Tool catalog transicional alineado parcialmente a la fuente can??nica

Ya qued?? materializado:

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

- el registry ya puede consumir definiciones desde la base can??nica
- ya ofrece `search_knowledge`, `list_available_templates` y `send_template` filtrados por autorizaci??n efectiva
- `capability-translation.service.ts` ya separa la traducci??n respecto del registro can??nico
- `capability-execution.service.ts` ya separa la ejecuci??n concreta respecto del cat??logo/offer
- `capability-deps-factory.service.ts` ya centraliza el wiring compartido de RAG/templates para evitar duplicaci??n
- el contrato can??nico ya soporta `translationStrategy` e `instructionBlock` reusable por capability
- `capability-instruction.service.ts` ya expone lectura centralizada de instruction blocks can??nicos
- `capability-argument-normalizer.service.ts` ya centraliza la normalizaci??n de argumentos reusable por capability
- `capability-openai-tool-response.service.ts` ya concentra el tool loop OpenAI-compatible para respuesta de tools
- `capability-openai-offer.service.ts` ya concentra la offer OpenAI-compatible usada por bridges legacy
- `capability-extra-instructions.service.ts` ya concentra el ensamblado reusable de instrucciones extra
- `capability-local-runtime-tools.service.ts` ya gobierna la offer/ejecuci??n can??nica consumida por `asistentes-local`
- `tool-registry.service.ts` sigue siendo transicional, pero ya no tiene consumers activos detectados; qued?? como artefacto de clase listo para retiro cuando convenga
- `openai-sync.service.ts` ya consume traducci??n can??nica para definir tools de asistentes OpenAI
- `capability-openai-compat.service.ts` ya concentra la compatibilidad OpenAI com??n para definici??n y ejecuci??n
- `ai-tools.service.ts` qued?? reducido a una fachada residual sin consumidores activos detectados en el ??rbol actual
- parte del legacy en `extensions/fluxcore-asistentes/src/tools/*` ya consume definiciones, instruction blocks y tool-loop can??nicos desde plataforma
- `extensions/fluxcore-asistentes/src/tools/registry.ts` ya no tiene consumers activos detectados y qued?? listo para retiro
- `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts` qued?? como wrapper residual sin consumers activos detectados
- `extensions/fluxcore-asistentes/src/prompt-utils.ts` qued?? reducido a compat wrapper puro sin consumers activos detectados
- `asistentes-local.runtime.ts` ya consume el bridge can??nico para tools y dej?? de ser owner de defs privadas, parser propio y transporte HTTP interno de RAG
- el guard local `ASISTENTES_LOCAL_TOOL_NAMES` preserva parity del runtime mientras la plataforma can??nica sigue siendo la fuente de verdad
- hoy ese guard evita exponer `list_available_templates` en `asistentes-local`, porque esa tool todav?­a no formaba parte de su contrato hist??rico
- `asistentes-openai.runtime.ts` ya toma identidad/reglas desde `authorizedContext` y estilo/instrucciones desde `runtimeConfig`, reduciendo drift de contexto dentro del runtime
- `runtime-style.service.ts` y `runtime-instruction-context.service.ts` extraen la resoluci??n de estilo y el armado de directivas/instrucciones autorizadas a la plataforma compartida
- `prompt-builder.service.ts` y ambos runtimes ahora consumen estas piezas compartidas, eliminando duplicaci??n de l??gica de estilo y atenci??n
- el recorte mec??nico del cambio qued?? documentado en `2026-03-26_asistentes-local-cutover-prep.md`

---

## 3. Qu?? falta para cerrar la consolidaci??n de plataforma

## 3.1 Pendiente cr?­tico P0-P1

### A. Eliminar la doble fuente de verdad viva de tools

Pendiente principal:

- `apps/api/src/services/ai-tools.service.ts` ya no debe tratarse como cat??logo primario y ahora sobrevive solo como fachada residual, lista para retiro cuando resulte seguro hacerlo

Trabajo requerido:

- terminar de clasificarlo como bridge transicional expl?­cito
- decidir si se retira o si se conserva como shim temporal

Estado actual de consumidores:

- no se detectaron consumidores activos restantes de `aiToolService` en el ??rbol actual luego de migrar:
  - `openai-sync.service.ts`
  - `extensions/fluxcore-asistentes-openai/src/index.ts`
  - `ai-orchestrator.tmp.ts`

### B. Separar con m??s pureza definici??n, offer y ejecuci??n

Pendiente principal:

- `tool-registry.service.ts` todav?­a mezcla responsabilidades

Trabajo requerido:

- mantener `capability-registry.service.ts` como fuente primaria de definici??n
- mantener `capability-offer.service.ts` como fuente primaria de autorizaci??n/oferta
- dejar `tool-registry.service.ts` como adapter/bridge transicional o degradarlo expl?­citamente

### C. Clasificar definiciones privadas todav?­a vivas en runtimes/extensiones

Pendiente principal:

- todav?­a siguen existiendo definiciones y ejecutores privados fuera de la plataforma can??nica

Trabajo requerido:

- usar `2026-03-26_runtime-private-tool-definition-inventory.md` como inventario operativo de esta deuda
- priorizar primero el legacy de `extensions/fluxcore-asistentes/src/tools/*`
- retirar f?­sicamente wrappers residuales de extensiones legacy cuando resulte seguro hacerlo
- seguir extrayendo a plataforma el armado reusable de instructions/contexto para runtimes remotos
- validar que los nuevos servicios compartidos de estilo e instrucciones cubran los casos de uso de todos los runtimes
- no reintroducir defs privadas o ejecutores privados dentro de runtimes

### C. Cerrar el modelo can??nico de command capability para templates

Pendiente principal:

- hoy `send_template` todav?­a conserva una transici??n h?­brida entre ejecuci??n mediada y efecto directo heredado

**ACTUALIZACI?“N (2026-04-01):**
- **RESUELTO en asistentes-local:** `send_template` fue removido de las herramientas ofrecidas al modelo
- **Protocolo unificado:** El modelo ahora habla `CALL_TEMPLATE` exclusivamente y el runtime lo traduce internamente a `send_template`
- **Observabilidad corregida:** Se agreg?? logging expl?­cito de las respuestas crudas del LLM (`logLLMCompletion`)

Trabajo requerido:

- fijar si la capability final ser?? `send_template` o `propose_send_template`
- hacer que el runtime exprese intenci??n declarativa y que la ejecuci??n final quede mediada por plataforma/`ExecutionAction`
- evitar que el contrato final dependa de side effects directos dentro de tool execution

### D. Cerrar RAG como query capability universal

Pendiente principal:

- aunque la capability ya existe en plataforma, todav?­a falta demostrar que gobierna realmente el consumo cross-runtime y reemplaza caminos privados heredados

Trabajo requerido:

- asegurar que `search_knowledge` sea la ??nica definici??n primaria
- eliminar dependencia futura de implementaciones privadas o transporte HTTP interno desde runtimes
- dejar el criterio de autorizaci??n y offer completamente gobernado por plataforma

---

## 4. Qu?? NO hay que hacer todav?­a

No hacer todav?­a:

- modificar `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts` salvo para lectura diagn??stica
- adaptar `Fluxi` a la nueva capa mientras sigan existiendo cat??logos paralelos o ambig??edad en command/query ownership
- retirar legacy por intuici??n sin demostrar parity funcional
- reintroducir tool defs privadas o fetches internos de RAG dentro de runtimes ya migrados

Raz??n:

- hacerlo ahora mover?­a el drift desde plataforma hacia cada runtime y volver?­a a multiplicar fuentes de verdad

---

## 5. Orden estricto recomendado para terminarlo

## Paso 1 â?? Cerrar cat??logo paralelo

Objetivo:

- clasificar y degradar `ai-tools.service.ts`

Resultado esperado:

- `ai-tools.service.ts` deja de definir tools primarias
- queda absorbido o marcado ??nicamente como bridge transicional de ejecuci??n

## Paso 2 â?? Terminar la separaci??n can??nica interna

Objetivo:

- dejar inequ?­voco qu?? servicio define, cu??l ofrece y cu??l solo traduce/ejecuta transicionalmente

Resultado esperado:

- definici??n: `capability-registry.service.ts`
- offer/autorizaci??n: `capability-offer.service.ts`
- traducci??n: `capability-translation.service.ts`
- ejecuci??n: `capability-execution.service.ts`
- wiring compartido de deps: `capability-deps-factory.service.ts`
- bridge/catalogaci??n transicional: `tool-registry.service.ts`

## Paso 3 â?? Cerrar templates como command capability coherente

Objetivo:

- dejar un contrato final consistente con `ExecutionAction[]`

Resultado esperado:

- command capability sin side effect directo ambiguo
- regla de mediaci??n documentada y trazable

## Paso 4 â?? Cerrar knowledge/RAG como query capability universal

Objetivo:

- demostrar que la capability de plataforma gobierna la consulta reusable

Resultado esperado:

- sin definiciones privadas runtime-owned
- sin HTTP interno como soluci??n estructural

## Paso 5 â?? Extender adopci??n runtime

Objetivo:

- extender el contrato com??n a m??s runtimes despu??s del primer cutover exitoso

Resultado esperado:

- `asistentes-local` ya adoptado
- `asistentes-openai`
- luego `Fluxi` si aplica a sus capacidades compartidas

---

## 6. Definici??n pr??ctica de terminado para esta consolidaci??n

La consolidaci??n puede considerarse suficientemente cerrada cuando se cumplan todos estos puntos:

- existe una sola fuente primaria para definir capabilities compartidas
- existe una sola fuente primaria para resolver offer/autorizaci??n por ejecuci??n
- `ai-tools.service.ts` dej?? de ser cat??logo sem??ntico paralelo
- `search_knowledge` qued?? resuelto como query capability platform-owned
- templates quedaron alineadas con command capability mediada por plataforma
- al menos un runtime ya consume la plataforma sin redefinir tools ni ejecutar RAG por camino privado
- el tracker y el plan de Fase 3 reflejan ese estado sin ambig??edad

---

## 7. Estimaci??n operativa de faltante

## 7.1 Para cerrar la consolidaci??n de plataforma despu??s del primer runtime adoptado

Estimaci??n razonable actual:

- **completado:** aproximadamente `55%` a `65%`
- **faltante:** aproximadamente `30%` a `40%`

Justificaci??n:

- el contrato com??n y el wiring principal ya existen
- ya hay registro y offer iniciales
- `ai-tools` ya fue degradado al punto de no tener consumidores activos detectados, pero todav?­a faltan los cierres de command model final para templates y el cierre universal de RAG
- `asistentes-local` ya dej?? de ser fuente privada de definici??n/ejecuci??n, pero persisten wrappers residuales en extensiones legacy inventariadas en `2026-03-26_runtime-private-tool-definition-inventory.md`
- parte de la sem??ntica reusable de prompting ya empez?? a moverse al contrato can??nico mediante `instructionBlock`, pero todav?­a falta que los bridges legacy la consuman desde plataforma

## 7.2 Para terminar todo el programa hasta adopci??n runtime + limpieza fuerte de legacy

Estimaci??n razonable actual:

- **completado:** aproximadamente `35%` a `45%`
- **faltante:** aproximadamente `55%` a `65%`

Justificaci??n:

- todav?­a quedan Fase 2 por validar formalmente, Fase 3 por cerrar realmente, y luego Fases 4 a 9
- la parte ya m??s encaminada es la disciplina arquitect??nica y la base de plataforma
- la parte todav?­a costosa es migraci??n productiva, parity cross-runtime y retiro ordenado de legacy

---

## 8. C??mo deber?­a continuar la pr??xima IA

Si la continuaci??n la toma otra IA, deber?­a seguir esta secuencia m?­nima:

1. leer `2026-03-25_fluxcore-execution-tracker.md`
2. leer `2026-03-25_phase-3-capabilities-platform-plan.md`
3. leer este documento completo
4. revisar estos archivos de c??digo:
   - `apps/api/src/core/fluxcore-types.ts`
   - `apps/api/src/core/capabilities/*`
   - `apps/api/src/services/capability-registry.service.ts`
   - `apps/api/src/services/capability-offer.service.ts`
   - `apps/api/src/services/tool-registry.service.ts`
   - `apps/api/src/services/ai-tools.service.ts`
   - `apps/api/src/services/fluxcore/runtime-input-factory.service.ts`
5. avanzar primero sobre plataforma y documentaci??n de transici??n
6. no tocar runtimes hasta que el cat??logo paralelo y el modelo final de capabilities queden m??s cerrados

---

## 9. Decisi??n registrada

Queda registrado que la prioridad operativa correcta para continuar FluxCore es:

- consolidar primero la plataforma com??n de capabilities y contexto autorizado
- usar los runtimes actuales como referencia de extracci??n, no como destino de nuevos parches funcionales
- abrir adopci??n runtime solo cuando la plataforma ya sea una fuente de verdad suficientemente estable

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
