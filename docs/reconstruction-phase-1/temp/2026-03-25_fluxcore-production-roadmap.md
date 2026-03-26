# Roadmap técnico de producción — FluxCore Cognitive Platform

**Fecha:** 2026-03-25
**Estado:** roadmap técnico ejecutable
**Propósito:** llevar la capa cognitiva de FluxCore a un estado de producción con validación empírica fase por fase, sin abrir nuevas etapas sin evidencia de cierre de la anterior.

---

## 1. Objetivo del roadmap

Este documento define:
- la **especificación técnica objetivo**,
- la **secuencia de implementación**,
- la **lista checkeable de entregables**,
- el **control de avances previstos y no previstos**,
- y las **pruebas obligatorias de validación** para avanzar de forma segura.

La regla principal es:

> **No se inicia una fase nueva hasta que la fase actual esté validada empíricamente y tenga evidencia registrada.**

---

## 2. Principios no negociables

- **`PolicyContext` solo contiene contexto de negocio autorizado**
  - identidad, relación, datos biográficos relevantes, contexto autorizado
  - no contiene configuración técnica de IA
  - no contiene proveedor, modelo, runtime ni wiring de tools

- **`RuntimeSelection` es una decisión estratégica única por cuenta**
  - `fluxi`
  - `assistants`
  - con estado explícito `active` o `inactive`

- **No hay fallback automático entre runtimes**
  - si falla un runtime, el sistema lo informa de forma explícita
  - no deriva silenciosamente a otro runtime

- **Toda capacidad reusable por más de un runtime pertenece a plataforma**
  - templates
  - RAG
  - future chat tools
  - conectores externos

- **La adopción en runtimes ocurre después de consolidar la plataforma común**
  - primero se cierra contrato, registro, offer y mediación compartida
  - recién después se adapta `asistentes-local`, `asistentes-openai` o futuros runtimes para consumir esa base
  - los runtimes sirven como referencia de extracción mientras la plataforma siga en consolidación

- **Ningún runtime ejecuta side effects externos directamente**
  - el runtime decide
  - la plataforma media la ejecución mediante `ExecutionAction[]`
  - el efecto se certifica o registra por la vía canónica

- **No se avanza por “sensación de que ya quedó”**
  - cada fase requiere pruebas
  - evidencia
  - criterio de salida explícito

---

## 3. Especificación técnica objetivo

## 3.1 Objetos canónicos

### `PolicyContext`

Responsabilidad:
- perfil de negocio autorizado para esa ejecución

Incluye:
- `accountId`
- `conversationId`
- identidad del cliente/contacto
- relación
- contexto de negocio autorizado
- perfiles/recursos autorizados del negocio
- constraints de negocio

No incluye:
- runtime
- provider
- model
- assistant runtime wiring
- tools técnicas

### `RuntimeSelection`

Responsabilidad:
- decisión estratégica única por cuenta

Incluye:
- `strategy`: `fluxi | assistants`
- `state`: `active | inactive`
- `reason`
- `selectedBy`
- `updatedAt`

Notas:
- si `strategy = assistants`, el sistema resuelve luego el asistente activo
- si `state = inactive`, no hay ejecución cognitiva automática

### `RuntimeComposition`

Responsabilidad:
- composición técnica final del runtime a invocar

Incluye:
- `runtimeId`
- `assistantId?`
- `provider?`
- `model?`
- `prompt/runtime settings`
- `vectorStoreIds?`
- `capability bindings`

### `CapabilityDefinition`

Responsabilidad:
- definición canónica de una capability reusable

Incluye:
- `id`
- `slug`
- `version`
- `domain`: `chatcore | fluxcore | external`
- `kind`: `query | command`
- `inputSchema`
- `outputSchema`
- `description`
- `usageHints`
- `execution contract`

### `CapabilityOffer`

Responsabilidad:
- lista concreta de capabilities disponibles para una ejecución particular

Se resuelve en función de:
- cuenta
- estrategia activa
- assistant activo
- canal
- autorización
- estado de conexiones

### `ExecutionAction`

Responsabilidad:
- intención declarativa producida por un runtime

Regla:
- toda mutación observable o efecto externo debe terminar como acción declarativa mediada por plataforma.

---

## 3.2 Taxonomía canónica de capabilities

### `Query capabilities`

Características:
- leen o consultan
- no mutan mundo externo
- pueden ejecutarse durante la inferencia
- retornan datos al runtime

Ejemplos:
- `search_knowledge`
- `list_authorized_templates`
- `lookup_customer_profile`
- `get_open_works`

### `Command capabilities`

Características:
- expresan intención de producir un efecto
- no deben ejecutar directamente ese efecto dentro del runtime
- deben terminar como `ExecutionAction[]`

Ejemplos:
- `propose_send_template`
- `propose_open_work`
- `propose_schedule_appointment`

---

## 3.3 Regla de ejecución canónica

Flujo objetivo:

```text
Signal/Ingress
→ Kernel
→ Projector
→ Cognition Queue
→ CognitionWorker
→ PolicyContextResolver
→ RuntimeSelectionResolver
→ RuntimeCompositionResolver
→ CapabilityOfferResolver
→ RuntimeGateway
→ Runtime
→ ExecutionAction[]
→ ActionExecutor
→ Gateway/Kernel certification when applicable
→ Projector/Delivery
```

---

## 3.4 Modelo canónico para templates

### Definición

Templates son una **capability de comando de plataforma**, con dominio ChatCore y mediación cognitiva desde FluxCore.

### Capabilities mínimas

- `list_authorized_templates`
- `propose_send_template`

### Regla

- el runtime puede decidir consultar o proponer
- el runtime no envía la plantilla por sí mismo
- el efecto real se ejecuta vía `ActionExecutor`
- el resultado se registra/certifica por la vía canónica

---

## 3.5 Modelo canónico para RAG

RAG es una **query capability de plataforma**.

### Capability mínima

- `search_knowledge`

### Regla

- el runtime decide si la usa y con qué query
- la plataforma decide cómo se ejecuta, qué stores están autorizados y qué límites aplica
- no debe existir como implementación privada de un runtime

---

## 3.6 Observabilidad objetivo

La trazabilidad mínima por ejecución debe enlazar:
- `signal_id`
- `turn_id`
- `conversation_id`
- `account_id`
- `runtime_strategy`
- `runtime_id`
- `assistant_id`
- `capability_id`
- `action_id`

Separación requerida:
- **`Kernel`** para hechos certificados y relevantes del sistema
- **`Trace/Telemetry store`** para spans técnicos internos

---

## 4. Gobernanza de ejecución del roadmap

## 4.1 Estados de fase

Cada fase solo puede estar en uno de estos estados:
- `planned`
- `in_progress`
- `blocked`
- `validation_pending`
- `validated`
- `closed`

Regla:
- solo puede haber **una fase en `in_progress`**.

## 4.2 Registro obligatorio por fase

Cada fase debe producir:
- `decisiones tomadas`
- `archivos tocados`
- `riesgos detectados`
- `hallazgos no previstos`
- `pruebas ejecutadas`
- `evidencia`
- `criterio de salida cumplido`

## 4.3 Registro de avances no previstos

Todo hallazgo no previsto debe clasificarse como uno de estos tipos:
- `drift documental`
- `bug funcional`
- `inconsistencia de datos`
- `hueco de diseño`
- `deuda legacy`
- `bloqueo técnico`

Y debe registrar:
- descripción
- impacto
- fase donde apareció
- decisión tomada
- si bloquea o no la continuación

## 4.4 Regla de seguridad de avance

Si una fase detecta un hallazgo no previsto que afecte:
- contratos canónicos
- integridad de datos
- consistencia del runtime selection
- seguridad de efectos
- trazabilidad

entonces la fase se **congela** hasta resolverlo o redefinir el alcance.

---

## 5. Definición global de Done

Una fase se considera terminada solo si cumple todos estos puntos:

- **`Implementación`**
  - el cambio requerido está completo en código o documentación estructural según corresponda

- **`Pruebas`**
  - pruebas unitarias/integración de la fase ejecutadas
  - pruebas manuales críticas ejecutadas

- **`Evidencia`**
  - existe evidencia verificable de comportamiento

- **`Observabilidad`**
  - el cambio deja trazas suficientes para diagnóstico

- **`No regresión`**
  - no rompe el flujo validado en la fase anterior

- **`Cierre documental`**
  - se actualiza el registro de fase y hallazgos

---

## 6. Orden secuencial de ejecución

## Resumen de fases

| Fase | Objetivo | Resultado de cierre |
|---|---|---|
| 0 | Congelar contratos y disciplina de validación | vocabulario y reglas cerradas |
| 1 | Separar resolución de contexto, selección y composición | una sola fuente de verdad por dimensión |
| 2 | Introducir observabilidad full-pipeline mínima | trazabilidad suficiente para validar lo demás |
| 3 | Construir plataforma de capabilities | catálogo y oferta canónica operativa |
| 4 | Migrar Templates al modelo canónico | primer command capability productivo |
| 5 | Migrar RAG al modelo canónico | primer query capability productivo cross-runtime |
| 6 | Adaptar runtimes de asistentes al nuevo contrato | runtimes consumen capabilities uniformemente |
| 7 | Purificar Fluxi y sus efectos | runtime transaccional desacoplado de infraestructura cruda |
| 8 | Estados de producto, onboarding, fallos y modo inactive | comportamiento operativo predecible por cuenta |
| 9 | Retiro de legacy y hardening final | arquitectura unificada lista para endurecimiento |

---

## 7. Fase 0 — Contratos canónicos y disciplina de validación

## Objetivo

Congelar el lenguaje técnico y las reglas de avance para evitar que la implementación siga mezclando conceptos.

## Componentes/archivos objetivo

- `docs/reconstruction-phase-1/temp/*`
- futuros RFC/ADR de esta línea
- tipos centrales en `apps/api/src/core/fluxcore-types.ts`

## Entregables

- definición cerrada de:
  - `PolicyContext`
  - `RuntimeSelection`
  - `RuntimeComposition`
  - `CapabilityDefinition`
  - `CapabilityOffer`
  - `ExecutionAction`
- regla explícita de `query` vs `command`
- regla explícita de no fallback automático
- formato de evidencia por fase

## Checklist

- [ ] vocabulario canónico definido
- [ ] responsabilidades prohibidas por capa definidas
- [ ] definición de Done aprobada
- [ ] plantilla de registro de hallazgos no previstos definida
- [ ] matriz fase → pruebas → evidencia definida

## Pruebas de validación

- **`Validación documental`**
  - revisar que ninguna definición entre en contradicción con el canon deseado
- **`Validación de consistencia`**
  - verificar que no haya términos ambiguos para una misma dimensión

## Evidencia requerida

- documento aprobado
- tabla de contratos cerrada
- checklist de validación firmado por revisión técnica

## Criterio de salida

No existe ambigüedad operativa sobre qué es negocio, qué es estrategia de runtime y qué es composición técnica.

---

## 8. Fase 1 — Separación de resolvers centrales

## Objetivo

Extraer y estabilizar tres servicios separados:
- `PolicyContextResolver`
- `RuntimeSelectionResolver`
- `RuntimeCompositionResolver`

## Componentes/archivos candidatos

- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/runtime-config.service.ts`
- `apps/api/src/services/fluxcore/runtime.service.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/core/fluxcore-types.ts`

## Entregables

- `PolicyContext` sin `runtimeConfig`
- `RuntimeSelection` con SSOT única por cuenta
- `RuntimeComposition` separado del contexto de negocio
- dispatcher consumiendo los tres resolvers por separado

## Checklist

- [ ] `PolicyContext` ya no devuelve runtime config
- [ ] existe resolver explícito para estrategia activa por cuenta
- [ ] existe resolver explícito para composición técnica del runtime
- [ ] el dispatcher no re-resuelve la misma dimensión por múltiples vías
- [ ] se elimina o marca como legacy cualquier ruta duplicada de resolución

## Pruebas de validación

- **`Unitarias`**
  - resolver de policy devuelve solo negocio
  - resolver de strategy devuelve exactamente una estrategia
  - resolver de composition devuelve runtime concreto coherente
- **`Integración`**
  - una ejecución cognitiva recorre las tres resoluciones sin duplicidad
- **`Manual`**
  - cuenta con `assistants` responde con assistant activo
  - cuenta con `fluxi` enruta a Fluxi
  - cuenta `inactive` no ejecuta automatización

## Evidencia requerida

- logs/trazas de una ejecución por cada estrategia
- test results
- diff de servicios centrales

## Criterio de salida

No existen dos fuentes efectivas de verdad para la misma decisión de runtime.

---

## 9. Fase 2 — Observabilidad mínima obligatoria

## Objetivo

Instalar trazabilidad mínima full-pipeline antes de seguir con migrations funcionales.

## Componentes/archivos candidatos

- gateways de entrada
- `apps/api/src/core/kernel.ts`
- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/workers/cognition-worker.ts`
- `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`
- `apps/api/src/services/fluxcore/runtime-gateway.service.ts`
- `apps/api/src/services/fluxcore/action-executor.service.ts`

## Entregables

- correlation IDs propagados
- tracing mínimo por etapa
- errores operacionales visibles por runtime
- separación explícita entre journal y trazas técnicas

## Checklist

- [ ] `signal_id` propagado
- [ ] `turn_id` propagado
- [ ] `runtime_id` visible en trazas
- [ ] `assistant_id` visible cuando aplique
- [ ] `capability_id` y `action_id` visibles donde existan
- [ ] los errores de runtime quedan trazables sin fallback silencioso

## Pruebas de validación

- **`Manual`**
  - ejecutar mensaje end-to-end y reconstruir el pipeline completo desde logs/trazas
- **`Fault injection`**
  - forzar error en runtime y confirmar que:
    - se detecta el fallo
    - se informa explícitamente
    - no se deriva a otro runtime
- **`Regression`**
  - asegurar que el pipeline sigue respondiendo normalmente en el caso sano

## Evidencia requerida

- captura de trazas de pipeline sano
- captura de trazas de pipeline con error
- nota de correlación completa

## Criterio de salida

Cualquier fallo relevante puede localizarse empíricamente en un punto concreto del pipeline.

---

## 10. Fase 3 — Plataforma canónica de capabilities

## Objetivo

Construir la capa única de capabilities reusable por todos los runtimes.

## Componentes/archivos candidatos

- `apps/api/src/core/capabilities/*`
- `apps/api/src/services/tool-registry.service.ts`
- `apps/api/src/services/ai-tools.service.ts`
- nuevos servicios candidatos:
  - `capability-registry.service.ts`
  - `capability-offer.service.ts`
  - `capability-execution.service.ts`
- `apps/api/src/core/fluxcore-types.ts`

## Entregables

- registro canónico de capabilities
- oferta filtrada por cuenta/asistente/canal
- contrato común para runtimes
- generación uniforme de tool schemas o instruction blocks

## Checklist

- [ ] existe `CapabilityDefinition` canónica
- [ ] existe resolución de `CapabilityOffer`
- [ ] se distingue `query` y `command`
- [ ] no hay más de una fuente de verdad para la descripción de uso de una capability
- [ ] el contrato puede ser consumido por más de un runtime

## Pruebas de validación

- **`Unitarias`**
  - registro devuelve capability por ID/slug/version
  - offer resolver filtra por autorización real
- **`Integración`**
  - un runtime recibe solo las capabilities autorizadas
- **`Compatibilidad`**
  - local y OpenAI pueden consumir la misma definición canónica

## Evidencia requerida

- listado de capabilities disponibles por escenario
- tests de autorización
- ejemplo de schema generado desde el mismo registro

## Criterio de salida

La plataforma ya puede ofrecer capabilities a cualquier runtime sin redefinirlas por runtime.

---

## 11. Fase 4 — Templates como primer command capability productivo

## Objetivo

Tomar templates como piloto canónico del modelo de command capability.

## Componentes/archivos candidatos

- `apps/api/src/services/fluxcore/template-registry.service.ts`
- `apps/api/src/services/ai-template.service.ts`
- `apps/api/src/services/fluxcore/action-executor.service.ts`
- `apps/api/src/core/capabilities/templates.capability.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`
- rutas auxiliares legacy relacionadas a templates

## Entregables

- `list_authorized_templates`
- `propose_send_template`
- salida del runtime en forma de `ExecutionAction`
- ejecución real mediada por `ActionExecutor`
- trazabilidad del efecto

## Checklist

- [ ] templates ya no dependen de prompt manual hardcodeado como SSOT
- [ ] el runtime no ejecuta envío de plantilla directamente
- [ ] la validación de template ocurre en plataforma
- [ ] el envío real ocurre por mediación de acción
- [ ] el resultado queda trazable

## Pruebas de validación

- **`Caso sano`**
  - assistant lista templates autorizadas
  - propone una template válida
  - la plataforma la ejecuta correctamente
- **`Caso inválido`**
  - template no autorizada rechazada
- **`Caso incompleto`**
  - faltan variables requeridas → no se ejecuta
- **`Caso de regresión`**
  - envío manual/chatcore tradicional sigue funcionando si aplica

## Evidencia requerida

- conversación de prueba con activación de template
- acción generada y ejecutada
- traza completa y registro de rechazo en caso inválido

## Criterio de salida

Templates funcionan como capability de comando de plataforma, no como herramienta privada de un runtime.

---

## 12. Fase 5 — RAG como query capability universal

## Objetivo

Convertir RAG en una capability de consulta reusable por todos los runtimes.

## Componentes/archivos candidatos

- `apps/api/src/core/capabilities/knowledge.capability.ts`
- `apps/api/src/services/retrieval.service.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`
- endpoints auxiliares como `/fluxcore/runtime/rag-context`

## Entregables

- `search_knowledge` como capability canónica
- control de autorización de stores/scopes
- eliminación del fetch HTTP interno como vía principal
- mismo contrato consumible por todos los runtimes

## Checklist

- [ ] RAG ya no está embebido como implementación privada del runtime local
- [ ] el acceso a knowledge pasa por capability platform-owned
- [ ] se controlan scopes y stores autorizados
- [ ] la salida está estructurada para consumo de runtimes
- [ ] local y OpenAI pueden usar la misma capability

## Pruebas de validación

- **`Unitarias`**
  - query válida devuelve contexto estructurado
  - scopes restringidos se respetan
- **`Integración`**
  - local usa `search_knowledge`
  - OpenAI usa `search_knowledge`
- **`Regresión`**
  - consultas sin RAG siguen respondiendo normalmente

## Evidencia requerida

- pruebas con y sin RAG
- comparación de resultados cross-runtime
- trazas de uso de capability

## Criterio de salida

RAG es una capability universal de plataforma y no un comportamiento privativo de un runtime.

---

## 13. Fase 6 — Adaptación de runtimes de asistentes

## Objetivo

Hacer que `asistentes-local` y `asistentes-openai` consuman el mismo contrato de capabilities.

## Componentes/archivos candidatos

- `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`
- `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`
- `apps/api/src/services/openai-sync.service.ts`
- `apps/api/src/core/fluxcore-types.ts`

## Entregables

- runtimes consumiendo `CapabilityOffer`
- function calling o instruction synthesis desde la misma fuente canónica
- comportamiento coherente entre runtimes

## Checklist

- [ ] local consume capabilities desde plataforma
- [ ] OpenAI consume capabilities desde plataforma
- [ ] no hay definiciones duplicadas de templates/RAG por runtime
- [ ] el contrato de capability no depende de un proveedor concreto

## Pruebas de validación

- **`Cross-runtime parity`**
  - mismo escenario, mismas capabilities ofrecidas, resultados equivalentes
- **`Error handling`**
  - fallo de capability se informa sin fallback de runtime
- **`Regression`**
  - mensajes simples sin tools siguen funcionando

## Evidencia requerida

- matriz comparativa local vs OpenAI
- trazas equivalentes por capability
- pruebas de error visibles al usuario/sistema

## Criterio de salida

Los runtimes de asistentes ya no son dueños de la implementación de capabilities compartidas.

---

## 14. Fase 7 — Purificación de Fluxi

## Objetivo

Reducir Fluxi a runtime soberano transaccional, sin inyección de infraestructura cruda dentro de su config operativa.

## Componentes/archivos candidatos

- `apps/api/src/services/fluxcore/runtimes/fluxi.runtime.ts`
- `apps/api/src/services/fluxcore/fluxi-dependency-injection.ts`
- `apps/api/src/services/flux-policy-context.service.ts`
- `apps/api/src/services/fluxcore/action-executor.service.ts`

## Entregables

- `activeWork` y `workDefinitions` realmente resueltos en input
- eliminación progresiva de `workEngineService`/`messageCore` dentro de runtime config
- todos los efectos terminan como acciones declarativas

## Checklist

- [ ] Fluxi recibe contexto pre-resuelto suficiente
- [ ] Fluxi no depende de infraestructura cruda inyectada para actuar
- [ ] los efectos WES pasan por mediación de plataforma
- [ ] se mantiene persistencia transaccional correcta

## Pruebas de validación

- **`Caso work activo`**
  - Fluxi interpreta y avanza un work existente
- **`Caso nueva intención`**
  - Fluxi propone correctamente un work
- **`Caso error`**
  - falla controlada sin derivación a assistants

## Evidencia requerida

- flujo de work activo completo
- flujo de creación/propuesta completo
- trazas y acciones generadas

## Criterio de salida

Fluxi conserva su semántica transaccional, pero ya no absorbe infraestructura que pertenece a plataforma.

---

## 15. Fase 8 — Estados de producto, onboarding y fallos explícitos

## Objetivo

Alinear comportamiento técnico con UX y operación de producto.

## Componentes/archivos candidatos

- servicios de configuración de runtime por cuenta
- servicios de assistants
- rutas/UI de configuración relevantes
- worker/dispatcher para estado `inactive`

## Entregables

- onboarding crea assistant básico activo por defecto
- desactivar todos los assistants lleva a `inactive`
- errores de runtime visibles y comprensibles
- estado operacional claro por cuenta

## Checklist

- [ ] cuenta nueva tiene comportamiento funcional por defecto
- [ ] existe modo `inactive` explícito y probado
- [ ] no hay fallback silencioso en fallos
- [ ] los errores quedan visibles y trazables
- [ ] el estado de estrategia activa es consultable

## Pruebas de validación

- **`Provisioning`**
  - cuenta nueva responde como esperado
- **`Inactive mode`**
  - desactivar todo evita automatización
- **`Failure surfacing`**
  - fallo runtime visible al sistema/operación

## Evidencia requerida

- prueba de onboarding
- prueba de inactive mode
- prueba de error operacional visible

## Criterio de salida

El comportamiento por cuenta es predecible, visible y controlado por el usuario/operación.

---

## 16. Fase 9 — Retiro de legacy y hardening final

## Objetivo

Eliminar rutas paralelas y endurecer la arquitectura antes de declarar estado productivo.

## Componentes/archivos candidatos

- `apps/api/src/services/runtime-gateway.service.ts`
- `apps/api/src/services/ai-tools.service.ts`
- rutas auxiliares antiguas
- código de compatibilidad temporal ya no usado

## Entregables

- servicios legacy retirados o aislados definitivamente
- documentación actualizada a realidad
- matriz final de ownership sin duplicidades activas

## Checklist

- [ ] no quedan gateways paralelos activos para la misma responsabilidad
- [ ] no quedan tool systems duplicados en producción
- [ ] la documentación técnica refleja la ruta real
- [ ] se ejecuta suite final de no regresión

## Pruebas de validación

- **`Regression suite completa`**
  - assistants local
  - assistants OpenAI
  - Fluxi
  - templates
  - RAG
  - inactive mode
  - error handling
- **`Smoke test de producción`**
  - recorrido de punta a punta por estrategia

## Evidencia requerida

- suite final aprobada
- inventario de legacy retirado
- diff documental de cierre

## Criterio de salida

La arquitectura ejecutable y la arquitectura documentada ya no divergen en sus piezas centrales.

---

## 17. Matriz global de validación empírica

| Área | Prueba mínima | Tipo | Bloquea avance |
|---|---|---|---|
| Runtime selection | una cuenta `assistants`, una `fluxi`, una `inactive` | integración/manual | sí |
| No fallback | fallo intencional de runtime sin derivación | fault injection | sí |
| Templates | selección, rechazo y ejecución real | integración/manual | sí |
| RAG | query autorizada y query restringida | integración | sí |
| Cross-runtime capabilities | misma capability visible en local y OpenAI | integración | sí |
| Fluxi transaccional | work activo y nueva intención | integración/manual | sí |
| Observabilidad | reconstrucción completa de pipeline con IDs | manual/telemetry | sí |
| No regresión | suite del flujo sano previo | regresión | sí |

---

## 18. Plantilla de control de avance por fase

Usar esta estructura para registrar cada fase:

```md
# Registro de fase X

## Estado
- planned | in_progress | blocked | validation_pending | validated | closed

## Alcance previsto
- ...

## Avances completados
- [ ] ...
- [ ] ...

## Hallazgos no previstos
- Tipo:
- Descripción:
- Impacto:
- Decisión:
- ¿Bloquea?: sí/no

## Pruebas ejecutadas
- [ ] unitaria
- [ ] integración
- [ ] manual
- [ ] regresión

## Evidencia
- archivo/log/captura/comando:

## Criterio de salida
- [ ] cumplido
```

---

## 19. Reglas operativas para ejecución segura

- **`Una sola fase activa`**
  - no abrir implementación nueva mientras la fase actual no esté validada

- **`Nada de migraciones conceptuales mezcladas`**
  - no tocar templates, RAG y Fluxi a la vez
  - se migra un eje por vez

- **`Primero observabilidad, después complejidad`**
  - si no puede trazarse, no está listo para seguir creciendo

- **`Toda migración debe tener caso sano y caso fallido`**
  - no basta con probar el happy path

- **`Toda decisión nueva debe registrarse`**
  - si aparece una decisión de arquitectura no prevista, se documenta antes de continuar

---

## 20. Orden recomendado de trabajo real

Si hubiera que ejecutar esto mañana, el orden recomendado es:

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. Fase 7
9. Fase 8
10. Fase 9

Razonamiento:
- primero se fija el lenguaje y la gobernanza,
- luego se separan las fuentes de verdad,
- luego se instala observabilidad,
- después se migra el modelo reusable de capabilities,
- y recién entonces se adaptan los runtimes concretos.

---

## 21. Criterio de declaración de “listo para producción”

FluxCore Cognitive Platform podrá considerarse lista para endurecimiento productivo cuando se cumpla todo lo siguiente:

- **`Arquitectura`**
  - `PolicyContext`, `RuntimeSelection` y `RuntimeComposition` están separados y operativos

- **`Capabilities`**
  - templates y RAG ya corren por el modelo canónico

- **`Runtimes`**
  - local, OpenAI y Fluxi consumen contratos coherentes con ownership claro

- **`Producto`**
  - onboarding, inactive mode y errores explícitos están probados

- **`Operación`**
  - el pipeline completo puede reconstruirse empíricamente

- **`No regresión`**
  - la suite final pasa sin desvíos críticos

---

## 22. Conclusión

El objetivo no es solo “ordenar la arquitectura”, sino construir una secuencia de trabajo donde cada paso deje una base verificable para el siguiente.

La clave de este roadmap es que la producción no se alcanzará por acumulación de cambios, sino por **cierre empírico de hitos**:

- contrato cerrado,
- implementación acotada,
- prueba empírica,
- evidencia,
- recién entonces siguiente fase.

Ese criterio reduce drásticamente el riesgo de seguir avanzando sobre capas conceptualmente correctas pero operacionalmente inestables.
