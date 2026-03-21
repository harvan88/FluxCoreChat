# Flujo End-to-End del Pipeline Cognitivo (FluxCore)

**Ubicación de referencia:** `04-end-to-end-flows/fluxcore/COGNITIVE_PIPELINE_FLOW.md`  
**Propósito:** Mapear el ciclo completo desde que un usuario deja de escribir, hasta que la IA genera una respuesta que llega a su pantalla.

---

## 🔄 El Ciclo de Vida del Pensamiento de la IA

Este es el proceso canónico "Live Cognitive Pipeline" (Sistema Nervioso de FluxCore).

### 1. El Detonante (Ingreso y Reloj)
1. **Usuario envía un mensaje** o deja de emitir señales "escribiendo".
2. `ChatProjector` o los WebSockets extienden la ventana de turno (`turn_window_expires_at`) en `fluxcore_cognition_queue`.
3. El reloj avanza. Cuando la ventana expira, el humano ha terminado su turno.

### 2. El Despertar (Cognition Worker)
1. `CognitionWorker` hace polling o recibe evento de `wakeup`.
2. Encuentra la conversación dormida.
3. Bloquea la fila en la BD (`FOR UPDATE SKIP LOCKED`) para evitar carreras de workers.
4. Genera un `triggerSignalId` para trazabilidad y llama a `CognitiveDispatcher`.

### 3. La Formación de Contexto (Cognitive Dispatcher)
1. **¿Qué modo tiene?** Resuelve `PolicyContext` (auto, sugerencia, apagado).
2. **¿Quién soy?** Extrae la `RuntimeConfig` (qué asistente, modelo y proveedor usar).
3. **¿Qué pasó?** Lee de la BD los últimos N `messages` (historial semántico).
4. El Dispatcher dice a la UI: *"La IA está escribiendo..."*

### 4. Enrutamiento y Ejecución (Runtimes)
1. El Dispatcher entrega el gran paquete (`RuntimeInput`) al `RuntimeGateway`.
2. El Gateway rutea al adaptador correspondiente (Ej: `AsistentesLocal`).
3. **Dentro del Runtime (Caja Blanca de 7 fases):**
   - *Input Validation*
   - *Policy Gate*
   - *Prompt Building* (Convierte contexto en instrucciones de sistema).
   - *Tool Selection* (Define RAG, Plantillas).
   - *LLM Completion* (Habla con Groq o OpenAI).
   - *Tool Execution* (Ejecuta las herramientas internamente).
   - *Action Resolution* (Produce un array de acciones, ej. "Responder texto X").

### 5. La Manifestación en la Realidad (Action Executor & Gateway)
1. El runtime devuelve `ExecutionAction[]` al Dispatcher.
2. El Dispatcher se las pasa a `ActionExecutor`.
3. El Executor identifica la acción de tipo `send_message` y la envía al `CognitionGateway`.
4. El **CognitionGateway** empaqueta el mensaje, lo firma criptográficamente y se lo grita al **Kernel**: `kernel.ingestSignal('AI_RESPONSE_GENERATED')`.

### 6. Proyección Final al Usuario
1. El Kernel valida la firma y guarda el hecho.
2. `ChatProjector` lee el hecho del Kernel.
3. Lo inserta en la tabla real de `messages`.
4. Emite WebSocket `message:new`.
5. El Frontend del usuario (`useChat`) dibuja el mensaje en pantalla.

---

## 📊 Diagrama Simplificado

```text
[Frontend] --(silencio)--> [Cola DB] 
                              │
                        CognitionWorker 
                              │
                      CognitiveDispatcher 
                     (Contexto + Historial)
                              │
                        RuntimeGateway
                              │
                      AsistentesLocal (LLM)
                              │
                        ActionExecutor
                              │
                      CognitionGateway
                              │
[Frontend] <--(Socket)-- [Kernel (ChatCore)]
```

---

## 🎯 Puntos Clave de Soberanía

- **El LLM no tiene acceso a BD:** Solo recibe el `RuntimeInput` puro.
- **FluxCore no escribe en chat:** FluxCore le pide al *Kernel* que certifique que pensó algo. ChatCore se encarga de mostrarlo.
- **Runtimes Intercambiables:** Si pasas de local a OpenAI, el Dispatcher y el Kernel ni se enteran; solo cambia el adaptador en el Gateway.
