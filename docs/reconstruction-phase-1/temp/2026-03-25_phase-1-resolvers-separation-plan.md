# Plan operativo — Fase 1: Separación de resolvers centrales

**Fecha:** 2026-03-25
**Fase:** 1
**Estado:** ready
**Gate anterior:** Fase 0 aceptada para planificación
**Objetivo principal:** separar en forma operativa y verificable las tres dimensiones que hoy están mezcladas:
- negocio autorizado
- estrategia de runtime
- composición técnica de ejecución

---

## 1. Objetivo exacto de la fase

La Fase 1 no busca todavía migrar templates, RAG ni reescribir runtimes.

Busca una sola cosa:

> **Asegurar que el pipeline cognitivo resuelva por separado `PolicyContext`, `RuntimeSelection` y `RuntimeComposition`, sin múltiples fuentes efectivas de verdad para la misma dimensión.**

Si esto no se estabiliza primero, las fases posteriores se construirán sobre una base ambigua.

---

## 2. Problema que esta fase corrige

Hoy el sistema presenta señales claras de mezcla entre capas:

- `FluxPolicyContextService` participa de más de una responsabilidad
- `CognitiveDispatcher` re-resuelve runtime por vías distintas
- `resolveActiveAssistant()` convive con overrides/configs que todavía pueden interferir
- el runtime local puede terminar consumiendo datos de negocio y de composición técnica provenientes de fuentes no alineadas

Resultado:
- doble fuente de verdad
- debugging difícil
- prompts inconsistentes
- imposibilidad de endurecer capacidades cross-runtime de forma segura

---

## 3. Resultado de cierre esperado

La fase se considera exitosa si al final del trabajo podemos demostrar esto:

- **`PolicyContext`** sale de un resolver dedicado y contiene solo negocio autorizado
- **`RuntimeSelection`** sale de un resolver dedicado y decide una única estrategia por cuenta
- **`RuntimeComposition`** sale de un resolver dedicado y compone técnicamente la ejecución concreta
- `CognitiveDispatcher` consume esas tres piezas sin volver a resolverlas por caminos paralelos
- la ejecución cognitiva deja trazas suficientes para demostrar qué entidad decidió qué cosa

---

## 4. Alcance

## Incluye

- diseño/creación o refactor de resolvers separados
- ajuste del dispatcher para consumirlos en secuencia
- eliminación o aislamiento de duplicidades evidentes de resolución
- endurecimiento semántico de tipos/contratos relacionados
- pruebas unitarias, integración y manuales de routing cognitivo

## Excluye

- migración funcional de templates
- migración funcional de RAG
- refactor profundo de capabilities
- retiro de legacy global
- purificación completa de Fluxi

---

## 5. Componentes/archivos candidatos

## Servicios directamente implicados

- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/runtime-config.service.ts`
- `apps/api/src/services/fluxcore/runtime.service.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/core/fluxcore-types.ts`

## Servicios probablemente relacionados

- `apps/api/src/services/flux-runtime-config.service.ts`
- `apps/api/src/services/fluxcore.service.ts`
- `apps/api/src/workers/cognition-worker.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts`

## Archivos de soporte para validación

- tests o scripts de flujo cognitivo existentes
- documentación temporal de análisis ya generada

---

## 6. Diseño objetivo de la fase

## 6.1 Resolver 1 — `PolicyContextResolver`

### Responsabilidad

Resolver solamente el contexto de negocio autorizado.

### Debe devolver

- `accountId`
- `conversationId`
- sujeto/contacto/relación
- business profile autorizado
- constraints de negocio
- recursos autorizados de negocio

### No debe devolver

- runtime config
- provider/model
- assistant composition
- vectorStoreIds técnicos

---

## 6.2 Resolver 2 — `RuntimeSelectionResolver`

### Responsabilidad

Resolver la estrategia activa por cuenta.

### Debe devolver

- `strategy: fluxi | assistants`
- `state: active | inactive`
- razón cuando aplique

### Regla crítica

Debe existir una única respuesta efectiva por cuenta.

---

## 6.3 Resolver 3 — `RuntimeCompositionResolver`

### Responsabilidad

Transformar `RuntimeSelection` en la composición técnica concreta a invocar.

### Debe devolver

- `runtimeId`
- `assistantId?`
- `provider?`
- `model?`
- settings técnicos
- vector stores / bindings cuando aplique

### Regla crítica

No debe reinyectar lógica de negocio propia de `PolicyContext`.

---

## 6.4 Dispatcher objetivo

El dispatcher debe operar con esta secuencia:

```text
1. Resolver PolicyContext
2. Resolver RuntimeSelection
3. Si state = inactive → cierre controlado
4. Resolver RuntimeComposition
5. Construir RuntimeInput final
6. Invocar RuntimeGateway
7. Ejecutar acciones
```

### Regla

El dispatcher no debe volver a consultar en paralelo otra fuente para la misma dimensión ya resuelta.

---

## 7. Tareas técnicas de la fase

## T1 — Tipar semánticamente las tres dimensiones

- [ ] definir o endurecer tipos de `PolicyContext`
- [ ] definir o endurecer tipos de `RuntimeSelection`
- [ ] definir o endurecer tipos de `RuntimeComposition`
- [ ] marcar semánticamente fronteras de uso

## T2 — Extraer o separar resolver de negocio

- [ ] aislar la parte de negocio de `flux-policy-context.service.ts`
- [ ] eliminar del contrato de salida toda mezcla con runtime config
- [ ] documentar inputs mínimos requeridos por negocio

## T3 — Consolidar resolver de estrategia

- [ ] identificar SSOT real de selección por cuenta
- [ ] encapsular decisión de estrategia activa
- [ ] definir comportamiento explícito para `inactive`

## T4 — Consolidar resolver de composición técnica

- [ ] encapsular resolución de assistant activo cuando aplique
- [ ] encapsular provider/model/runtimeId
- [ ] eliminar re-resoluciones ad hoc desde dispatcher

## T5 — Reescribir el uso del dispatcher

- [ ] usar resolvers en secuencia fija
- [ ] eliminar shadowing de variables y resoluciones duplicadas
- [ ] garantizar trazabilidad de cada decisión

## T6 — Verificar consumidores laterales

- [ ] identificar call sites afectados
- [ ] asegurar que runtimes consumen el input correcto
- [ ] aislar cualquier dependencia legacy que aún espere contratos mezclados

---

## 8. Checklist de aceptación

- [ ] `PolicyContext` ya no devuelve runtime config
- [ ] existe una única vía central para resolver estrategia por cuenta
- [ ] existe una única vía central para componer runtime técnico
- [ ] `CognitiveDispatcher` no re-resuelve runtime por caminos paralelos
- [ ] el modo `inactive` tiene ruta explícita y verificable
- [ ] la ruta `assistants` resuelve una composición técnica consistente
- [ ] la ruta `fluxi` resuelve una composición técnica consistente
- [ ] se eliminaron o aislaron duplicidades críticas detectadas
- [ ] hay trazas suficientes para demostrar qué resolver decidió cada dimensión

---

## 9. Pruebas obligatorias

## 9.1 Unitarias

### U1 — `PolicyContextResolver`
- [ ] devuelve solo negocio autorizado
- [ ] no incluye config técnica

### U2 — `RuntimeSelectionResolver`
- [ ] devuelve `assistants` cuando corresponde
- [ ] devuelve `fluxi` cuando corresponde
- [ ] devuelve `inactive` cuando corresponde

### U3 — `RuntimeCompositionResolver`
- [ ] compone runtime correcto para `assistants`
- [ ] compone runtime correcto para `fluxi`
- [ ] no mezcla negocio con técnica

---

## 9.2 Integración

### I1 — Cuenta `assistants`
- [ ] flujo cognitivo selecciona `assistants`
- [ ] compone runtime correcto
- [ ] llega al runtime sin fuentes duplicadas

### I2 — Cuenta `fluxi`
- [ ] flujo cognitivo selecciona `fluxi`
- [ ] compone runtime correcto
- [ ] llega a Fluxi sin ambigüedad de estrategia

### I3 — Cuenta `inactive`
- [ ] flujo cognitivo no ejecuta automatización
- [ ] el cierre es controlado y trazable

---

## 9.3 Manuales

### M1 — Reconstrucción de una ejecución `assistants`
- [ ] identificar de dónde salió `PolicyContext`
- [ ] identificar de dónde salió `RuntimeSelection`
- [ ] identificar de dónde salió `RuntimeComposition`

### M2 — Reconstrucción de una ejecución `fluxi`
- [ ] mismo ejercicio con evidencia completa

### M3 — Error controlado
- [ ] si una resolución falla, queda claro qué resolver falló

---

## 9.4 Regresión

### R1 — Flujo sano previo
- [ ] la ruta cognitiva actual no pierde la capacidad de responder en escenarios ya soportados

### R2 — No regresión de cierre de turno
- [ ] el turno sigue cerrando correctamente cuando corresponde

---

## 10. Evidencia requerida

La fase no puede cerrarse sin evidencia de los siguientes artefactos:

- resultados de tests unitarios
- resultados de tests de integración
- ejemplos de trazas o logs reconstruibles
- diff o inventario de servicios afectados
- nota de riesgos/hallazgos no previstos encontrados durante la fase

---

## 11. Hallazgos no previstos que bloquean la fase

La fase se congela si aparece cualquiera de estos casos:

- descubrimiento de una cuarta fuente efectiva de verdad para runtime
- inconsistencia seria entre account config y assistant resolution
- imposibilidad de representar `inactive` sin romper contratos existentes
- dependencia legacy imposible de aislar sin rediseño mayor
- pérdida de trazabilidad en la ruta cognitiva

---

## 12. Riesgos esperados

- **`R1`**
  - consumidores secundarios que hoy dependan del contrato mezclado

- **`R2`**
  - presencia de overrides legacy como `preferredAssistantId`

- **`R3`**
  - confusión entre runtime strategy y runtimeId concreto

- **`R4`**
  - prompts o runtimes que hoy asuman datos de negocio y técnica en la misma estructura

---

## 13. Criterio de salida

La Fase 1 se considera cerrada únicamente cuando esta afirmación sea demostrablemente verdadera:

> En una ejecución cognitiva dada, puede identificarse sin ambigüedad qué servicio resolvió el negocio autorizado, cuál resolvió la estrategia de runtime y cuál compuso la ejecución técnica, sin fuentes paralelas para la misma decisión.

---

## 14. Condición para habilitar Fase 2

Solo se habilita Fase 2 si:
- la checklist de esta fase está completa
- las pruebas obligatorias están aprobadas
- existe evidencia suficiente de trazabilidad
- no hay hallazgos bloqueantes abiertos

---

## 15. Estado final de esta entrega

- **Documento:** creado
- **Estado:** ready
- **Siguiente acción autorizada:** iniciar ejecución controlada de Fase 1 cuando se decida comenzar trabajo sobre código
