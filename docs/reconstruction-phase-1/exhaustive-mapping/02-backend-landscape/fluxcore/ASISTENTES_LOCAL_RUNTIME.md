# Asistentes Local Runtime – El Cerebro Endógeno

**Ubicación:** `apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime.ts`  
**Responsabilidad:** "Sovereign cognitive runtime" (Canon §4.10). Es la implementación nativa de IA que usa LLMs convencionales (como Groq u OpenAI API cruda, pero de manera local, sin el ecosistema de "OpenAI Assistants").

---

## 🧩 1. Propósito y Canon

Es una implementación completa de un `RuntimeAdapter`. Su labor es tomar el mundo que le entrega el `CognitiveDispatcher` (`RuntimeInput`), pensar, y devolver un arreglo de decisiones (`ExecutionAction[]`).

**Invariantes Estrictas (Canon Inv. 10):**
1. **NO accede a Base de Datos:** Todo su contexto viene ya inyectado en `RuntimeInput`.
2. **NO ejecuta acciones en el mundo real:** Si decide enviar un mensaje, retorna un objeto con esa instrucción, no emite por WebSocket ni escribe en el Kernel.
3. **Es ciego a otros runtimes:** No sabe ni le importa si existe OpenAI Assistants o Fluxy.

---

## 🔄 2. Flujo Cognitivo Interno (Handle Message)

Cuando `handleMessage(input)` es invocado, ocurre una secuencia de 7 pasos internos:

### 2.1 Guardias (Gates)
- **Policy Gate:** Revisa `policyContext.mode`. Si es `'off'`, aborta (`no_action`).
- **Loop Prevention:** Revisa si el último mensaje fue del asistente. Si sí, aborta para evitar un bucle infinito donde la IA se contesta a sí misma.

### 2.2 Prompt Building (Construcción)
- Usa `promptBuilder.buildSystemPrompt(...)`.
- Ensambla las instrucciones de la cuenta, perfil, comportamiento y plantillas en un solo gran "System Prompt".
- Formatea el historial de mensajes de la conversación al formato del LLM (`[{role: 'user', content: '...'}, ...]`).

### 2.3 Tool Selection (Herramientas)
Declara las herramientas que el LLM puede usar en este turno:
- `search_knowledge`: Si el asistente tiene *Vector Stores* configurados (RAG activo).
- `send_template`: Si el asistente tiene plantillas configuradas y autorizadas.

### 2.4 Primera Ejecución (Round 1)
- Llama a `llmClient.complete()` (servicio que sabe hablar con Groq o OpenAI).
- **Escenario A:** El LLM responde con texto. Fin del ciclo. Se arma la acción `send_message`.
- **Escenario B:** El LLM pide usar una herramienta (ej. *Tool Call: search_knowledge("horarios")*).

### 2.5 Tool Execution (Ejecución Interna de Herramientas)
*(Si ocurrió Escenario B)*
- El runtime ejecuta la herramienta.
  - Para `search_knowledge`: Hace una llamada HTTP interna (sin DB directa) al servicio de búsqueda RAG y extrae el texto.
  - Para `send_template`: Extrae variables. Si el LLM decide mandar la plantilla, aborta el ciclo de texto y arma una acción `send_template`.

### 2.6 Segunda Ejecución (Round 2 - Opcional)
- Si se ejecutó RAG, añade el resultado a los mensajes como un "System/Tool context" y vuelve a llamar al LLM (`llmClient.complete()`) para que lea la información encontrada y genere la respuesta final.

### 2.7 Action Resolution
- Retorna un array con el veredicto final. Ej:
  ```json
  [
    { "type": "send_message", "content": "Nuestro horario es de 9 a 18hrs." }
  ]
  ```

---

## 🛠️ 3. Herramientas Soportadas (Tools)

- **`search_knowledge(query)`**: Instruye al LLM para buscar en base documental.
- **`send_template(templateId, variables)`**: Instruye al LLM para responder usando una plantilla pre-aprobada (útil para WhatsApp).

---

## 📋 4. Dependencias Clave

- **`llmClient`**: Abstracción del cliente HTTP hacia proveedores de IA (Groq, OpenAI).
- **`promptBuilder`**: Motor de ensamblaje de prompts de texto.
- No importa ni `db` ni dependencias de persistencia.
