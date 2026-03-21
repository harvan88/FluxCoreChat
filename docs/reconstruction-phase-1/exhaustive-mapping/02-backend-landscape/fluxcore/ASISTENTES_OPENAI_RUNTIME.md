# Asistentes OpenAI Runtime – El Cerebro Exógeno

**Ubicación:** `apps/api/src/services/fluxcore/runtimes/asistentes-openai.runtime.ts`  
**Responsabilidad:** "Sovereign cognitive runtime". Implementación que delega toda la cognición, memoria (Threads) y RAG directamente a la API de **OpenAI Assistants**.

---

## 🧩 1. Propósito y Diferencias

A diferencia de `AsistentesLocal` (que maneja su propio bucle de llamadas LLM y ensambla el historial), este runtime delega el control cognitivo a los servidores de OpenAI. 

Cumple con las mismas invariantes (Canon Inv. 10): no toca la BD y devuelve `ExecutionAction[]`.

---

## 🔄 2. Flujo Cognitivo (OpenAI API Lifecycle)

El método `handleMessage(input)` se comunica con la API de OpenAI usando `openaiSync`.

### 2.1 Guardias (Gates)
Idéntico a local: aborta si el `mode` es `off` o si el último mensaje es del asistente (prevención de loop).

### 2.2 Sincronización de Contexto Exógeno
- **Thread:** Verifica si la conversación ya tiene un "Thread ID" de OpenAI asociado. Si no, lo crea o sincroniza.
- **Message:** Sube el último mensaje del usuario al Thread de OpenAI.

### 2.3 Ejecución del Assistant (The Run)
- Crea un `Run` en OpenAI asociando el Thread con el `externalAssistantId` que viene en el `RuntimeConfig`.
- **Inyección de Prompt Dinámico:** Aunque el Assistant vive en OpenAI, FluxCore inyecta `instructionsOverride` (ej. si el modo es "sugerencia" o si hay plantillas que deba conocer) en el mismo instante de la ejecución.

### 2.4 Polling y Tool Calls (Requires Action)
- El runtime hace polling a la API de OpenAI esperando que el `Run` cambie de estado (`completed` o `requires_action`).
- **Si OpenAI pide Tools (requires_action):**
  - Si OpenAI pide `search_knowledge`, FluxCore *no lo ejecuta aquí* (OpenAI lo ejecuta nativamente si tiene archivos cargados). Ojo: Si FluxCore declara funciones a OpenAI, es aquí donde este runtime las intercepta, las ejecuta usando servicios internos, y sube el resultado (`submitToolOutputs`).
  - Si OpenAI pide `send_template`, captura la orden y aborta el Run de texto.

### 2.5 Extracción de Respuesta
- Cuando el Run termina (`completed`), el runtime lee la lista de mensajes del Thread, extrae el texto generado por la IA de OpenAI, y lo empaca como un `ExecutionAction` (`send_message`).

---

## 🌐 3. Soberanía Híbrida

Este runtime es un caso especial porque la "memoria" existe en dos lados:
- El Kernel de FluxCore (la verdad absoluta).
- El Thread de OpenAI (la memoria operativa de ese LLM).

El runtime es el traductor que garantiza que lo que ocurre en el Thread termine convirtiéndose en acciones que el `CognitionGateway` pueda certificar en el Kernel.

---

## 📋 4. Dependencias Clave

- **`openaiSync`**: Servicio wrapper alrededor del SDK oficial de `openai` para Node.js, maneja Threads y Runs.
