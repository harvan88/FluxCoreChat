# 🐛 Análisis del Bug: Modo Supervisado (Suggest) Envía Automáticamente

## 📋 **Reporte del Usuario**

> "En modo supervisado me asombró (positivamente). Del lado del actor que responde con la IA en modo supervisado la respuesta se preparó en un campo sobre el input se ve que ese componente se puede trabajar más pero me agradó de que estuviera el mensaje preparado. No obstante el mensaje si se envió automáticamente, es decir quedó capturado en el input pero de todos modos se envió. En el caso supervisado es el humano quien debe enviar el mensaje final."

## 🎯 **Comportamiento Esperado vs Real**

### ✅ **Comportamiento Esperado (Modo Suggest)**
1. IA genera respuesta
2. Respuesta aparece en `SuggestResponsePanel` sobre el input
3. Humano ve botones: "Rechazar", "Editar", "Aprobar y enviar"
4. **Mensaje NO se envía automáticamente**
5. Humano debe decidir si enviar, editar o rechazar

### ❌ **Comportamiento Actual (Bug)**
1. IA genera respuesta ✅
2. Respuesta aparece en `SuggestResponsePanel` ✅
3. **Mensaje se envía automáticamente** 🚨
4. `SuggestResponsePanel` muestra mensaje ya enviado

---

## 🔍 **Análisis del Flujo de Ejecución**

### **Punto de Entrada: Mensaje Entrante**
```
Usuario envía mensaje → WebSocket → ws-handler.ts → cognitive-dispatcher.service.ts
```

### **El Problema Exacto: cognitive-dispatcher.service.ts**

#### **🚨 Línea 247 - El Error Crítico**
```typescript
// 🚨 PROBLEMA: Ejecuta acciones ANTES de verificar el modo
const executionData = await actionExecutor.execute(actions, {
    turnId,
    conversationId,
    accountId,
    targetAccountId: queueEntry?.targetAccountId || 'unknown',
    runtimeId,
    policyContext,
    runtimeConfig: input.runtimeConfig,
    triggerSignalId: params.lastSignalSeq || undefined,
});
```

#### **🚨 Línea 275-289 - Demasiado Tarde**
```typescript
// 🚨 PROBLEMA: Verificación del modo DESPUÉS de ejecutar
if (policyContext.mode === 'suggest') {
    console.log(`[CognitiveDispatcher] 🤝 MANUAL MODE: Creating suggestion for operator review`);
    const suggestion = actions.find(a => a.type === 'send_message') as any;
    if (suggestion?.content) {
        // 💀 El mensaje ya fue enviado por actionExecutor.execute() arriba
        // Solo crea una copia en ai_suggestions pero el daño está hecho
        await db.insert(aiSuggestions).values({
            conversationId,
            accountId,
            content: suggestion.content,
            model: enrichedRuntimeConfig.model || 'unknown',
            provider: enrichedRuntimeConfig.provider || 'unknown',
            status: 'pending',
        });
    }
}
```

---

## 🔧 **Flujo Completo del Bug**

### **1. Llega Mensaje Entrante**
```
Usuario escribe "Hola" → WebSocket → cognitive-dispatcher
```

### **2. Dispatcher Prepara Acciones**
```typescript
// actions = [{ type: 'send_message', content: '¡Hola! ¿En qué puedo ayudarte?' }]
```

### **3. 🚨 Ejecuta Sin Importar Modo**
```typescript
// LÍNEA 247: Ejecuta SIEMPRE las acciones
const executionData = await actionExecutor.execute(actions, {...});

// Dentro de actionExecutor.execute() → executeSendMessage()
// → cognitionGateway.certifyAiResponse()
// → Kernel crea señal AI_RESPONSE_GENERATED
// → ChatProjector observa y envía mensaje automáticamente
// 💀 MENSAJE ENVIADO A CHATCORE
```

### **4. 🚨 Verificación Demasiado Tarde**
```typescript
// LÍNEA 275: Ahora verifica el modo
if (policyContext.mode === 'suggest') {
    // 💀 Ya es tarde, el mensaje está en ChatCore
    // Solo crea una copia en ai_suggestions
}
```

### **5. Resultado Final**
- ✅ Mensaje enviado a ChatCore
- ✅ Mensaje visible en conversación  
- ✅ Sugerencia guardada en `ai_suggestions`
- ❌ `SuggestResponsePanel` muestra mensaje ya enviado
- ❌ Humano perdió el control de aprobación

---

## 🎯 **Componentes del Frontend Involucrados**

### **✅ SuggestResponsePanel (Correcto)**
```typescript
// apps/web/src/extensions/fluxcore/components/SuggestResponsePanel.tsx
// Botones: "Rechazar", "Editar", "Aprobar y enviar"
// Diseñado para modo supervisado
```

### **❌ Flujo Backend (Incorrecto)**
```typescript
// cognitive-dispatcher.service.ts
// actionExecutor.execute() se ejecuta antes de verificar modo
```

---

## 🔧 **Solución Propuesta**

### **Opción 1: Modificar CognitiveDispatcher (Recomendada)**

```typescript
// cognitive-dispatcher.service.ts - LÍNEA 247
if (policyContext.mode === 'suggest') {
    // 🚀 MODO SUGGEST: NO ejecutar acciones, solo guardar sugerencias
    console.log(`[CognitiveDispatcher] 🤝 MANUAL MODE: Creating suggestion for operator review`);
    const suggestion = actions.find(a => a.type === 'send_message') as any;
    if (suggestion?.content) {
        await db.insert(aiSuggestions).values({
            conversationId,
            accountId,
            content: suggestion.content,
            model: enrichedRuntimeConfig.model || 'unknown',
            provider: enrichedRuntimeConfig.provider || 'unknown',
            status: 'pending',
        });
        // 🔥 NO LLAMAR a actionExecutor.execute()
        return {
            actions,
            runtimeUsed: runtimeId,
            durationMs: Date.now() - startTime,
            success: true,
            suggestMode: true // 🆕 Nuevo flag
        };
    }
}

// 🚀 MODO AUTO/SUGGEST: Ejecutar acciones normalmente
const executionData = await actionExecutor.execute(actions, {...});
```

### **Opción 2: Modificar ActionExecutor**

```typescript
// action-executor.service.ts - executeSendMessage()
if (context.policyContext?.mode === 'suggest') {
    // 🚀 En modo suggest, no enviar, solo retornar datos
    return {
        action,
        success: true,
        suggestMode: true,
        messageData: {
            content: action.content,
            conversationId: action.conversationId
        }
    };
}

// Continuar con certificación normal...
```

### **Opción 3: Filtrar Acciones por Tipo**

```typescript
// cognitive-dispatcher.service.ts
let actionsToExecute = actions;

if (policyContext.mode === 'suggest') {
    // 🚀 En modo suggest, filtrar acciones send_message
    actionsToExecute = actions.filter(a => a.type !== 'send_message');
    
    // Guardar send_message como sugerencias
    const sendActions = actions.filter(a => a.type === 'send_message');
    for (const action of sendActions) {
        await db.insert(aiSuggestions).values({...});
    }
}

const executionData = await actionExecutor.execute(actionsToExecute, {...});
```

---

## 📊 **Impacto del Cambio**

### **Componentes Afectados**
- `cognitive-dispatcher.service.ts` - Cambio principal
- `action-executor.service.ts` - Posible cambio secundario
- `SuggestResponsePanel` - Sin cambios (ya está bien)

### **Flujo Corregido**
```
Mensaje entrante → cognitive-dispatcher
    ↓
Verificar policyContext.mode
    ↓
if (mode === 'suggest') {
    → Guardar en ai_suggestions
    → NO ejecutar actionExecutor.execute()
    → Enviar suggestion:ready al frontend
} else {
    → Ejecutar actionExecutor.execute() normal
}
```

### **Experiencia del Usuario Corregida**
1. IA genera respuesta
2. Respuesta aparece en `SuggestResponsePanel`
3. **Mensaje NO se envía automáticamente**
4. Humano elige: Aprobar, Editar o Rechazar
5. Solo al aprobar se envía el mensaje

---

## 🎯 **Validación del Fix**

### **Casos de Prueba**
1. **Modo Auto**: Mensaje se envía automáticamente ✅
2. **Modo Suggest**: Mensaje NO se envía, aparece como sugerencia ✅
3. **Modo Off**: No se genera respuesta ✅
4. **Aprobación Manual**: Humano aprueba y se envía ✅
5. **Rechazo**: Humano rechaza y no se envía ✅
6. **Edición**: Humano edita y envía versión modificada ✅

### **Logs Esperados**
```
[CognitiveDispatcher] 🤝 MANUAL MODE: Creating suggestion for operator review
[FluxPipeline] 💬 SUGGEST conv=abc123 content="Respuesta sugerida..."
// SIN logs de ActionExecutor.execute() en modo suggest
```

---

## 🚨 **Riesgos y Consideraciones**

### **Riesgo Bajo**
- El cambio es localizado en cognitive-dispatcher
- No afecta otros modos (auto, off)
- Frontend ya está preparado para manejar sugerencias

### **Validación Necesaria**
- Testear que `ai_suggestions` se llene correctamente
- Verificar que `SuggestResponsePanel` reciba las sugerencias
- Confirmar que otros tipos de acciones funcionen

---

## 📅 **Implementación Sugerida**

### **Paso 1: Fix Inmediato (Opción 1)**
- Modificar `cognitive-dispatcher.service.ts`
- Agregar verificación de modo antes de `actionExecutor.execute()`

### **Paso 2: Testing**
- Probar los 3 modos
- Verificar flujo completo

### **Paso 3: Deploy**
- Cambio de bajo riesgo, alto impacto

---

## 🎯 **Conclusión**

**El bug está confirmado y localizado**: `actionExecutor.execute()` se llama antes de verificar si estamos en modo suggest, haciendo que todos los mensajes se envíen automáticamente.

**La solución es simple**: verificar el modo ANTES de ejecutar acciones, y en modo suggest solo guardar sugerencias sin enviar.

**Impacto**: Corrige el comportamiento fundamental del modo supervisado, devolviendo el control al humano como debe ser.

---

## 🧠 **Revisión por Antigravity — 2026-03-17**

### **Validación del Diagnóstico Original**

Tras revisar el código fuente actual (`cognitive-dispatcher.service.ts` líneas 237-292, `action-executor.service.ts`, `cognition-gateway.service.ts`, `SuggestResponsePanel.tsx`), **confirmo que el diagnóstico es 100% correcto**:

- **Línea 247**: `actionExecutor.execute()` se ejecuta incondicionalmente.
- **Línea 275**: La verificación `if (policyContext.mode === 'suggest')` llega después.
- **La cadena destructiva es**: `actionExecutor.execute()` → `executeSendMessage()` → `cognitionGateway.certifyAiResponse()` → Kernel ingesta señal `AI_RESPONSE_GENERATED` → ChatProjector proyecta y **envía el mensaje al destinatario**. Para cuando el dispatcher llega al bloque de suggest, el mensaje ya viaja por WebSocket.

### **Descubrimientos Adicionales**

#### **🔴 BUG-2: Double-Close del Turn en modo Suggest**

En el código actual, cuando `mode === 'suggest'`, ocurre un **doble cierre** del turno:

1. `actionExecutor.execute()` (línea 247) internamente llama `this.closeTurn(turnId, accountId)` al final de su método `execute()` (action-executor.service.ts, línea 150).
2. Después, en el bloque de suggest (línea 291), el dispatcher llama **otra vez** `await actionExecutor.closeTurn(turnId, accountId)`.

Esto no causa un error funcional (un `UPDATE ... SET processedAt = NOW()` es idempotente), pero es una **ineficiencia** y una señal de lógica desorganizada. El fix de Opción 1 resuelve esto automáticamente porque al salir con `return` antes de `actionExecutor.execute()`, el turno se cierra una sola vez explícitamente (como ya se hace para `mode === 'off'` en línea 94).

#### **🟡 BUG-3: El PATCH de Aprobación usa INSERT directo, no Kernel**

Cuando el operador aprueba una sugerencia desde `SuggestResponsePanel`, la ruta `PATCH /fluxcore/suggestions/:id` (fluxcore.routes.ts, líneas 1549-1595) inserta directamente en la tabla `messages`:

```typescript
await db.insert(messages).values({
    conversationId: suggestion.conversationId,
    senderAccountId: suggestion.accountId,
    content: { text: finalContent },
    generatedBy: 'ai',
    status: 'sent',
} as any);
```

Esto **viola la arquitectura Kernel** (Canon §4.4): el mensaje aprobado **no pasa por el Kernel**, no genera señal certificada, no pasa por ChatProjector, y no emite eventos WebSocket. Consecuencias:

- El mensaje aparecerá en la DB pero **no se verá en tiempo real** en la conversación del otro lado (no hay broadcast WS).
- No hay traza de certificación Kernel para este mensaje.
- No se activa ningún projector ni adaptador.

**Solución recomendada**: El endpoint de aprobación debe usar `cognitionGateway.certifyAiResponse()` o `messageCore.send()` en vez de un `db.insert()` directo. Esto alinea la aprobación con la arquitectura existente.

#### **🟡 BUG-4: El WebSocket `approve_suggestion` también bypasea el Kernel**

El `ws-handler.ts` tiene un case `approve_suggestion` (líneas 329-363) que envía el mensaje aprobado usando `messageCore.send()`. Este path sí pasa por ChatCore (broadcast WS), pero **tampoco pasa por el Kernel** para certificación. Hay una **dualidad de paths** de aprobación:

| Path | Componente | Usa Kernel? | Broadcast WS? |
|------|-----------|------------|---------------|
| REST API | `PATCH /fluxcore/suggestions/:id` | ❌ INSERT directo | ❌ |
| WebSocket | `approve_suggestion` event | ❌ | ✅ (vía messageCore.send) |

**Recomendación**: Unificar en un solo path de aprobación que pase por el Kernel. El `SuggestResponsePanel` usa el REST API, así que ese es el path activo. Hay que decidir si deprecar `approve_suggestion` del WebSocket o si ambos usan el mismo servicio subyacente.

#### **🟢 Observación: El `handleSuggestionRequest` WS es ya LEGACY**

El `handleSuggestionRequest` (ws-handler.ts, línea 624) está marcado como legacy y retorna `suggestion:unavailable`. Esto confirma que la generación de sugerencias ahora fluye correctamente por el Cognitive Pipeline (Kernel → CognitionWorker → Dispatcher), no por el WS handler antiguo. El bug reside únicamente en el Dispatcher.

### **Evaluación de las Opciones Propuestas**

| Opción | Veredicto | Razón |
|--------|-----------|-------|
| **Opción 1** | ✅ **Recomendada** | Limpia, mínimo impacto, resuelve BUG-1 y BUG-2 simultáneamente. Patrón consistente con el gate de `mode === 'off'` que ya existe. |
| **Opción 2** | ⚠️ Aceptable | Funcional, pero dispersa la responsabilidad: el ActionExecutor no debería necesitar saber sobre modos. El Dispatcher es quien gobierna la política. |
| **Opción 3** | ⚠️ Over-engineering | Filtrar acciones implica que `actionExecutor.execute()` todavía se llama (para acciones que no son `send_message`). En modo suggest, ¿qué acciones no-send deberían ejecutarse? `start_typing`? Probablemente no. Introduce ambigüedad. |

### **Sugerencia de Implementación Refinada (Opción 1 mejorada)**

```typescript
// cognitive-dispatcher.service.ts — ANTES de actionExecutor.execute()

// ── SUGGEST GATE ──────────────────────────────────────────
if (policyContext.mode === 'suggest') {
    typingKeepAlive.stop(); // Detener indicador de typing

    console.log(`[CognitiveDispatcher] 🤝 SUGGEST MODE: Saving suggestion, NOT executing actions`);
    const sendAction = actions.find(a => a.type === 'send_message') as any;

    if (sendAction?.content) {
        console.log(`[FluxPipeline] 💬 SUGGEST conv=${conversationId.slice(0, 7)} content="${sendAction.content.slice(0, 80)}"`);

        await db.insert(aiSuggestions).values({
            conversationId,
            accountId,
            content: sendAction.content,
            model: enrichedRuntimeConfig.model || 'unknown',
            provider: enrichedRuntimeConfig.provider || 'unknown',
            status: 'pending',
        });
    }

    await actionExecutor.closeTurn(turnId, accountId); // Cierre explícito del turno

    return {
        actions,
        runtimeUsed: runtimeId,
        durationMs: Date.now() - startTime,
        success: true,
    };
}
// ── FIN SUGGEST GATE ──────────────────────────────────────

// Solo modo AUTO llega aquí
const executionData = await actionExecutor.execute(actions, { ... });
```

**Diferencias vs la Opción 1 original:**
1. Se llama `typingKeepAlive.stop()` antes del return (evita leaks del interval).
2. Se usa `actionExecutor.closeTurn()` explícitamente (patrón idéntico al gate de `off`).
3. No se agrega un flag `suggestMode` al return para evitar cambiar el tipo `DispatchResult` (mantener backward compatibility).

### **Trabajo Pendiente Post-Fix**

1. **Arreglar el path de aprobación** (`PATCH /fluxcore/suggestions/:id`) para que use `messageCore.send()` o `cognitionGateway.certifyAiResponse()` en vez de `db.insert(messages)` directo. Esto es un bug separado (BUG-3) que afecta la experiencia en tiempo real post-aprobación.
2. **Unificar paths de aprobación** entre REST y WebSocket, o deprecar uno de los dos (BUG-4).
3. **Emitir notificación al frontend** cuando se guarda una sugerencia (ej: via WebSocket o evento) para que `SuggestResponsePanel` muestre la sugerencia sin depender del polling de 4 segundos.

---

## 📅 **Fecha del Análisis**
2026-03-17

## 🔍 **Herramientas Usadas**
- Análisis de cognitive-dispatcher.service.ts
- Revisión de action-executor.service.ts
- Trazado del flujo de ejecución
- Validación de componentes frontend

## 🔍 **Revisión — Herramientas Usadas**
- Lectura completa de `cognitive-dispatcher.service.ts` (364 líneas)
- Lectura completa de `action-executor.service.ts` (498 líneas)
- Lectura completa de `cognition-gateway.service.ts` (170 líneas)
- Lectura completa de `SuggestResponsePanel.tsx` (208 líneas)
- Lectura de `ws-handler.ts` (secciones relevantes: suggest, approve)
- Lectura de `fluxcore.routes.ts` (sección suggestions: líneas 1514-1595)
