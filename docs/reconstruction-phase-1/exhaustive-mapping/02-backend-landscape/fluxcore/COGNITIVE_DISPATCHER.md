# Cognitive Dispatcher – El Enrutador de Decisiones

**Ubicación:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`  
**Responsabilidad:** "The Decision Router" (Canon §4.9). Prepara todo el contexto necesario y decide qué motor de IA debe atender la petición.

---

## 🧩 1. Propósito y Canon

El Dispatcher actúa como el cerebro coordinador. Cuando el `CognitionWorker` dice "es hora de responder", el Dispatcher responde a "¿Bajo qué reglas, con qué contexto y a quién le pregunto?".

Cumple la **Invariante Canónica 10**: El `RuntimeInput` debe estar 100% completo *antes* de invocar a cualquier runtime. Ningún runtime busca su propio contexto general.

---

## 🔄 2. Responsabilidades Principales (Flujo de Ejecución)

Cuando `dispatch()` es invocado:

1. **Resolución de Gobernanza (`PolicyContext`):**
   - Determina el `mode` actual (auto, suggest, off).
   - Decide si el asistente está autorizado a intervenir.
2. **Resolución de Configuración Técnica (`RuntimeConfig`):**
   - Consulta qué asistente está activo.
   - Extrae proveedor (OpenAI, Groq), modelos, temperatura.
3. **Construcción de Memoria (`ConversationMessage[]`):**
   - Obtiene los últimos N mensajes (historial semántico).
   - *Nota:* Envía mensajes limpios, no señales crudas del Kernel.
4. **Señal de Supervivencia (Keepalive):**
   - Emite una señal de "typing" al frontend para indicar que la IA ha empezado a "pensar".
5. **Delegación a Runtime:**
   - Envía todo el paquete (`RuntimeInput`) al `RuntimeGateway`.
6. **Ejecución de Acciones:**
   - Toma las decisiones devueltas por el runtime (ej. "Enviar mensaje X") y las pasa al `ActionExecutor`.

---

## 🗄️ 3. Estructura de Datos Crítica: `RuntimeInput`

El objeto que el Dispatcher ensambla y pasa a los runtimes:

```typescript
interface RuntimeInput {
    policyContext: PolicyContext;
    runtimeConfig: RuntimeConfig;
    conversationHistory: ConversationMessage[];
    triggerSignalId?: string | number; // Heredado del pipeline para trazabilidad unificada
}
```

---

## 🛡️ 4. Control de Fallos y Stop Propagation

El Dispatcher devuelve un objeto `DispatchResult`. 
- Si un modo está en `off`, devuelve `success: true` pero con 0 acciones (fue una decisión válida no hacer nada).
- Si el runtime falla o no se encuentra, marca un `error` y el `CognitionWorker` determinará si se hace *backoff* (espera y reintento).

---

## 📋 5. Dependencias Clave

- **`fluxPolicyContextService`:** Resuelve permisos y modos de IA.
- **`runtimeGateway`:** Quien realmente sabe dónde encontrar al proveedor de IA.
- **`actionExecutor`:** Ejecuta las acciones decididas por la IA.
