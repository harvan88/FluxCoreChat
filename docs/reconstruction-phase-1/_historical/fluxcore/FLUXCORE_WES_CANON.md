# FLUXI (WES) — Especificación del Runtime Transaccional

**Documento subordinado a:** `FLUXCORE_CANON.md` (v7.0)
**Identidad:** Fluxi es un runtime completo alternativo de FluxCore. Recibe un mensaje, produce un resultado. Entre ambos puntos, gestiona transacciones de negocio deterministas.

---

## 1. Misión del Runtime

Fluxi existe para resolver operaciones de negocio donde la conversación no es suficiente.

Cuando un usuario dice "Quiero agendar un turno con la Dra. Pérez para el viernes", eso no es charla.
Eso es una **transacción** con múltiples pasos, datos a confirmar y un efecto real en un sistema externo.

Fluxi convierte esa frase en un **Work**: una estructura auditurable que avanza paso a paso hasta producir el efecto deseado o fallar de manera controlada.

---

## 2. El Contrato del Runtime

Fluxi cumple el contrato definido por el Canon Maestro (v7.0, sección 4):

**Entrada:** Un mensaje + PolicyContext (tono, emojis, reglas del contacto, modo) + contexto conversacional (accountId, conversationId).
**Salida:** Un resultado (respuesta al usuario, solicitud de dato faltante, confirmación de operación completada, o señal de no-acción justificada).

Fluxi **no delega al runtime de Asistentes**.
Si no puede resolver el mensaje como transacción, produce una respuesta propia indicándolo.

El PolicyContext incluye las preferencias de atención de la cuenta (tono, formalidad, emojis). Fluxi lo recibe ya resuelto — no lo busca en la DB.

---

## 3. Qué pasa dentro de Fluxi

### 3.1 Fase 1 — ¿Existe un Work activo?

Antes de interpretar nada, Fluxi consulta si ya existe un Work en progreso para la conversación actual.

* **Sí hay Work activo:** El mensaje se entrega al Work Engine como input de continuación (`ingestMessage`). El runtime no busca nuevas intenciones; sigue llenando slots.
* **No hay Work activo:** Se pasa a la Fase 2.

### 3.2 Fase 2 — Interpretación (Cognición acotada)

Se invoca al **WES Interpreter**: un componente cognitivo especializado que analiza el mensaje buscando una intención transaccional.

El Interpreter:
* Recibe el texto y las `WorkDefinitions` activas de la cuenta.
* Devuelve un `ProposedWork` con `candidateSlots` y `evidence` textual, o `null`.

Si devuelve `null`, Fluxi responde indicando que no detectó intención operativa.
No cae al runtime de Asistentes. Nunca.

### 3.3 Fase 3 — Gate de Apertura (Determinista)

El `ProposedWork` debe superar un gate antes de convertirse en Work real:

1. La `WorkDefinition` referida existe y la cuenta tiene permiso.
2. Existe al menos un `bindingAttribute` con `evidence` textual no vacía.
3. No hay conflicto de concurrencia con Works existentes.

Si el gate rechaza, se registra el ProposedWork como descartado y Fluxi responde explicando por qué no puede operar.

### 3.4 Fase 4 — Ejecución del Work (FSM)

Una vez abierto, el Work avanza por estados según su `WorkDefinition`:

| Estado | Significado |
| :--- | :--- |
| `CREATED` | Work instanciado, slots iniciales persistidos. |
| `ACTIVE` | Esperando mensajes del usuario para completar slots. |
| `WAITING_USER` | Fluxi preguntó algo y espera respuesta. |
| `WAITING_CONFIRMATION` | Se emitió un `SemanticContext` y se espera confirmación explícita. |
| `EXECUTING` | Se adquirió un claim y se está invocando una herramienta. |
| `COMPLETED` | Trabajo finalizado con éxito. |
| `FAILED` | Error no recuperable. |
| `EXPIRED` | TTL vencido sin completar. |

### 3.5 Fase 5 — Confirmación Semántica

Cuando un slot es ambiguo o crítico, Fluxi no asume.

1. Genera un `SemanticContext` (UUID único).
2. Envía al usuario una pregunta clara: "¿Te refieres a [valor propuesto]?"
3. Persiste el contexto como `pending`.

Cuando el usuario responde "Sí":
* Se resuelve contra el `SemanticContext` pendiente. Sin LLM.
* Se registra un `SemanticCommit`.
* Si el Work original expiró, se reabre desde el contexto (sin reinterpretar).

### 3.6 Fase 6 — Ejecución de Efectos Externos

Antes de invocar cualquier herramienta irreversible:

1. Se adquiere un `ExternalEffectClaim` → clave `(accountId, semanticContextId, effectType)`.
2. Si el claim falla (ya existe), se aborta sin invocar la herramienta.
3. Si el claim tiene éxito, se invoca la herramienta con `idempotencyKey`.
4. Se registra el `ExternalEffect` con su resultado.

Esto garantiza **exactly-once** incluso ante reintentos, crashes o workers concurrentes.

---

## 4. Entidades del Dominio

### Work
Unidad transaccional de negocio. Tiene un ciclo de vida (FSM), slots tipados y eventos auditables.

### ProposedWork
Hipótesis transaccional generada por el Interpreter. **No hay Work sin ProposedWork previo persistido.**

### Slot
Variable de estado del Work. Cada slot tiene: `path`, `type`, `value`, `source`, `evidence`, `set_by`, `set_at`.

### WorkDefinition
Contrato que define los slots requeridos, la FSM, las políticas de expiración, el `bindingAttribute` y los efectos externos obligatorios.

### SemanticContext
Vínculo entre una pregunta del sistema y una respuesta futura del usuario. Garantiza que una confirmación no se descontextualice.

### ExternalEffectClaim
Lock causal de un solo uso. Garantiza exactly-once para efectos irreversibles.

### WorkEvent
Registro inmutable append-only de todo lo que ocurre en un Work. Auditoría completa.

### DecisionEvent
Registro de cada decisión cognitiva (invocación al Interpreter). Inmutable.

---

## 5. Invariantes de Fluxi

1. Fluxi nunca llama al runtime de Asistentes.
2. No hay Work sin ProposedWork persistido previo.
3. No hay efecto externo sin `ExternalEffectClaim` adquirido.
4. La IA solo propone; el Work Engine (determinista) dispone.
5. Las confirmaciones se resuelven contra `SemanticContext`, nunca con LLM.
6. Todo cambio de estado genera un `WorkEvent` inmutable.
7. Un `SemanticContext` solo puede consumirse una vez.
8. Las herramientas que Fluxi invoca son mediadas por FluxCore (registro y permisos), pero no son propiedad de FluxCore ni de Fluxi.

---

## 6. Modelo de Datos

Referencia: `packages/db/src/schema/wes.ts`

| Tabla | Propósito |
| :--- | :--- |
| `fluxcore_work_definitions` | Contratos de tipos de trabajo. |
| `fluxcore_works` | Instancias de trabajo vivas. |
| `fluxcore_work_slots` | Variables de estado por trabajo. |
| `fluxcore_work_events` | Registro causal append-only. |
| `fluxcore_proposed_works` | Hipótesis transaccionales. |
| `fluxcore_decision_events` | Auditoría cognitiva del Interpreter. |
| `fluxcore_semantic_contexts` | Puentes de confirmación pendiente. |
| `fluxcore_external_effect_claims` | Locks exactly-once. |
| `fluxcore_external_effects` | Resultados de herramientas ejecutadas. |

---

## 7. Qué NO es Fluxi

* No es un chatbot con estado.
* No es un workflow engine genérico (solo ejecuta Works definidos por WorkDefinitions).
* No es el dueño de las herramientas (las usa vía FluxCore).
* No es una capa que "complementa" al Asistente. Es una **alternativa completa**.
