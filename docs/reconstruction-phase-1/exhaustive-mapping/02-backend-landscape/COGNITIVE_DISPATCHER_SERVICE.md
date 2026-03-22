---
id: "cognitive-dispatcher-service"
type: "backend"
status: "stable"
criticality: "high"
location: "apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts"
---

# 🔌 Cognitive Dispatcher Service

**Ubicación:** `apps/api/src/services/fluxcore/cognitive-dispatcher.service.ts`  
**Propósito:** Constructor de contexto para decisiones cognitivas soberanas  
**Estado:** ✅ STABLE - Recientemente modificado para soportar perfiles públicos  
**Responsable:** Preparación de contexto para runtimes (no orquestación)  

---

## 🎯 **Función Principal**

Construye el contexto completo que los runtimes soberanos necesitan para tomar decisiones. **NO decide qué runtime ejecutar ni cómo responder.** El usuario elige el runtime activo desde la UI, y el runtime decide cómo responder basado en el contexto proporcionado.

---

## 🔄 **Flujo Principal**

### **1. Resolución de Conversación**
```typescript
const conversation = await db
  .select()
  .from(conversations)
  .where(eq(conversations.id, conversationId))
  .limit(1);
```

### **2. Resolución de PolicyContext + RuntimeConfig**
```typescript
// 🆕 PASAR VISITOR TOKEN COMO FALLBACK PARA VISITANTES
const contactId = conversation?.relationshipId || conversation?.visitorToken || '';
console.log(`[CognitiveDispatcher] 🎯 ContactId resolved: ${contactId}`);

const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
    accountId,
    contactId,
    (conversation as any)?.channel || 'web'
);
```

### **3. Gate de Automatización**
```typescript
if (policyContext.mode === 'off') {
    console.log(`[FluxPipeline] ⛔ OFF → automation disabled`);
    return this.failResult('Automation disabled', startTime);
}
```

### **4. Preparación de RuntimeInput**
```typescript
const runtimeResult = await runtimeGateway.execute({
    policyContext,
    runtimeConfig,
    conversationHistory,
    services: { ... }
});
```

**Nota:** `RuntimeGateway` ejecuta el runtime activo elegido por el usuario. El `CognitiveDispatcher` solo prepara el contexto, no ejecuta decisiones.

---

## 🎯 **Características Clave**

### **🆕 Soporte para Perfiles Públicos**
- **Fallback automático:** `visitorToken` como `contactId` cuando no hay `relationshipId`
- **Detección inteligente:** FluxPolicyContext detecta UUIDs de visitors
- **Misma fuente de verdad:** Usa `automation_rules.global` para visitantes

### **🔍 Logging Detallado**
```typescript
console.log(`[CognitiveDispatcher] 🎯 DISPATCH START: turnId=${turnId}`);
console.log(`[CognitiveDispatcher] 🎯 ContactId resolved: ${contactId}`);
console.log(`[CognitiveDispatcher] ✓ Context resolved: mode=${policyContext.mode}`);
```

### **⚡ Respeto a la Soberanía del Runtime**
- **NO decide qué runtime ejecutar** - eso lo elige el usuario desde la UI
- **NO decide cómo responder** - eso lo decide el runtime soberano
- **Prepara contexto completo** - PolicyContext + RuntimeConfig + ConversationHistory
- **Aplica gates de negocio** - mode='off' detiene ejecución (política del usuario)

---

## 📊 **Interacciones con Otros Servicios**

### **Dependencias Principales:**
- `fluxPolicyContextService.resolveContext()` - Resolución de políticas del usuario
- `runtimeGateway.execute()` - Ejecución del runtime activo elegido por el usuario
- `actionExecutor.execute()` - Ejecución de acciones resultantes (decididas por el runtime)

### **Consumidores:**
- `CognitionWorker` - Orquesta turns cognitivos (solo preparación, no decisiones)
- `ChatProjector` - Procesa señales de mensajes (no relacionado con cognición)

---

## 🔧 **Configuración y Parámetros**

### **Input Requerido:**
```typescript
{
    turnId: string;
    conversationId: string;
    accountId: string;
    lastSignalSeq: number;
}
```

### **Output Estructurado:**
```typescript
{
    success: boolean;
    runtimeUsed: string;  // Runtime activo elegido por el usuario
    actionsCount: number; // Acciones decididas por el runtime
    actions?: Action[];   // Acciones ejecutadas por ActionExecutor
    error?: string;
}
```

---

## 🚨 **Consideraciones Críticas**

### **Modificación Reciente (2026-03-21):**
- **Cambio:** `contactId = conversation?.relationshipId || conversation?.visitorToken || ''`
- **Impacto:** Perfiles públicos ahora pueden recibir respuestas IA
- **Validación:** Tests y logs confirman funcionamiento correcto

### **Respeto a la Arquitectura FluxCore:**
- **✅ NO viola soberanía del runtime** - Solo prepara contexto
- **✅ NO decide qué runtime usar** - El usuario elige desde UI
- **✅ NO decide cómo responder** - El runtime decide soberanamente
- **✅ SÍ aplica gates de negocio** - `mode='off'` es política del usuario

### **Performance:**
- **Latencia:** < 100ms para preparación de contexto
- **Carga:** Prepara 1 turn por llamada (no batch)
- **Memoria:** Stateless, sin persistencia interna

---

## 📋 **Estado Actual**

**✅ STABLE** - Funcionando correctamente con soporte completo para:
- Chats internos (con `relationshipId`)
- Perfiles públicos (con `visitorToken`)
- Todos los modos de automatización (`auto`, `suggest`, `off`)
- **Respeto total a la soberanía del runtime según el Canon FluxCore**

**Última actualización:** 2026-03-21 - Soporte para visitor tokens implementado

---

## 🎯 **Clarificación Final**

**El `CognitiveDispatcher` NO es un orquestador cognitivo.** Es un **constructor de contexto** que respeta completamente la arquitectura de FluxCore:

1. **El usuario elige el runtime** desde la configuración administrativa
2. **El runtime decide soberanamente** cómo responder basado en el contexto
3. **El dispatcher solo prepara** PolicyContext + RuntimeConfig + ConversationHistory
4. **Aplica gates de negocio** definidos por el usuario (mode='off')

**Esto es 100% consistente con el Canon FluxCore v8.3.**
