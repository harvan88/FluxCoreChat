---
id: "chatcore-fluxcore-integration"
type: "subsystem"
status: "verified-codigo"
criticality: "high"
location: "apps/api/src/services/fluxcore/ y core/projections/"
---

# ChatCore ↔ FluxCore Integration

**Fecha:** 2026-03-20  
**Propósito:** Integración real entre ChatCore y FluxCore a través del Kernel  
**Verificación:** ✅ Basado en código real  
**Archivos analizados:** Services, core, y projections

---

## 🎯 Descubrimiento Fundamental

### **La Integración está IMPLEMENTADA vía Kernel como Notario:**

#### **Flujo Real (VERIFICADO):**
1. **ChatCore Gateway** certifica mensajes en Kernel
2. **Kernel** almacena como verdad canónica
3. **Projectors** consumen y procesan señales
4. **FluxCore** responde vía CognitionGateway
5. **Kernel** certifica respuesta IA
6. **ChatCore** entrega vía ChatProjector

#### **Componentes Clave (VERIFICADOS):**
- **ChatCoreGateway** - Puente ChatCore → Kernel
- **CognitionGateway** - Puente FluxCore → Kernel
- **ChatProjector** - Observa señales del Kernel
- **IdentityProjector** - Resuelve identidades

---

## 🏗️ Arquitectura de Integración

### **ChatCore → Kernel (VERIFICADO)**

#### **ChatCoreGatewayService**
```typescript
// apps/api/src/services/fluxcore/chatcore-gateway.service.ts
class ChatCoreGatewayService {
  async certifyIngress(params: {
    accountId: string;        // Business Account ID
    userId?: string;         // Authenticated User ID
    payload: any;            // Message content
    meta: {
      ip?: string;
      userAgent?: string;
      clientTimestamp?: string;
      conversationId?: string;
      requestId?: string;
    }
  }): Promise<{ accepted: boolean; signalId?: number; reason?: string }>
}
```

#### **Configuración del Adapter:**
```typescript
private readonly ADAPTER_ID = 'chatcore-gateway';
private readonly ADAPTER_VERSION = '1.0.0';
private readonly DRIVER_ID = 'chatcore/internal';
private readonly SIGNING_SECRET = process.env.CHATCORE_SIGNING_SECRET;
```

#### **Proceso de Certificación:**
1. **Construir evidence** con payload y metadata
2. **Crear señal** con actor references
3. **Firmar y enviar** al Kernel
4. **Retornar signalId** para correlación

### **Kernel → FluxCore (VERIFICADO)**

#### **ChatProjector**
```typescript
// apps/api/src/core/projections/chat-projector.ts
class ChatProjector extends BaseProjector {
  protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
    // Route signals to handlers
    if (signal.factType === 'AI_RESPONSE_GENERATED') {
      await this.handleAiResponse(signal);
      return;
    }
    
    if (signal.factType === 'EXTERNAL_INPUT_OBSERVED') {
      await this.enqueueForCognition(signal);
      return;
    }
  }
}
```

#### **Funciones Clave:**
- **handleAiResponse()** - Entrega respuestas IA a ChatCore
- **enqueueForCognition()** - Encola mensajes para procesamiento IA
- **handleTranscriptionCompleted()** - Procesa transcripciones de audio

### **FluxCore → Kernel (VERIFICADO)**

#### **CognitionGatewayService**
```typescript
// apps/api/src/services/fluxcore/cognition-gateway.service.ts
class CognitionGatewayService {
  async certifyAiResponse(params: {
    conversationId: string;
    accountId: string;       // Cuenta que responde (asistente)
    targetAccountId: string; // Cuenta que recibe (usuario)
    content: { text: string };
    turnId: number;
    triggerSignalId?: number;
    runtimeId?: string;
    model?: string;
    provider?: string;
    policyContext?: any;
  }): Promise<{ accepted: boolean; signalId?: number; reason?: string }>
}
```

---

## 🔄 Flujo Completo de Integración (VERIFICADO)

### **Paso 1: Usuario envía mensaje**
```typescript
// 1. ChatCore recibe mensaje vía API
// 2. ChatCoreGateway.certifyIngress() certifica en Kernel
const result = await chatCoreGateway.certifyIngress({
  accountId: businessAccountId,
  userId: authenticatedUserId,
  payload: { content: messageText },
  meta: { conversationId, ip, userAgent }
});
```

### **Paso 2: ChatProjector procesa**
```typescript
// 3. ChatProjector observa señal EXTERNAL_INPUT_OBSERVED
// 4. Encola en cognition_queue para FluxCore
await this.enqueueForCognition(conversationId, accountId, targetAccountId, signalSequence, tx);
```

### **Paso 3: FluxCore procesa**
```typescript
// 5. Runtime FluxCore procesa mensaje
// 6. Genera respuesta IA
// 7. CognitionGateway.certifyAiResponse() certifica respuesta
const result = await cognitionGateway.certifyAiResponse({
  conversationId,
  accountId: assistantAccountId,
  targetAccountId: userAccountId,
  content: { text: aiResponse },
  turnId,
  triggerSignalId: originalSignalId
});
```

### **Paso 4: ChatProjector entrega**
```typescript
// 8. ChatProjector observa señal AI_RESPONSE_GENERATED
// 9. Entrega vía messageCore.receive()
const result = await messageCore.receive({
  conversationId,
  senderAccountId: assistantAccountId,
  fromActorId: resolvedActorId,
  targetAccountId: userAccountId,
  content: aiResponse,
  type: 'outgoing',
  generatedBy: 'ai',
  triggerSignalId
});
```

---

## 🔧 Componentes de Integración

### **1. Gateways (Reality Adapters)**
- **ChatCoreGateway** - Certifica entrada de usuarios
- **CognitionGateway** - Certifica respuestas IA
- **Ambos registrados** en `fluxcore_reality_adapters`

### **2. Projectors (Consumers)**
- **ChatProjector** - Maneja mensajes IA y entradas
- **IdentityProjector** - Resuelve identidades
- **SessionProjector** - Gestiona sesiones

### **3. Message Core**
- **messageCore.receive()** - Entrega final a usuarios
- **WebSocket broadcast** - Notificación en tiempo real
- **Persistencia** - Almacenamiento en ChatCore DB

---

## 📊 Tipos de Señales (VERIFICADOS)

### **Señales de ChatCore:**
- **EXTERNAL_INPUT_OBSERVED** - Usuario envió mensaje
- **EXTERNAL_STATE_OBSERVED** - Cambios de estado (typing, idle)
- **CONNECTION_EVENT_OBSERVED** - Eventos de conexión

### **Señales de FluxCore:**
- **AI_RESPONSE_GENERATED** - IA generó respuesta
- **chatcore.message.received** - Mensaje recibido (legacy)

---

## 🚨 Problemas Identificados

### **1. Acoplamiento Fuerte**
- **ChatProjector conoce** details de messageCore
- **Gateways hardcodean** adapter IDs
- **Difícil de testear** en aislamiento

### **2. Complejidad de Flujo**
- **Múltiples pasos** para un solo mensaje
- **Posibles race conditions** entre projectors
- **Error handling** distribuido

### **3. Configuración Estática**
- **Adapter IDs fijos** sin configuración
- **Signing secrets** desde environment
- **Sin discovery** dinámico

---

## 📊 Estado Actual de Integración

### **✅ FUNCIONAL:**
- [x] ChatCoreGateway implementado
- [x] CognitionGateway implementado
- [x] ChatProjector funcionando
- [x] Flujo completo operativo

### **❌ PROBLEMAS:**
- [ ] Acoplamiento fuerte entre componentes
- [ ] Configuración estática
- [ ] Error handling distribuido
- [ ] Sin circuit breaker

---

## 🔗 Referencias Cruzadas

- **ChatCore Gateway:** `apps/api/src/services/fluxcore/chatcore-gateway.service.ts`
- **Cognition Gateway:** `apps/api/src/services/fluxcore/cognition-gateway.service.ts`
- **Chat Projector:** `apps/api/src/core/projections/chat-projector.ts`
- **Identity Projector:** `apps/api/src/services/fluxcore/identity-projector.service.ts`
- **Message Core:** `apps/api/src/core/message-core.ts`
- **Kernel:** `apps/api/src/core/kernel.ts`

---

## ❓ Preguntas Abiertas

### **Para el Usuario:**
1. **¿Quieres simplificar el flujo de integración?**
2. **Cómo manejar mejor los errores entre mundos?**
3. **Qué configuración dinámica necesitas?**
4. **Cómo mejorar la testabilidad?**

### **Técnicas:**
1. **Cómo abstract los gateways?**
2. **Qué patrón usar para error handling?**
3. **Cómo implementar circuit breaker?**
4. **Cómo hacer la integración más configurable?**

---

## 🚀 Próximos Pasos

### **Inmediato:**
1. **Mapear todos los flujos** de integración
2. **Identificar puntos de fallo** críticos
3. **Implementar retry** en gateways
4. **Agregar health checks**

### **Mediano Plazo:**
1. **Abstract gateway layer**
2. **Implementar circuit breaker**
3. **Configuración dinámica**
4. **Mejorar testabilidad**
<tool_call>find_by_name
<arg_key>SearchDirectory</arg_key>
<arg_value>c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat\apps\api\src\services
