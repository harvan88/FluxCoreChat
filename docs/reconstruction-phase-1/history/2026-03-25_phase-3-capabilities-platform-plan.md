# Plan operativo — Fase 3: Plataforma canónica de capabilities

**Fecha:** 2026-03-25
**Fase:** 3
**Estado:** ready
**Gate anterior:** Fase 2 todavía no validada; este documento prepara la ejecución pero no autoriza su apertura real.
**Objetivo principal:** consolidar una capa única, platform-owned y reusable de capabilities para todos los runtimes, eliminando duplicidad semántica entre tools, capabilities y bridges transicionales.

**Disciplina de ejecución vigente:** esta fase debe consolidar primero la plataforma común. La adaptación de runtimes queda explícitamente diferida hasta que esta base sea una fuente de verdad suficientemente estable.

---

## 1. Objetivo exacto de la fase

La Fase 3 no busca todavía completar la migración funcional de Templates ni de RAG como producto final.

Busca una sola cosa:

> **Instalar la plataforma canónica de capabilities como única fuente de verdad para la definición, oferta y traducción operativa de capacidades reusable por más de un runtime.**

Eso implica cerrar tres dimensiones:

- **definición canónica** de capability,
- **oferta autorizada** por ejecución,
- **traducción uniforme** hacia runtimes sin redefinir la capability por runtime.

### Regla de continuidad para esta fase

- los runtimes actuales se usan como fuente de lectura y validación de drift, no como destino principal de nuevos parches funcionales en esta etapa
- cualquier mejora que resuelva un runtime puntual pero deje sin cerrar la fuente común de verdad debe considerarse incompleta
- la guía operativa de continuidad vigente para ejecutar esta fase y su pre-fase es `2026-03-26_phase-3-platform-continuation-handoff.md`

---

## 2. Diagnóstico de partida

El repositorio ya contiene piezas valiosas, pero aún no forman una plataforma canónica única.

### 2.1 Activos positivos ya presentes

Se confirmó la existencia de material reutilizable en estos puntos:

- `apps/api/src/core/capabilities/knowledge.capability.ts`
  - define `search_knowledge` con schema y ejecución centralizada

- `apps/api/src/core/capabilities/templates.capability.ts`
  - define `send_template` y `list_available_templates`

- `apps/api/src/core/fluxcore-types.ts`
  - `RuntimeInput.services` ya insinúa una frontera compartida de capabilities/tools para runtimes
  - `ExecutionAction` ya formaliza la salida declarativa de los runtimes

- `apps/api/src/services/tool-registry.service.ts`
  - provee catálogo parcial y lógica de offer/authorization/execute para `search_knowledge` y `send_template`
  - pero sigue en modo transicional con dependencias placeholder y naming de tools heredado

- `apps/api/src/services/ai-tools.service.ts`
  - mantiene otro catálogo paralelo de tools, especialmente para templates

### 2.2 Base técnica ya materializada durante la preparación

Sin declarar apertura formal de Fase 3, la preparación ya dejó una primera base operativa en plataforma:

- `apps/api/src/core/fluxcore-types.ts`
  - `RuntimeInput` ya expone `authorizedContext`, `RuntimeServices` y un resultado explícito de ejecución de tools

- `apps/api/src/services/fluxcore/runtime-input-factory.service.ts`
  - la construcción de `RuntimeInput` ya quedó extraída a una pieza platform-owned
  - el dispatcher dejó de armar inline el contexto autorizado y el wiring compartido

- `apps/api/src/services/capability-registry.service.ts`
  - ya existe un primer registro canónico de capabilities detectadas en plataforma

- `apps/api/src/services/capability-translation.service.ts`
  - ya existe una pieza separada para traducir la definición canónica a tool schemas consumibles por bridges o runtimes

- `apps/api/src/services/capability-execution.service.ts`
  - ya existe una pieza separada para ejecutar capabilities sin mezclar esa responsabilidad con el catálogo

- `apps/api/src/services/capability-deps-factory.service.ts`
  - ya existe una pieza compartida para cablear dependencias reales de ejecución y evitar wiring duplicado

- `apps/api/src/services/capability-openai-compat.service.ts`
  - ya existe una pieza compartida para compatibilidad OpenAI sobre la base canónica de plataforma

- `apps/api/src/services/capability-instruction.service.ts`
  - ya existe una pieza compartida para exponer instruction blocks canónicos de capabilities

- `apps/api/src/services/capability-local-runtime-tools.service.ts`
  - ya existe una pieza de plataforma que prepara el cutover futuro de `asistentes-local` al contrato canónico sin tocar todavía el runtime

- `apps/api/src/services/capability-offer.service.ts`
  - ya existe una primera resolución de offer por ejecución concreta usando `runtimeConfig` + `authorizedContext`

- `apps/api/src/services/tool-registry.service.ts`
  - ya puede consumir definición canónica de capabilities y filtrar por autorización efectiva
  - sigue siendo transicional y ya no tiene consumers activos detectados en el código vivo

- `apps/api/src/services/ai-tools.service.ts`
  - ya quedó degradado a fachada residual sin consumers activos detectados en el árbol actual
  - dejó de ser la fuente primaria de definición o ejecución compatible para OpenAI

### 2.3 Huecos o conflictos detectados

- **`H1` — Más de una fuente de verdad para tools/capabilities**
  - hoy conviven al menos estas capas:
    - `core/capabilities/*`
    - `tool-registry.service.ts`
    - `ai-tools.service.ts`
    - definiciones privadas dentro de runtimes

- **`H2` — Drift de naming y contrato**
  - coexisten nombres como:
    - `search_knowledge`
    - `send_template`
    - `list_available_templates`
  - mientras el roadmap canónico apunta a una taxonomía más explícita de capabilities de plataforma, `command/query` ownership y estrategia de traducción (`tool`, `instruction`, `tool_and_instruction`)

- **`H3` — Mezcla entre definición y ejecución**
  - algunas piezas no solo describen la capability sino que ejecutan el efecto final o la simulación de tool directamente
  - esto es especialmente sensible para templates, que en el modelo final deben terminar mediadas por `ExecutionAction`

- **`H4` — Traducción runtime-specific todavía duplicada**
  - runtimes como `asistentes-local` todavía mantienen definiciones/tool schemas privadas en paralelo
  - eso impide afirmar que la plataforma ya ofrece un contrato único cross-runtime

- **`H5` — Deuda legacy residual**
  - persisten consumidores históricos y bridges de compatibilidad que no deben retirarse aún, pero sí quedar mapeados explícitamente como transicionales

- **`H6` — Base canónica instalada pero todavía no consumida por runtimes**
  - la plataforma ya puede resolver mejor contrato, offer y definición compartida
  - pero los runtimes activos todavía no dependen de esa base como única vía real de consumo

- **`H7` — Persisten definiciones privadas en runtimes/extensiones legacy**
  - el detalle operativo de esta deuda quedó inventariado en `2026-03-26_runtime-private-tool-definition-inventory.md`

---

## 3. Resultado de cierre esperado

La fase se considera exitosa si al final puede demostrarse esto:

- existe un **registro canónico** de capabilities de plataforma,
- existe una **resolución de oferta** por ejecución concreta,
- la descripción de una capability ya no vive duplicada en más de un sistema activo,
- al menos dos runtimes pueden consumir el mismo contrato sin redefinir manualmente sus tools,
- la plataforma diferencia de forma operativa `query` y `command`,
- y queda documentado qué piezas legacy siguen solo como compatibilidad transicional.

---

## 4. Alcance

## Incluye

- definición de `CapabilityDefinition` canónica
- definición de `CapabilityOffer` canónica
- servicio de registro de capabilities
- servicio de resolución de oferta por contexto/autorización
- traductor uniforme a schemas/bloques consumibles por runtimes
- inventario y clasificación de sistemas legacy/transicionales de tools
- documentación explícita de ownership plataforma vs runtime

## Excluye

- migración funcional final de Templates como command capability productivo
- migración funcional final de RAG como query capability universal validada
- retiro total de bridges legacy
- purificación final de todos los runtimes
- trace store persistente

---

## 5. Componentes/archivos candidatos

## Contratos y núcleo canónico

- `apps/api/src/core/fluxcore-types.ts`
- `apps/api/src/core/capabilities/*`
- nuevos archivos candidatos:
  - `apps/api/src/services/capability-registry.service.ts`
  - `apps/api/src/services/capability-offer.service.ts`
  - `apps/api/src/services/capability-translation.service.ts`

## Sistemas transicionales a absorber o alinear

- `apps/api/src/services/tool-registry.service.ts`
- `apps/api/src/services/ai-tools.service.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`

## Capabilities ya detectadas

- `apps/api/src/core/capabilities/knowledge.capability.ts`
- `apps/api/src/core/capabilities/templates.capability.ts`

---

## 6. Diseño objetivo de la fase

## 6.1 Contrato mínimo aceptado

Toda capability canónica debe preservar como mínimo:

- `id`
- `slug`
- `version`
- `domain`
- `kind`
- `description`
- `inputSchema`
- `outputSchema`
- `usageHints`
- `translationStrategy`

## 6.2 Regla de ownership

- la **plataforma** define capabilities reusable por más de un runtime
- el **runtime** decide si usar una capability ofrecida
- el **runtime** no redefine la capability como fuente primaria de verdad
- el **runtime** no ejecuta side effects finales fuera del contrato declarativo

## 6.3 Regla de clasificación

- `query`
  - consulta y retorna datos al runtime
  - no produce side effects externos finales

- `command`
  - expresa intención de efecto
  - su ejecución final debe quedar mediada por plataforma y/o `ExecutionAction`

## 6.4 Regla de traducción

La misma `CapabilityDefinition` debe poder convertirse, según el runtime consumidor, en:

- function/tool schema para runtimes con tool calling,
- instruction block o metadata estructurada para runtimes que no consuman el mismo formato nativo,
- oferta filtrada por autorización y contexto.

---

## 7. Tareas técnicas de la fase

## T1 — Definir contrato canónico de capability

- [x] definir `CapabilityDefinition`
- [x] definir `CapabilityOffer`
- [x] fijar los campos obligatorios y opcionales
- [x] fijar la semántica `query | command`

## T2 — Construir registro único de capabilities

- [x] mapear capabilities existentes en `core/capabilities/*`
- [ ] unificar naming y versionado
- [x] exponer resolución por ID/slug
- [ ] documentar capabilities transicionales que aún no cumplen el modelo final

## T3 — Construir resolución de oferta

- [ ] resolver offer por cuenta
- [x] resolver offer por runtime/assistant/canal
- [x] aplicar autorización real
- [x] dejar explícita la diferencia entre disponibilidad y ejecución

## T4 — Construir traducción uniforme para runtimes

- [x] generar schemas o bloques consumibles desde la misma definición
- [ ] evitar definiciones privadas duplicadas dentro de runtimes
- [x] dejar adapter/bridge temporal donde todavía haga falta

## T5 — Inventariar y degradar sistemas legacy/transicionales

- [x] clasificar `tool-registry.service.ts`
- [x] clasificar `ai-tools.service.ts`
- [x] clasificar tool definitions privadas de runtimes
- [ ] marcar qué queda absorbido, qué queda bridged y qué queda pendiente para fases 4-6

---

## 8. Checklist de aceptación

- [ ] existe `CapabilityDefinition` canónica
- [ ] existe `CapabilityOffer` canónica
- [ ] `query` y `command` quedan diferenciadas operativamente
- [ ] no existe más de una fuente de verdad activa para describir una capability
- [ ] al menos dos runtimes pueden consumir la misma capability definida por plataforma
- [ ] quedó inventariado el material legacy/transicional relacionado con tools
- [ ] quedó documentado qué se posterga a Fases 4, 5 y 6

---

## 9. Pruebas obligatorias

## 9.1 Estáticas / de inspección

### U1 — Unicidad de definición
- [ ] una capability puede encontrarse por un solo registro canónico
- [ ] no depende de definiciones privadas escondidas en más de un runtime

### U2 — Coherencia de offer
- [ ] la offer cambia por autorización/contexto y no por duplicidad de catálogos
- [ ] la misma capability puede ser ofrecida a más de un runtime sin redefinición semántica

## 9.2 Integración

### I1 — Traducción cross-runtime
- [ ] local consume capability desde la definición canónica
- [ ] OpenAI consume capability desde la misma definición o su traducción canónica

### I2 — Autorización
- [ ] una capability no autorizada no aparece en la offer
- [ ] una capability autorizada sí aparece con su forma traducida correcta

---

## 10. Evidencia requerida

- inventario de capabilities existentes y su clasificación
- diff de servicios canónicos creados o refactorizados
- ejemplos de offer por escenario
- evidencia de traducción uniforme para más de un runtime
- registro explícito de deuda legacy/transicional remanente

---

## 11. Riesgos y decisiones anticipadas

- **`R1`**
  - `tool-registry.service.ts` ya quedó menos mezclado que al inicio, ya no tiene consumers activos detectados y no debe volver a convertirse en fuente primaria de ejecución o definición

- **`R2`**
  - `ai-tools.service.ts` ya quedó sin consumidores activos detectados, pero todavía debe decidirse si se retira formalmente o si se conserva temporalmente como shim

- **`R3`**
  - `templates.capability.ts` y piezas afines aún no representan por sí solas el modelo final de command capability mediada; esa consolidación corresponde a Fase 4

- **`R4`**
  - `RuntimeInput.services` ya quedó más explícito y el bridge canónico ya fue adoptado por `asistentes-local`, pero todavía falta demostrar adopción cross-runtime más allá de este primer runtime

- **`R5`**
  - la deuda principal ya no está en `asistentes-local.runtime.ts`; ahora se concentra en wrappers y bridges residuales de `extensions/fluxcore-asistentes/src/tools/*`

- **`R6`**
  - `asistentes-local` ya consume el bridge canónico con guard de parity local, pero todavía falta decidir cuándo retirar ese guard y extender la adopción a más runtimes

---

## 12. Criterio de salida

La Fase 3 estará lista para cierre cuando la plataforma pueda definir y ofrecer capabilities a múltiples runtimes sin redefinirlas por runtime, sin mezclar ownership y sin dejar más de una fuente de verdad activa para su descripción.

Si eso no queda demostrado, no se habilita Fase 4.

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
