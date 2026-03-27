# Inventario operativo — definiciones privadas de tools/capabilities fuera de la plataforma canónica

**Fecha:** 2026-03-26
**Estado:** inventario vigente
**Propósito:** dejar explícito qué definiciones, parsers o ejecutores de capabilities siguen viviendo fuera de la capa canónica de plataforma, para guiar la siguiente etapa de extracción sin tocar todavía los runtimes como destino de cambios funcionales.

---

## 1. Regla de lectura de este inventario

Este documento **no autoriza** modificar runtimes inmediatamente.

Su función es:

- identificar duplicaciones todavía activas
- clasificar su ownership correcto
- indicar prioridad de extracción
- dejar claro qué debe moverse primero a plataforma y qué puede esperar a la fase de adopción runtime

---

## 2. Piezas inventariadas

## A. `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`

### Qué sigue viviendo ahí

- tool loop del modelo y ensamblado de mensajes `tool`
- guard local de parity `ASISTENTES_LOCAL_TOOL_NAMES`
- consumo de `promptBuilder` como adaptación final del runtime

### Drift específico

- ya no redefine tools que existen en plataforma
- ya no mantiene transporte HTTP interno para RAG
- ya no conserva parser/dispatcher privado ni traducción propia de `send_template`
- conserva un guard de parity local mientras el catálogo canónico sigue siendo la fuente primaria

### Ownership correcto

- definición de tool/capability: **plataforma**
- autorización/offer: **plataforma**
- ejecución query/command compartida: **plataforma**
- tool loop del modelo: **runtime**

### Prioridad

- **P1**

### Decisión recomendada

- tratar este runtime como **adoptado** al bridge canónico, no como fuente privada de definición/ejecución
- conservar temporalmente `ASISTENTES_LOCAL_TOOL_NAMES` mientras se valida parity funcional
- usar `2026-03-26_asistentes-local-cutover-prep.md` como registro del recorte aplicado y guía de cleanup posterior

---

## B. `extensions/fluxcore-asistentes/src/tools/registry.ts`

### Qué sigue viviendo ahí

- wrapper residual de compatibilidad OpenAI-compatible
- no se detectaron consumers activos restantes después del recableado actual

### Drift específico

- ya consume offer OpenAI-compatible desde plataforma
- ya consume el tool loop OpenAI-compatible desde plataforma
- ya no tiene consumers activos detectados
- quedó listo para retiro cuando se quiera hacer cleanup físico seguro

### Ownership correcto

- definición: **plataforma**
- traducción OpenAI-compatible: **plataforma**
- ejecución compartida: **plataforma**
- compatibilidad residual de extensión: **bridge transicional**

### Prioridad

- **P1**

### Decisión recomendada

- no seguir agregando tools nuevas aquí
- tratarlo como archivo residual listo para retiro cuando convenga

---

## C. `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts`

### Qué sigue viviendo ahí

- wrapper mínimo de reexport hacia assets canónicos
- no se detectaron consumers activos restantes del archivo después del recableado actual

### Drift específico

- ya consume definición e `instructionBlock` canónicos
- no conserva parser propio ni ejecución propia
- todavía conserva un wrapper residual en la extensión

### Ownership correcto

- definición de capability/tool: **plataforma**
- instruction block reusable de capability: **plataforma**
- adaptación final de prompt por runtime: **runtime/bridge**, pero consumiendo material canónico

### Prioridad

- **P1**

### Decisión recomendada

- considerar este archivo listo para retiro cuando se haga cleanup seguro
- no reintroducir ensamblado reusable de instrucciones aquí

### Decisión recomendada

- considerar este archivo listo para retiro cuando se quiera hacer cleanup seguro
- no volver a introducir semántica nueva aquí

---

## D. `extensions/fluxcore-asistentes/src/prompt-utils.ts`

### Qué sigue viviendo ahí

- compat wrapper puro hacia `capability-extra-instructions.service.ts`
- helper residual sin consumers activos detectados

### Drift específico

- la semántica reusable ya se movió a `capability-extra-instructions.service.ts`
- este archivo ya no conserva lógica propia; quedó como remanente de compatibilidad sin uso activo

### Ownership correcto

- instruction block reusable: **plataforma**
- composición final del prompt legacy: **bridge/runtime**

### Prioridad

- **P1**

---

## E. `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`

### Qué sigue viviendo ahí

- no redefine tools privadas en el archivo leído
- delega la ejecución remota a `openai-sync.service.ts`
- construye instructions override combinando `authorizedContext` + `runtimeConfig`

### Drift específico

- no exhibe hoy la misma duplicación de catálogo/ejecución que `asistentes-local`
- ya no depende de resolución privada de business identity/contact rules dentro del runtime
- su deuda principal ya no es catálogo, sino seguir cerrando la compatibilidad OpenAI sobre la base canónica y decidir si el armado de instructions debe extraerse a plataforma

### Ownership correcto

- semántica del runtime remoto: **runtime**
- definitions/compatibilidad shared: **plataforma**

### Prioridad

- **P1-P2**

---

## F. `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts`

### Qué sigue viviendo ahí

- runtime soberano con modelo WorkDefinitions/FSM/slots, no basado en tools LLM tradicionales
- no consume `authorizedContext` hoy; depende de `policyContext` y `runtimeConfig.workDefinitions`
- usa LLM solo para interpretación de intención y conversación de fallback

### Drift específico

- su modelo es distinto al de `asistentes-local`/`asistentes-openai`; no expone tools al LLM sino interpreta para Works
- todavía no usa el contexto autorizado unificado (businessProfile, contactRules)
- su deuda principal es alinearse al contrato `authorizedContext` y consumir piezas compartidas de estilo/instrucciones si aplica

### Ownership correcto

- definición de WorkDefinitions: **runtime**
- contexto de negocio/identidad: **debería ser plataforma (authorizedContext)**

### Prioridad

- **P2** (diferente modelo; evaluar después de consolidar runtimes LLM)

---

## 3. Estado actual resumido

## Ya absorbido o casi absorbido en plataforma

- registro canónico: `capability-registry.service.ts`
- traducción: `capability-translation.service.ts`
- ejecución compartida: `capability-execution.service.ts`
- wiring compartido: `capability-deps-factory.service.ts`
- compatibilidad OpenAI compartida: `capability-openai-compat.service.ts`
- tool loop OpenAI-compatible compartido: `capability-openai-tool-response.service.ts`
- ensamblado reusable de instrucciones: `capability-extra-instructions.service.ts`
- `ai-tools.service.ts` ya quedó como fachada residual sin consumidores activos detectados en el árbol actual después de la migración hecha hoy
- parte de la semántica reusable de `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts` y `extensions/fluxcore-asistentes/src/tools/registry.ts` ya pasó a consumir la plataforma canónica

## Todavía duplicado fuera de plataforma

- **CONSOLIDADO:** `asistentes-local.runtime.ts` ya es puro y limpio respecto a la plataforma.
- **CONSOLIDADO:** `asistentes-openai.runtime.ts` ya es mediado y retornas acciones declarativas.
- **ELIMINADO:** wrappers residuales en `extensions/fluxcore-asistentes` y servicios legacy en `apps/api`.
- **MEDIADO:** `send_template` ahora es una Command Capability pura sin side effects directos ambiguos.

---

## 4. Orden recomendado para el siguiente tramo

1. retirar o archivar `extensions/fluxcore-asistentes/src/tools/search-knowledge.ts` y `extensions/fluxcore-asistentes/src/prompt-utils.ts` cuando convenga hacer cleanup seguro
2. decidir si `extensions/fluxcore-asistentes/src/tools/registry.ts` se conserva como shim mínimo o se retira
3. mantener temporalmente `ASISTENTES_LOCAL_TOOL_NAMES` hasta decidir si `list_available_templates` entra o no al contrato de `asistentes-local`
4. usar `asistentes-openai.runtime.ts` como siguiente candidato de adopción cuando el cleanup residual quede estable

---

## 5. Criterio de cierre de este inventario

Esta línea de trabajo puede considerarse suficientemente cerrada cuando:

- las definiciones de `search_knowledge`, `send_template` y `list_available_templates` ya no vivan activamente en más de un sistema operativo real
- la compatibilidad OpenAI use exclusivamente la base canónica de plataforma
- `asistentes-local.runtime.ts` deje de ejecutar knowledge/templates con definiciones privadas
- las extensiones legacy queden bridged o deprecadas explícitamente

---

## ?? Gobernanza de Documentaci�n Exhaustiva (Canon �7.0)

Seg�n el est�ndar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentaci�n t�cnica sincronizada con la implementaci�n real exclusivamente en `docs/reconstruction-phase-1/exhaustive-mapping/`. 

- **Soberan�a de C�digo:** Ning�n cambio en el Kernel o Runtimes se considera "Terminado" (Done) sin su correspondiente actualizaci�n en el Landscape del Backend o UI bajo los esquemas de Tiers definidos.
- **Prohibici�n de Basura:** Todo documento fuera de la carpeta oficial (incluyendo este archivo temporal) se considera transitorio y debe ser purgado o consolidado una vez validada la fase.
- **Actualizaci�n Continua:** La documentaci�n es un componente vivo del sistema y el monitor de calidad (`DocumentationQualityPanel`) es el �nico juez de la cobertura real.

---
## ?? Gobernanza de Documentaci�n Exhaustiva (Canon �7.0)

Seg�n el est�ndar establecido en **00-STANDARD.md**, es **obligatorio** mantener la documentaci�n t�cnica sincronizada con la implementaci�n real exclusivamente en docs/reconstruction-phase-1/exhaustive-mapping/.

- **Soberan�a de C�digo:** Ning�n cambio en el Kernel o Runtimes se considera "Terminado" (Done) sin su correspondiente actualizaci�n en el Landscape del Backend o UI bajo los esquemas de Tiers definidos.
- **Prohibici�n de Basura:** Todo documento fuera de la carpeta oficial (incluyendo este archivo temporal) se considera transitorio y debe ser purgado o consolidado una vez validada la fase.
- **Actualizaci�n Continua:** La documentaci�n es un componente vivo del sistema y el monitor de calidad (DocumentationQualityPanel) es el �nico juez de la cobertura real.
---
