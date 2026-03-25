# Matriz de ownership — Plataforma vs Runtime en FluxCore

**Fecha:** 2026-03-25
**Propósito:** clasificar responsabilidades de la capa cognitiva entre platform ownership, orchestration ownership y runtime ownership, indicando estado real, drift y prioridad evolutiva.

---

## Criterio de clasificación

Se usa la siguiente regla:

- si una responsabilidad puede ser consumida por más de un runtime, su ownership correcto es **plataforma**;
- si una responsabilidad decide la semántica final de respuesta de un motor concreto, su ownership correcto es **runtime**;
- si una responsabilidad secuencia turnos, contexto, runtime y efectos, su ownership correcto es **orquestación de plataforma**.

---

## Leyenda

- **Ownership correcto**: dónde debería vivir canónicamente
- **Estado actual**: cómo aparece hoy en el código
- **Drift**: divergencia entre diseño esperado y ejecución real
- **Prioridad**:
  - `P0` inconsistencia estructural crítica
  - `P1` consolidación importante
  - `P2` mejora recomendada
  - `P3` observación o cleanup

---

## Matriz

| Dominio / responsabilidad | Ownership correcto | Estado actual observado | Evidencia principal | Drift | Prioridad | Dirección recomendada |
|---|---|---|---|---|---|---|
| Certificación de señales externas | Plataforma | Consolidado | `apps/api/src/core/kernel.ts`, gateways/adapters | Bajo | P2 | Mantener Kernel como borde soberano |
| Registro inmutable de realidad | Plataforma | Consolidado | `fluxcore_signals`, `kernel.ts` | Bajo | P2 | Mantener sin interpretación de negocio en Kernel |
| Proyección identidad / chat | Plataforma | Consolidado | `chat-projector.ts`, `identity-projector.ts` | Bajo | P2 | Mantener proyección previa a cognición |
| Encolado de turnos cognitivos | Plataforma | Consolidado | `chat-projector.ts`, `fluxcore_cognition_queue` | Bajo | P2 | Mantener cola como unidad operativa del turno |
| Polling y lock seguro de turnos | Plataforma | Consolidado | `workers/cognition-worker.ts` | Bajo | P2 | Mantener worker sin lógica de negocio |
| Cierre de turno | Plataforma | Consolidado | `action-executor.service.ts` | Bajo | P2 | Mantener cierre centralizado |
| Resolución de PolicyContext | Plataforma | Parcial / híbrido | `flux-policy-context.service.ts` | Alto: mezcla con runtimeConfig | P0 | Separar política de negocio de composición técnica |
| Selección de runtime activo | Plataforma | Fragmentado | `runtime-config.service.ts`, `cognitive-dispatcher.service.ts`, `runtime.service.ts` | Alto: múltiples fuentes efectivas | P0 | Crear un resolver único para runtime selection |
| Composición del runtime ejecutable | Plataforma | Fragmentado | `flux-policy-context.service.ts`, `runtime.service.ts`, `ai-execution-plan.service.ts` | Alto | P0 | Separar `RuntimeSelection` de `RuntimeComposition` |
| Resolución de asistente activo | Plataforma | Parcialmente consolidado | `services/fluxcore/runtime.service.ts` | Medio: convive con preferred override y consultas paralelas | P1 | Convertirlo en única fuente operativa |
| Runtime registry / routing | Orquestación de plataforma | Consolidado en ruta nueva, duplicado en legacy | `services/fluxcore/runtime-gateway.service.ts`, `services/runtime-gateway.service.ts` | Alto por coexistencia | P1 | Retirar gateway legacy cuando ya no tenga consumidores |
| Contrato `RuntimeInput` pre-resuelto | Plataforma | Parcial | `core/fluxcore-types.ts`, `cognitive-dispatcher.service.ts` | Alto: interfaz `services` declarada pero no inyectada | P1 | Hacer el contrato real y obligatorio |
| Historial conversacional para inferencia | Plataforma | Consolidado | `cognitive-dispatcher.service.ts` | Bajo | P2 | Mantener resolución previa al runtime |
| Automation mode gate | Plataforma | Consolidado | `cognitive-dispatcher.service.ts`, account policies | Bajo | P2 | Mantener fuera del runtime |
| Typing keepalive | Plataforma | Parcial | `cognitive-dispatcher.service.ts` | Medio: lógica temporal distribuida | P2 | Integrar con política temporal del turno |
| Turn window / SmartDelay | Plataforma | Parcial / distribuido | `chat-projector.ts`, `cognition-worker.ts`, schema de policies | Alto: config DB no gobierna toda la ejecución | P1 | Unificar control temporal en una sola capa |
| Prompt building reusable | Plataforma | Parcial | `prompt-builder.service.ts`, runtimes | Medio: parte reusable, parte específica por runtime | P2 | Mantener base común y permitir extensiones por runtime |
| Tool capability catalog | Plataforma | Declarado pero no operativo como SSOT | `core/capabilities/*`, `tool-registry.service.ts` | Alto: no gobierna pipeline real | P0 | Convertir capabilities en fachada única usada por runtimes |
| Tool offering por asistente/contexto | Plataforma | Fragmentado | `tool-registry.service.ts`, `asistentes-local.runtime.ts`, `ai-tools.service.ts` | Alto | P0 | Unificar oferta de herramientas por política/capacidad |
| Tool execution mediated | Plataforma | Fragmentado | `tool-registry.service.ts`, `ai-tools.service.ts`, runtime local | Alto | P0 | Una sola vía de ejecución y auditoría |
| Tool authorization | Plataforma | Parcial | `template-registry.service.ts`, `ai-template.service.ts`, `tool-registry.service.ts` | Medio | P1 | Centralizar autorización para todas las capabilities |
| Knowledge / RAG search | Plataforma | Duplicado / embebido en runtime local | `knowledge.capability.ts`, `retrieval.service.ts`, `asistentes-local.runtime.ts` | Muy alto | P0 | Sacar implementación del runtime y exponer capability única |
| Transporte para RAG interno | Plataforma | Incorrectamente acoplado al runtime | `asistentes-local.runtime.ts` hace `fetch()` a `/fluxcore/runtime/rag-context` | Alto | P1 | Sustituir HTTP interno por llamada de servicio/capability |
| Templates authorization | Plataforma | Bastante consolidado | `template-registry.service.ts`, `ai-template.service.ts` | Bajo/medio | P2 | Mantener `template-registry` como SSOT |
| Templates listing / send | Plataforma | Aún duplicado | `template-registry.service.ts`, `ai-tools.service.ts`, `asistentes-local.runtime.ts`, rutas runtime | Medio/alto | P1 | Unificar bajo capability única |
| Inyección de instrucciones de templates | Plataforma | Consolidado | `template-registry.service.ts` | Bajo | P2 | Mantener runtime-time injection |
| Efectos de mensajería AI | Plataforma | Consolidado | `action-executor.service.ts`, `cognition-gateway.service.ts`, `chat-projector.ts` | Bajo | P2 | Mantener recertificación antes de entrega |
| Efectos WES / works | Plataforma | Parcialmente consolidado | `action-executor.service.ts`, `FluxiRuntime` | Medio | P1 | Mantener efectos en ActionExecutor, no dentro del runtime |
| Lógica semántica de conversación general | Runtime | Correctamente ubicada | `asistentes-local.runtime.ts`, `asistentes-openai.runtime.ts` | Bajo | P2 | Mantener en runtime |
| Lógica específica de proveedor OpenAI Assistants | Runtime | Correctamente ubicada | `asistentes-openai.runtime.ts`, `openai-sync.service.ts` | Bajo | P2 | Mantener específica del runtime |
| Tool loop del modelo | Runtime | Correctamente runtime-owned, pero mal conectado a capabilities | `asistentes-local.runtime.ts` | Medio | P1 | Mantener el loop en runtime, mover ejecución a plataforma |
| Interpretación transaccional WES | Runtime | Correctamente runtime-owned en intención | `fluxi.runtime.ts` | Bajo | P2 | Mantener semántica en Fluxi |
| Acceso a servicios de infraestructura desde runtime | Plataforma / Orquestación | Incorrectamente inyectado en runtime | `fluxi-dependency-injection.ts` | Alto | P1 | Reemplazar por input pre-resuelto + acciones declarativas |
| Work definitions para Fluxi | Plataforma | Incompleto | `flux-policy-context.service.ts`, `fluxi.runtime.ts` | Alto: resuelve pero no propaga correctamente | P1 | Poblar realmente `activeWork` y `workDefinitions` |
| Estados canónicos de asistentes | Plataforma | Inconsistente | docs + schema comentado vs servicios (`active`/`production`) | Alto | P0 | Unificar vocabulario y consultas |
| Runtime IDs canónicos | Plataforma | Inconsistente | docs governance vs código real | Alto | P0 | Normalizar naming canónico y mapping único |
| End-to-end flow documentation | Documentación de plataforma | Incompleto / faltante | `04-end-to-end-flows/` vacío | Alto documental | P1 | Reconstruir flujo real certificado |
| Legacy runtime gateway | Cleanup de plataforma | Presente | `services/runtime-gateway.service.ts` | Medio/alto | P1 | Declarar obsoleto y retirar cuando esté aislado |
| `smart-delay.service.ts` legacy | Cleanup de plataforma | Presente | referencias en docs/análisis | Medio | P3 | Retirar tras consolidación temporal |
| `ai-tools.service.ts` paralelo | Plataforma | Presente y operativo fuera del pipeline canónico | `services/ai-tools.service.ts` | Alto | P1 | Integrar o descontinuar |

---

## Lectura sintética por capa

## A. Ownership correcto de plataforma

Estas responsabilidades deben considerarse definitivamente platform-owned:

- Kernel y certificación
- gateways/adapters de realidad
- proyectores
- cognition queue
- cognition worker
- policy resolution
- runtime selection
- runtime composition
- capabilities/tool registry
- RAG/knowledge
- templates authorization y execution
- action execution
- cognition gateway
- turn timing governance
- WES effect mediation

## B. Ownership correcto de runtime

Estas responsabilidades deben permanecer runtime-owned:

- estrategia de interpretación del input
- prompt strategy específica del motor
- protocolo específico del proveedor
- secuencia interna de rounds/tool loop
- decisión semántica final
- producción de `ExecutionAction[]`

## C. Ownership correcto de orquestación

Estas piezas son platform-owned pero específicamente de orquestación:

- `CognitiveDispatcher`
- `RuntimeGateway`
- `CognitionWorker`
- cierre de turno
- typing keepalive
- resolución completa del `RuntimeInput`

---

## Principales conflictos de ownership detectados

## 1. `FluxPolicyContextService` es híbrido

Conflicto:
- debería resolver política,
- pero también participa en runtime composition.

Resultado:
- plataforma de gobernanza y plataforma técnica quedaron mezcladas.

## 2. `asistentes-local.runtime.ts` contiene capacidades que deberían vivir fuera

Conflicto:
- decide usar tools, lo cual es correcto,
- pero además define y ejecuta herramientas knowledge/templates.

Resultado:
- un runtime específico absorbió responsabilidades cross-runtime.

## 3. Fluxi recibe infraestructura en lugar de contexto completamente pre-resuelto

Conflicto:
- el canon dice runtime puro con input resuelto,
- la implementación aún inyecta `workEngineService` y `messageCore`.

Resultado:
- el runtime no está purificado como unidad soberana de decisión.

## 4. La plataforma declara `RuntimeInput.services`, pero la ejecución real no depende de ella

Conflicto:
- el contrato existe,
- los runtimes reales no lo consumen.

Resultado:
- la arquitectura declarada y la ejecutada divergen.

---

## Orden de consolidación recomendado

## Prioridad P0

- separar `PolicyContext` de `RuntimeConfig`
- unificar selección/composición del runtime
- convertir capabilities/tool registry en capa operativa real
- sacar knowledge del runtime local
- unificar estados canónicos de asistentes
- unificar runtime IDs canónicos

## Prioridad P1

- consolidar templates como capability única
- purificar Fluxi para que no reciba infraestructura interna
- propagar correctamente `workDefinitions` y `activeWork`
- retirar gateway legacy
- unificar gobernanza temporal del turno
- integrar o retirar `ai-tools.service.ts`
- reconstruir documentación end-to-end

## Prioridad P2

- mantener y endurecer las piezas ya buenas
- separar mejor prompt reusable vs prompt-specific
- formalizar typing keepalive dentro de política temporal

## Prioridad P3

- cleanup de artefactos legacy secundarios

---

## Regla canónica operativa resultante

La regla arquitectónica que surge del análisis es:

> **Un runtime no debe poseer ninguna responsabilidad cuya implementación pueda ser compartida por más de un runtime.**

Por lo tanto:
- si algo puede servir a `asistentes-local`, `asistentes-openai` y futuros runtimes, pertenece a plataforma;
- si algo expresa la forma propia en que un motor decide, pertenece al runtime.

---

## Conclusión

La matriz muestra que FluxCore ya posee una estructura base madura, pero todavía conserva varios puntos donde el ownership correcto está declarado de una forma y ejecutado de otra.

El problema dominante no es falta de componentes, sino **fronteras todavía por consolidar**.

La frontera más importante a cerrar es esta:

- **plataforma** prepara contexto, herramientas, autorización, efectos y certificación;
- **runtime** interpreta, decide y devuelve acciones declarativas.

Cuando esa separación quede operativa en código, la arquitectura cognitiva de FluxCore quedará alineada con su propio canon y será mucho más escalable para nuevos runtimes y nuevas capacidades compartidas.
