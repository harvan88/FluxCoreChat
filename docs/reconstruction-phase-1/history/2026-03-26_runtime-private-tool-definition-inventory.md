# Inventario operativo â?? definiciones privadas de tools/capabilities fuera de la plataforma can??nica

**Fecha:** 2026-03-26
**Estado:** inventario vigente
**Prop??sito:** dejar expl?­cito qu?? definiciones, parsers o ejecutores de capabilities siguen viviendo fuera de la capa can??nica de plataforma, para guiar la siguiente etapa de extracci??n sin tocar todav?­a los runtimes como destino de cambios funcionales.

---

## 1. Regla de lectura de este inventario

Este documento **no autoriza** modificar runtimes inmediatamente.

Su funci??n es:

- identificar duplicaciones todav?­a activas
- clasificar su ownership correcto
- indicar prioridad de extracci??n
- dejar claro qu?? debe moverse primero a plataforma y qu?? puede esperar a la fase de adopci??n runtime

---

## 2. Piezas inventariadas

## A. `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`

### Qu?? sigue viviendo ah?­

- tool loop del modelo y ensamblado de mensajes `tool`
- guard local de parity `ASISTENTES_LOCAL_TOOL_NAMES`
- consumo de `promptBuilder` como adaptaci??n final del runtime

### Drift espec?­fico

- ya no redefine tools que existen en plataforma
- ya no mantiene transporte HTTP interno para RAG
- ya no conserva parser/dispatcher privado ni traducci??n propia de `send_template`
- **consolidado (2026-04-01):** `send_template` fue removido de `ASISTENTES_LOCAL_TOOL_NAMES` y el prompt ahora instruye `CALL_TEMPLATE` exclusivamente
- conserva un guard de parity local mientras el cat??logo can??nico sigue siendo la fuente primaria

### Ownership correcto

- definici??n de tool/capability: **plataforma**
- autorizaci??n/offer: **plataforma**
- ejecuci??n query/command compartida: **plataforma**
- tool loop del modelo: **runtime**

### Prioridad

- **P1**

### Decisi??n recomendada

- tratar este runtime como **adoptado** al bridge can??nico, no como fuente privada de definici??n/ejecuci??n
- conservar temporalmente `ASISTENTES_LOCAL_TOOL_NAMES` mientras se valida parity funcional
- usar `2026-03-26_asistentes-local-cutover-prep.md` como registro del recorte aplicado y gu?­a de cleanup posterior

---

## B. `extensions/fluxcore-asistentes/src/tools/registry.ts`

### Qu?? sigue viviendo ah?­

- wrapper residual de compatibilidad OpenAI-compatible
- no se detectaron consumers activos restantes despu??s del recableado actual

### Drift espec?­fico

- ya consume offer OpenAI-compatible desde plataforma
- ya consume el tool loop OpenAI-compatible desde plataforma
- ya no tiene consumers activos detectados
- qued?? listo para retiro cuando se quiera hacer cleanup f?­sico seguro

### Ownership correcto

- definici??n: **plataforma**
- traducci??n OpenAI-compatible: **plataforma**
- ejecuci??n compartida: **plataforma**
- compatibilidad residual de extensi??n: **bridge transicional**

### Prioridad

- **P1**

### Decisi??n recomendada

- no seguir agregando tools nuevas aqu?­
- tratarlo como archivo residual listo para retiro cuando convenga

---

## C. `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts`

### Qu?? sigue viviendo ah?­

- wrapper m?­nimo de reexport hacia assets can??nicos
- no se detectaron consumers activos restantes del archivo despu??s del recableado actual

### Drift espec?­fico

- ya consume definici??n e `instructionBlock` can??nicos
- no conserva parser propio ni ejecuci??n propia
- todav?­a conserva un wrapper residual en la extensi??n

### Ownership correcto

- definici??n de capability/tool: **plataforma**
- instruction block reusable de capability: **plataforma**
- adaptaci??n final de prompt por runtime: **runtime/bridge**, pero consumiendo material can??nico

### Prioridad

- **P1**

### Decisi??n recomendada

- considerar este archivo listo para retiro cuando se haga cleanup seguro
- no reintroducir ensamblado reusable de instrucciones aqu?­

### Decisi??n recomendada

- considerar este archivo listo para retiro cuando se quiera hacer cleanup seguro
- no volver a introducir sem??ntica nueva aqu?­

---

## D. `extensions/fluxcore-asistentes/src/prompt-utils.ts`

### Qu?? sigue viviendo ah?­

- compat wrapper puro hacia `capability-extra-instructions.service.ts`
- helper residual sin consumers activos detectados

### Drift espec?­fico

- la sem??ntica reusable ya se movi?? a `capability-extra-instructions.service.ts`
- este archivo ya no conserva l??gica propia; qued?? como remanente de compatibilidad sin uso activo

### Ownership correcto

- instruction block reusable: **plataforma**
- composici??n final del prompt legacy: **bridge/runtime**

### Prioridad

- **P1**

---

## E. `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`

### Qu?? sigue viviendo ah?­

- no redefine tools privadas en el archivo le?­do
- delega la ejecuci??n remota a `openai-sync.service.ts`
- construye instructions override combinando `authorizedContext` + `runtimeConfig`

### Drift espec?­fico

- no exhibe hoy la misma duplicaci??n de cat??logo/ejecuci??n que `asistentes-local`
- ya no depende de resoluci??n privada de business identity/contact rules dentro del runtime
- su deuda principal ya no es cat??logo, sino seguir cerrando la compatibilidad OpenAI sobre la base can??nica y decidir si el armado de instructions debe extraerse a plataforma

### Ownership correcto

- sem??ntica del runtime remoto: **runtime**
- definitions/compatibilidad shared: **plataforma**

### Prioridad

- **P1-P2**

---

## F. `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts`

### Qu?? sigue viviendo ah?­

- runtime soberano con modelo WorkDefinitions/FSM/slots, no basado en tools LLM tradicionales
- no consume `authorizedContext` hoy; depende de `policyContext` y `runtimeConfig.workDefinitions`
- usa LLM solo para interpretaci??n de intenci??n y conversaci??n de fallback

### Drift espec?­fico

- su modelo es distinto al de `asistentes-local`/`asistentes-openai`; no expone tools al LLM sino interpreta para Works
- todav?­a no usa el contexto autorizado unificado (businessProfile, contactRules)
- su deuda principal es alinearse al contrato `authorizedContext` y consumir piezas compartidas de estilo/instrucciones si aplica

### Ownership correcto

- definici??n de WorkDefinitions: **runtime**
- contexto de negocio/identidad: **deber?­a ser plataforma (authorizedContext)**

### Prioridad

- **P2** (diferente modelo; evaluar despu??s de consolidar runtimes LLM)

---

## 3. Estado actual resumido

## Ya absorbido o casi absorbido en plataforma

- registro can??nico: `capability-registry.service.ts`
- traducci??n: `capability-translation.service.ts`
- ejecuci??n compartida: `capability-execution.service.ts`
- wiring compartido: `capability-deps-factory.service.ts`
- compatibilidad OpenAI compartida: `capability-openai-compat.service.ts`
- tool loop OpenAI-compatible compartido: `capability-openai-tool-response.service.ts`
- ensamblado reusable de instrucciones: `capability-extra-instructions.service.ts`
- `ai-tools.service.ts` ya qued?? como fachada residual sin consumidores activos detectados en el ??rbol actual despu??s de la migraci??n hecha hoy
- parte de la sem??ntica reusable de `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts` y `extensions/fluxcore-asistentes/src/tools/registry.ts` ya pas?? a consumir la plataforma can??nica

## Todav?­a duplicado fuera de plataforma

- **CONSOLIDADO:** `asistentes-local.runtime.ts` ya es puro y limpio respecto a la plataforma.
- **CONSOLIDADO:** `asistentes-openai.runtime.ts` ya es mediado y retornas acciones declarativas.
- **ELIMINADO:** wrappers residuales en `extensions/fluxcore-asistentes` y servicios legacy en `apps/api`.
- **CONSOLIDADO (2026-04-01):** `send_template` ahora es una Command Capability pura sin side effects directos ambiguos. En `asistentes-local` el modelo habla `CALL_TEMPLATE` y el runtime lo traduce a `send_template` internamente.

---

## 4. Orden recomendado para el siguiente tramo

1. retirar o archivar `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts` y `extensions/fluxcore-asistentes/src/prompt-utils.ts` cuando convenga hacer cleanup seguro
2. decidir si `extensions/fluxcore-asistentes/src/tools/registry.ts` se conserva como shim m?­nimo o se retira
3. mantener temporalmente `ASISTENTES_LOCAL_TOOL_NAMES` hasta decidir si `list_available_templates` entra o no al contrato de `asistentes-local`
4. usar `asistentes-openai.runtime.ts` como siguiente candidato de adopci??n cuando el cleanup residual quede estable

---

## 5. Criterio de cierre de este inventario

Esta l?­nea de trabajo puede considerarse suficientemente cerrada cuando:

- las definiciones de `search_knowledge`, `send_template` y `list_available_templates` ya no vivan activamente en más de un sistema operativo real
- **HECHO (2026-04-01):** `send_template` ya no es ofrecido como tool a `asistentes-local`, solo `CALL_TEMPLATE` como gatillo textual
- la compatibilidad OpenAI use exclusivamente la base canónica de plataforma
- `asistentes-local.runtime.ts` deje de ejecutar knowledge/templates con definiciones privadas
- las extensiones legacy queden bridged o deprecadas explícitamente

---

## ?? Gobernanza de Documentación Exhaustiva (Canon §7.0)

Según el estándar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentación técnica sincronizada con la implementación real exclusivamente en docs/reconstruction-phase-1/exhaustive-mapping/.

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
