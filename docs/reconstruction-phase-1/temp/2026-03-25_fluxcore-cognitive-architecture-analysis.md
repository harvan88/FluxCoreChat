# Análisis arquitectónico de FluxCore — Capa cognitiva

**Fecha:** 2026-03-25
**Estado del informe:** análisis técnico basado en código y documentación activa
**Alcance:** FluxCore como sistema cognitivo independiente de ChatCore
**Fuentes primarias:**
- Código real en `apps/api/src/**`, `packages/db/src/**`
- Documentación activa en `docs/reconstruction-phase-1/exhaustive-mapping/**`

---

## Objetivo

Este informe releva la arquitectura real de la capa cognitiva de FluxCore con foco en su solidez para producción, clasificando responsabilidades entre:
- capacidades de plataforma,
- orquestación cognitiva,
- runtimes soberanos,
- y puentes de certificación con el Kernel.

El criterio de evaluación utilizado es evolutivo:
- construir sobre la base existente,
- preservar los aciertos estructurales ya presentes,
- y aislar únicamente las responsabilidades que hoy aparecen mezcladas o duplicadas.

Este documento **no describe ChatCore como producto de mensajería**, salvo en los puntos donde actúa como borde causal o cuerpo ejecutor del sistema.

---

## Resumen ejecutivo

La capa cognitiva de FluxCore ya contiene una **macroarquitectura correcta y valiosa** para producción:
- existe un Kernel explícito como fedatario,
- existe proyección estructural antes de cognición,
- existe una cola de turnos cognitivos,
- existe un `CognitionWorker` que desacopla ingestión de decisión,
- existe un `RuntimeGateway` para soberanía de runtimes,
- y existe un `ActionExecutor` que media efectos y obliga a que la salida vuelva a certificarse en el Kernel.

Sin embargo, el análisis del código real muestra que esa macroarquitectura convive con una segunda realidad menos consolidada:
- varias capacidades que deberían ser de plataforma están **duplicadas, fragmentadas o solo parcialmente conectadas**,
- la resolución de contexto, runtime y asistente activo tiene **más de una fuente efectiva de verdad**,
- existen artefactos legacy aún presentes junto al camino canónico,
- y la documentación oficial activa presenta **drift** relevante frente al sistema ejecutable actual.

La conclusión principal es la siguiente:

> **FluxCore ya tiene la forma correcta de un sistema cognitivo soberano, pero todavía no terminó de separar de forma operacional aquello que pertenece a la plataforma de aquello que pertenece a cada runtime.**

El trabajo recomendado no es un rediseño total, sino una **consolidación por capas**.

---

## Arquitectura cognitiva actual observada

## 1. Arranque del sistema

En `apps/api/src/server.ts` el backend inicia explícitamente la capa cognitiva:
- arranca `kernelDispatcher`,
- arranca proyectores con `startProjectors()`,
- ejecuta `bootstrapKernel()`,
- registra runtimes en `services/fluxcore/runtime-gateway.service.ts`,
- y arranca `cognitionWorker.start()`.

Esto confirma que la capa cognitiva actual no es accidental ni implícita: **ya existe como subsistema explícito de arranque**.

## 2. Ingreso causal

Los ingresos cognitivos relevantes se certifican mediante gateways/adapters:
- `chatcore-gateway.service.ts`
- `chatcore-webchat-gateway.service.ts`
- `reality-adapter.service.ts`
- `cognition-gateway.service.ts` para salida AI

El patrón real observado es:
- el borde externo construye `KernelCandidateSignal`,
- firma el candidato,
- el Kernel valida adapter, driver y firma,
- persiste la señal en `fluxcore_signals`,
- y deja la proyección a cargo de los proyectores.

## 3. Proyección estructural previa a cognición

La secuencia real depende de proyectores:
- `IdentityProjector` materializa identidad/actorización
- `ChatProjector` proyecta mensajes y encola turnos en `fluxcore_cognition_queue`

Punto fuerte importante:
- la respuesta AI **no** se entrega directamente desde el runtime;
- `ActionExecutor` certifica `AI_RESPONSE_GENERATED` mediante `cognitionGateway`;
- `ChatProjector` observa esa señal y entrega vía `messageCore.receive()`.

Esto confirma una propiedad arquitectónica de alto valor:

> **FluxCore decide y certifica; ChatCore entrega y persiste.**

## 4. Turn-window cognitivo

La unidad operativa real del sistema no es el mensaje aislado sino el turno acumulado en `fluxcore_cognition_queue`.

Flujo observado:
- `ChatProjector` hace upsert por `conversation_id`
- `CognitionWorker` consulta turnos vencidos con `FOR UPDATE SKIP LOCKED`
- el worker delega a `CognitiveDispatcher`
- el dispatcher resuelve contexto, elige runtime y ejecuta
- `ActionExecutor` cierra el turno marcando `processed_at`

Esto es una base correcta para:
- evitar respuestas duplicadas por ráfagas,
- desacoplar recepción de decisión,
- soportar concurrencia segura,
- y establecer reintentos con backoff.

## 5. Ciclo de decisión

El camino real de decisión es:

```text
Gateway/Adapter
→ Kernel
→ Projectors
→ fluxcore_cognition_queue
→ CognitionWorker
→ CognitiveDispatcher
→ RuntimeGateway
→ Runtime soberano
→ ActionExecutor
→ CognitionGateway
→ Kernel
→ ChatProjector
→ MessageCore
```

Este flujo es, conceptualmente, sólido y apto para producción.

---

## Fortalezas estructurales reales

## 1. Separación macro Brain / Body / Kernel

La división observada entre:
- Kernel como fedatario,
- FluxCore como decisor,
- ChatCore como cuerpo operacional,

está implementada en piezas reales, no solo en documentación.

La evidencia más fuerte es la salida AI:
- el runtime no escribe en `messages`,
- `ActionExecutor` certifica la respuesta vía `cognition-gateway.service.ts`,
- `ChatProjector` la reproyecta al mundo ChatCore.

## 2. Efectos mediados

`ActionExecutor` recibe `ExecutionAction[]` declarativas.

Eso preserva una frontera importante:
- el runtime expresa intención,
- la plataforma decide cómo mediar el efecto,
- y la certificación de realidad queda fuera del runtime.

## 3. Soberanía de runtimes a nivel de registro

`services/fluxcore/runtime-gateway.service.ts` registra runtimes concretos:
- `asistentes-local`
- `asistentes-openai`
- `@fluxcore/fluxi`

La idea de “runtime soberano” ya existe en la arquitectura ejecutable.

## 4. Existencia de servicios plataforma reutilizables

Aunque todavía no están completamente consolidados, ya existen servicios que claramente apuntan a platform ownership:
- `retrieval.service.ts`
- `template-registry.service.ts`
- `ai-template.service.ts`
- `cognition-gateway.service.ts`
- `chatcore-gateway.service.ts`
- `chatcore-webchat-gateway.service.ts`
- `action-executor.service.ts`

## 5. Soporte real para multi-runtime

La arquitectura ya no está hecha para un único runtime:
- existe registro de runtimes,
- existe selección de runtime por cuenta,
- existen al menos tres variantes reales de ejecución,
- y existe un problema reconocible de separación de ownership justamente porque el sistema dejó de ser monoruntime.

Eso significa que el esfuerzo a realizar es de **consolidación**, no de invención.

---

## Hallazgos estructurales críticos

## 1. Mezcla de ownership entre PolicyContext y RuntimeConfig

### Evidencia

`apps/api/src/services/flux-policy-context.service.ts` expone:

```ts
async resolveContext(...): Promise<{ policyContext: FluxPolicyContext; runtimeConfig: RuntimeConfig }>
```

Esto mezcla en un único servicio dos responsabilidades distintas:
- política de negocio,
- y composición/configuración técnica del runtime.

### Impacto

Esto rompe la frontera conceptual que el propio sistema intenta establecer:
- `PolicyContext` debería responder **cómo y cuándo** operar,
- `RuntimeConfig` debería responder **con qué implementación técnica** hacerlo.

### Conclusión

`FluxPolicyContextService` hoy funciona como **servicio híbrido**. No es puramente plataforma de gobernanza; también participa en la composición técnica del runtime.

---

## 2. El dispatcher resuelve el runtime dos veces y sombrea configuraciones

### Evidencia

En `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts` ocurre lo siguiente:

1. primero se resuelve:

```ts
const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(...)
```

2. luego, más abajo, se vuelve a resolver otra cosa con el mismo nombre:

```ts
const runtimeConfig = await runtimeConfigService.getRuntime(accountId)
```

3. a continuación el dispatcher decide el `runtimeId` a partir de `account_runtime_config` y vuelve a consultar el asistente activo mediante `fluxcoreService.resolveActiveAssistant(accountId)`.

### Impacto

Esto implica que en una sola ejecución conviven varias fuentes para la dimensión runtime:
- `fluxPolicyContextService.resolveContext()`
- `runtimeConfigService.getRuntime()`
- `fluxcoreService.resolveActiveAssistant()`
- `ai-execution-plan.service.ts` para enriquecer `model/provider`

### Conclusión

La decisión cognitiva actual tiene **fragmentación de soberanía** en la selección/composición del runtime. Este es uno de los problemas arquitectónicos más importantes del sistema.

---

## 3. La capa de capacidades de plataforma existe, pero no gobierna realmente a los runtimes

### Evidencia

Existen artefactos claros de platform capabilities:
- `apps/api/src/core/capabilities/knowledge.capability.ts`
- `apps/api/src/core/capabilities/templates.capability.ts`
- `apps/api/src/services/tool-registry.service.ts`
- `RuntimeInput.services` en `apps/api/src/core/fluxcore-types.ts`

Sin embargo:
- `RuntimeInput.services` está declarado pero **no se inyecta** desde el dispatcher,
- los runtimes no consumen esa interfaz,
- `tool-registry.service.ts` exporta un singleton con dependencias placeholder,
- y `asistentes-local.runtime.ts` define y ejecuta sus herramientas por cuenta propia.

### Impacto

La plataforma declara una capa de capacidades reusable, pero el runtime principal sigue operando con una implementación paralela.

### Conclusión

La capa de capacidades hoy está **conceptualmente correcta pero operacionalmente incompleta**.

---

## 4. RAG/knowledge como capacidad aún está embebido en el runtime local

### Evidencia

En `asistentes-local.runtime.ts`:
- se define localmente `SEARCH_KNOWLEDGE_TOOL`,
- y el runtime ejecuta `executeSearchKnowledge()` haciendo `fetch()` HTTP hacia su propio backend:

```ts
POST /fluxcore/runtime/rag-context
```

Mientras tanto existen:
- `retrieval.service.ts`
- `knowledge.capability.ts`
- documentación que trata `ToolRegistry` como registro central

### Impacto

Esto genera varios problemas:
- duplicación de definiciones de herramienta,
- acoplamiento del runtime a un endpoint HTTP interno,
- pérdida de centralización de autorización/oferta/auditoría,
- y dificultad para reutilizar esa misma capacidad desde otros runtimes.

### Conclusión

`search_knowledge` **debe clasificarse como capacidad de plataforma**, no como implementación propia de `asistentes-local`.

---

## 5. Templates están mejor encaminadas, pero todavía no totalmente consolidadas como capability única

### Evidencia

A favor de la consolidación:
- `template-registry.service.ts` sí es un SSOT razonable para autorización e inyección de bloque de instrucciones
- `ai-template.service.ts` delega autorización a `template-registry.service.ts`

Pero al mismo tiempo:
- `asistentes-local.runtime.ts` define su propia herramienta `send_template`
- `ai-tools.service.ts` mantiene otro sistema paralelo de tools
- `fluxcore-runtime.routes.ts` expone endpoints `/tools/list-templates` y `/tools/send-template`
- `tool-registry.service.ts` existe pero no está integrado en la ruta cognitiva principal

### Conclusión

Templates están **más cerca** de convertirse en capacidad de plataforma canónica que knowledge/RAG, pero todavía no son la única vía operativa.

---

## 6. Fluxi no está recibiendo hoy un contexto pre-resuelto coherente con el canon que pretende

### Evidencia

En `flux-policy-context.service.ts`:

```ts
await this.resolveFluxiContext(accountId)
```

pero el resultado no se incorpora al `policyContext` retornado. El objeto final fija:

```ts
workDefinitions: []
```

Además, `createFluxiRuntimeConfig()` en `fluxi-dependency-injection.ts` inyecta:
- `workEngineService`
- `messageCore`
- `workDefinitions: []`

### Impacto

Esto implica dos cosas:
- `FluxiRuntime` no recibe realmente las `workDefinitions` resueltas por plataforma,
- y se le inyectan servicios de infraestructura dentro de `runtimeConfig`, lo que contradice la idea de runtime puro y pre-resuelto.

### Conclusión

Fluxi está **arquitectónicamente ubicado como runtime soberano**, pero todavía no está materializado como tal de forma completa.

---

## 7. El turn-window todavía no está plenamente gobernado por políticas de plataforma

### Evidencia

`packages/db/src/schema/fluxcore-account-policies.ts` define:
- `turnWindowMs`
- `turnWindowTypingMs`
- `turnWindowMaxMs`

Sin embargo `apps/api/src/core/projections/chat-projector.ts` usa:

```ts
private readonly TURN_WINDOW_MS = 3000;
```

Además, `projectStateChange()` no extiende realmente la cognition queue para señales de typing; solo registra o procesa mutaciones estructurales.

### Impacto

La política temporal existe en el modelo de plataforma, pero el control real del cierre de turno sigue parcialmente hardcodeado en el proyector.

### Conclusión

La orquestación temporal del turno es una **capacidad de plataforma todavía parcialmente distribuida**.

---

## 8. Drift relevante entre documentación activa y sistema ejecutable

## 8.1 `04-end-to-end-flows` está vacío

`00-INDEX.md` afirma que existe `cognitive-pipeline-flow.md`, pero el directorio `docs/reconstruction-phase-1/exhaustive-mapping/04-end-to-end-flows/` está vacío.

## 8.2 `ToolRegistry` está documentado como conectado al dispatcher, pero no lo está

La documentación oficial dice que `ToolRegistry` centraliza y desacopla ejecución mediante dependencias inyectadas. En código real:
- no participa en `cognitive-dispatcher.service.ts`,
- y el singleton exportado tiene placeholders.

## 8.3 Los runtime IDs documentados no coinciden con los runtime IDs efectivos

`account-governance.md` describe `@fluxcore/wes` y `@fluxcore/fluxcore`.

Pero el código real usa variantes como:
- `@fluxcore/asistentes`
- `@fluxcore/fluxi`
- `asistentes-local`
- `asistentes-openai`

## 8.4 El modelo de estados de asistentes no coincide entre docs, schema y servicios

- `fluxcore-assistants.md` documenta `draft / production / disabled`
- `fluxcore-assistants.ts` comenta `draft / production / disabled`
- `assistants.service.ts` y `flux-policy-context.service.ts` usan `active`
- otras lecturas contemplan `active` o `production`

## 8.5 `kernel.ts` permite más tipos que los seis documentados

`kernel-journal.md` y el canon describen seis tipos físicos. Pero `apps/api/src/core/kernel.ts` acepta además:
- `chatcore.message.received`
- `AI_RESPONSE_GENERATED`

### Conclusión general del drift

La documentación activa es útil para mapear el paisaje, pero **no puede tomarse como definición canónica cerrada** en la capa cognitiva sin revalidación contra el código.

---

## 9. Coexistencia de rutas canónicas y rutas legacy

### Evidencia

Sigue existiendo un `apps/api/src/services/runtime-gateway.service.ts` legacy, diferente del `services/fluxcore/runtime-gateway.service.ts` usado por la nueva ruta cognitiva.

También persisten artefactos paralelos:
- `smart-delay.service.ts` marcado como legado
- `ai-tools.service.ts` como sistema paralelo de tools
- endpoints de `fluxcore-runtime.routes.ts` que aún dependen de componentes del extension path anterior

### Conclusión

La arquitectura actual es una **arquitectura de transición avanzada**, no una arquitectura puramente unificada.

---

## Capacidades que deben consolidarse como ownership de plataforma

A continuación se listan las capacidades que, por reutilización potencial o real entre runtimes, no deberían residir dentro de un runtime específico.

## 1. Resolución de contexto autorizado

Debe pertenecer a plataforma:
- resolución de `PolicyContext`
- resolución de `RuntimeSelection`
- composición de `RuntimeConfig`
- resolución de perfil autorizado del negocio
- historial semántico de conversación
- reglas por contacto

Rationale:
- cualquier runtime cognitivo necesita este insumo,
- si más de un runtime lo consume, no debe vivir en ninguno.

## 2. Catálogo, oferta, autorización y ejecución de capacidades/herramientas

Debe pertenecer a plataforma:
- definición del catálogo de capacidades disponibles
- política de oferta por cuenta/asistente/contexto
- autorización de ejecución
- mediación de la llamada real
- trazabilidad y auditoría de uso

Rationale:
- Local, OpenAI y futuros runtimes deberían hablar contra la misma capa.

## 3. Knowledge / RAG

Debe pertenecer a plataforma:
- resolución de stores accesibles
- búsqueda vectorial
- construcción de contexto seguro para prompt
- límites de tokens y policy de retrieval

El runtime puede decidir **si usarla**, pero no debería poseer la implementación ni el transporte.

## 4. Templates

Debe pertenecer a plataforma:
- autorización de plantillas IA
- listado de plantillas disponibles
- ejecución real del envío
- inyección de conocimiento de templates al contexto o a la capa de capabilities

## 5. Certificación hacia el Kernel

Debe pertenecer a plataforma:
- gateways de ingreso
- signature logic / adapter ownership
- `cognition-gateway`
- mediación de efectos que devuelven hechos al Kernel

## 6. Orquestación temporal del turno

Debe pertenecer a plataforma:
- turn-window
- response delay
- typing extension
- retry/backoff semántico del worker

## 7. WES / Work Engine y gates deterministas

Debe pertenecer a plataforma:
- propuesta de work
- gate de apertura
- semantic confirmation
- external effect claim
- persistencia/avance del work

Fluxi puede decidir declarativamente, pero no debe ser dueño de la infraestructura transaccional.

---

## Responsabilidades que sí deben permanecer en cada runtime

## 1. Estrategia interna de razonamiento

Cada runtime debe ser dueño de:
- cómo interpreta el `RuntimeInput`
- cómo estructura su prompt interno o override remoto
- cómo secuencia rounds cognitivos propios
- cómo convierte resultados de capacidades en `ExecutionAction[]`

## 2. Protocolo específico del proveedor o motor

Ejemplos:
- `asistentes-local`: tool loop LLM local-compatible, fallback de provider, composición del prompt
- `asistentes-openai`: threads/runs/polling/override de instrucciones
- `Fluxi`: interpretación transaccional y mapeo a acciones WES declarativas

## 3. Decisión semántica final

La plataforma prepara contexto, capacidades y efectos mediados.

El runtime debe seguir siendo el responsable de decidir:
- responder,
- no responder,
- pedir más datos,
- proponer un work,
- o devolver `no_action`.

---

## Clasificación del estado actual

## Arquitectónicamente sólidos hoy

- Kernel como borde soberano
- pipeline inbound/outbound por señales certificadas
- `ChatProjector` como puente bidireccional de realidad/mensajería
- `CognitionWorker` y `ActionExecutor` como piezas separadas
- `cognition-gateway` como reality adapter de salida AI
- `template-registry.service.ts` como buena base de SSOT para templates

## Parcialmente consolidados

- PolicyContext
- Runtime selection
- Runtime composition
- Tool/capability layer
- RAG como capacidad reusable
- Fluxi como runtime realmente puro
- gobernanza temporal del turno

## En estado de drift o transición

- documentación oficial de flows
- `ToolRegistry`
- `RuntimeInput.services`
- runtime gateway legacy fuera de `services/fluxcore/`
- estados canónicos de asistentes
- runtime IDs canónicos por cuenta

---

## Estrategia evolutiva recomendada

## Fase 1 — Congelar ownership canónico sin romper ejecución

Objetivo:
- documentar qué piezas son plataforma y cuáles runtime-owned
- declarar qué servicios actuales son híbridos
- prohibir nuevas responsabilidades platform dentro de runtimes

Acción recomendada:
- adoptar formalmente tres servicios de plataforma separados:
  - `PolicyContextResolver`
  - `RuntimeSelectionResolver`
  - `RuntimeCompositionResolver`

## Fase 2 — Hacer operativa la capa de capacidades

Objetivo:
- convertir la interfaz `RuntimeInput.services` en capa real
- usarla desde `asistentes-local`, `asistentes-openai` y futuros runtimes

Acción recomendada:
- unificar `tool-registry.service.ts`, `core/capabilities/*`, `ai-tools.service.ts` y rutas auxiliares bajo una misma fachada de capabilities.

## Fase 3 — Sacar knowledge/templates del runtime local como implementación propia

Objetivo:
- que el runtime decida **cuándo** usar capabilities, pero no implemente sus detalles.

Acción recomendada:
- mover la definición canónica de tool schemas y su ejecución al plano plataforma,
- dejar en el runtime solo la lógica de decisión/tool loop.

## Fase 4 — Purificar Fluxi

Objetivo:
- que Fluxi reciba todo resuelto desde plataforma,
- sin `workEngineService` ni `messageCore` inyectados dentro de `runtimeConfig`.

Acción recomendada:
- poblar realmente `activeWork` y `workDefinitions` en el input pre-resuelto,
- dejar que `ActionExecutor` sea el único mediador de persistencia/efecto.

## Fase 5 — Eliminar coexistencias ambiguas

Objetivo:
- retirar rutas legacy una vez que la capa nueva cubra completamente el comportamiento necesario.

Acción recomendada:
- descontinuar formalmente:
  - `services/runtime-gateway.service.ts` legacy
  - `smart-delay.service.ts`
  - tool systems paralelos no integrados

## Fase 6 — Reconstrucción documental oficial

Objetivo:
- actualizar `exhaustive-mapping` para que refleje el sistema real ya consolidado.

Prioridades documentales:
- `02-backend-landscape/cognitive-dispatcher.service.md`
- `02-backend-landscape/tool-registry.service.md`
- `03-database-landscape/account-governance.md`
- `03-database-landscape/fluxcore-assistants.md`
- `03-database-landscape/cognition-queue.md`
- `04-end-to-end-flows/*`

---

## Definición canónica propuesta

La capa cognitiva de FluxCore debe entenderse así:

> **FluxCore Cognitive Platform** es el subsistema que transforma observaciones certificadas del Kernel en decisiones semánticas, delegando la interpretación concreta a runtimes soberanos y mediando todos los efectos a través de servicios de plataforma y certificación.

Dentro de esa definición:
- **Platform capabilities** son todos los servicios reutilizables por más de un runtime.
- **Runtimes** son motores soberanos de decisión que consumen contexto completo y devuelven acciones declarativas.
- **Orchestrators** son piezas de plataforma que secuencian turnos, contexto, runtime y efectos.
- **Kernel adapters/gateways** son la frontera certificadora con la realidad.

---

## Conclusión final

FluxCore no necesita una reescritura. Necesita una **clarificación operativa de ownership**.

La arquitectura base ya contiene los ingredientes correctos para producción:
- soberanía del Kernel,
- proyección antes de cognición,
- runtimes explícitos,
- mediación de efectos,
- y respuesta AI recertificada.

El problema central ya no es de ausencia de arquitectura, sino de **superposición entre capas**:
- servicios híbridos,
- capacidades declaradas pero no integradas,
- y herencia de etapas anteriores donde un único runtime absorbía implícitamente responsabilidades de plataforma.

La dirección recomendada es inequívoca:

> **todo artefacto consumible por más de un runtime debe consolidarse como capacidad de plataforma; todo runtime debe reducirse a su lógica soberana de decisión.**

Ese movimiento permite evolucionar FluxCore sin romper lo que hoy ya funciona y sin volver a mezclar ownership en futuras expansiones del sistema.
