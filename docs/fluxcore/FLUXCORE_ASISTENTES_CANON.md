# ASISTENTES — Especificación de los Runtimes Cognitivos

**Documento subordinado a:** `FLUXCORE_CANON_FINAL_v8.3.md` (v8.3)

Este documento especifica los dos runtimes cognitivos de FluxCore v8.3:
* **Asistentes Local** (`asistentes-local`) — ejecución interna con control total del prompt y herramientas.
* **Asistentes OpenAI** (`asistentes-openai`) — ejecución remota vía OpenAI Assistants API.

Ambos son runtimes paralelos e independientes. No son sub-modos de un mismo runtime.

---

## 1. Misión Compartida

Ambos runtimes existen para resolver interacciones conversacionales donde el usuario necesita información, orientación o acciones que no requieren la formalidad transaccional de un Work (Fluxi).

Cuando un usuario dice "¿Cuáles son los horarios de atención?", eso no es una transacción. Es una **consulta** que se resuelve con cognición, contexto de negocio y herramientas de búsqueda.

---

## 2. El Contrato de Runtime (Canon §4.9)

Ambos runtimes implementan la interfaz `RuntimeAdapter` y son invocados por el `CognitionWorker` a través del `RuntimeGateway` una vez que el turno conversacional está cerrado y el contexto resuelto.

**Entrada:** `RuntimeInput` (PolicyContext + RuntimeConfig + ConversationHistory).
**Salida:** `Promise<ExecutionAction[]>` (Intentos de efecto en el mundo).

### Invariantes de los Runtimes Cognitivos:
1. **Soberanía de Datos**: No consultan bases de datos directamente. Todo el contexto llega pre-resuelto en el input.
2. **Mediación de Efectos**: No ejecutan acciones directamente. Devuelven una lista de `ExecutionAction` que el `ActionExecutor` valida y procesa.
3. **Independencia**: No se invocan entre sí. El orquestador decide cuál usar según la configuración de la cuenta.
4. **Unidad de Decisión**: Procesan un turno completo (uno o más mensajes del usuario agrupados por ventana temporal).

---

## 3. Runtime: Asistentes Local

### 3.1 Ubicación
`apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`

### 3.2 Naturaleza
Pipeline completo de LLM ejecutado internamente. FluxCore controla el prompt system, las llamadas al modelo (via Groq/OpenAI completions), y el loop de herramientas mediadas.

### 3.3 Flujo de Ejecución (Síncrono para el Worker)
1. **Recepción**: Recibe `RuntimeInput`.
2. **Prompt Building**: `PromptBuilder` genera el system message combinando:
   * **PolicyContext**: Tono, idioma, emojis, y `resolvedBusinessProfile` (datos de la empresa autorizados).
   * **RuntimeConfig.instructions**: Instrucciones específicas del asistente configuradas por el usuario.
3. **Tool Offering**: Decide qué herramientas ofrecer (RAG si hay vector stores, Templates si están autorizadas).
4. **LLM Call**: Llama al provider configurado (Groq es el default).
5. **Tool Loop**: Máximo 2 rondas de ejecución de herramientas (ej: buscar en conocimiento -> re-generar respuesta).
6. **Resultado**: Devuelve `send_message` o `send_template`.

---

## 4. Runtime: Asistentes OpenAI

### 4.1 Ubicación
`apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`

### 4.2 Naturaleza
FluxCore actúa como puente hacia la API de Assistants de OpenAI. El historial se formatea como un thread y la política de negocio se inyecta como un override de instrucciones.

### 4.3 Flujo de Ejecución
1. **Thread Sync**: Convierte `conversationHistory` en mensajes de thread de OpenAI.
2. **Policy Injection**: Genera un bloque de instrucciones de prioridad máxima basado en el `PolicyContext` (voz del negocio).
3. **Run**: Inicia un run en OpenAI usando el `externalAssistantId` del `RuntimeConfig`.
4. **Polling**: Espera la finalización del run.
5. **Resultado**: Extrae el contenido y devuelve la acción `send_message`.

---

## 5. Herramientas y Capacidades (Canon §4.13)

### 5.1 Consultas Mediadas (Selective RAG)
A diferencia de un RAG tradicional que se inyecta "a ciegas" antes del prompt, en FluxCore v8.3 el runtime ofrece la capacidad de búsqueda como una herramienta que **el modelo decide invocar** si considera que su contexto base es insuficiente. Esto optimiza el consumo de tokens y garantiza que la búsqueda sea pertinente a la intención comprendida.

* `search_knowledge`: Servicio de búsqueda semántica en los `vectorStoreIds` autorizados. Requiere ejecución de loop (round 1).

### 5.2 Effect Actions (Efectos en el mundo)
Intenciones que el runtime declara y el `ActionExecutor` procesa.
* `send_message`: Respuesta de texto libre.
* `send_template`: Envío de una plantilla formal registrada en ChatCore.
* `no_action`: El runtime decidió no responder (ej: mensaje no comprendido o fuera de política).

---

## 6. La Separación de Configuración (Canon §1.3)

Es fundamental distinguir las dos fuentes de verdad que recibe el runtime en su `RuntimeInput`:

| Concepto | Origen | Qué controla |
| :--- | :--- | :--- |
| **PolicyContext** | Negocio / Canal | Tono, Modo (Auto/Suggest), Horarios, Datos Autorizados, Plantillas permitidas. |
| **RuntimeConfig** | Config. del Asistente | Instrucciones técnicas, Modelo (Llama/GPT), Temperatura, ID del Asistente externo, Vector Stores. |

---

## 7. Invariantes Específicas

1. **Gate de Modo**: Si `policyContext.mode === 'off'`, el runtime devuelve `no_action` inmediatamente sin llamar al LLM.
2. **Loop Prevention**: Si el último mensaje en la historia no es de rol `user`, el runtime aborta para evitar ciclos infinitos de IA hablando con IA.
3. **Finitud**: El loop de herramientas en Asistentes Local está limitado a 2 iteraciones para controlar costos y latencia.
4. **Idempotencia de Acción**: Las respuestas se vinculan al ID de la conversación. El `ActionExecutor` garantiza que no se envíen duplicados.

---

## 8. Qué NO son estos runtimes

* No son motores transaccionales (no son Fluxi).
* No son dueños de las herramientas; las consumen vía capacidades mediadas.
* No son dueños de la política; la ejecutan según les llega en el `PolicyContext`.
* No deciden si ejecutarse o no; esa decisión es del `CognitionWorker` basándose en la ventana del turno y el modo de automatización.
