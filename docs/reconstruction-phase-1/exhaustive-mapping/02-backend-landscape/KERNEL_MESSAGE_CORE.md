---
id: "message-core"
type: "core"
status: "stable"
criticality: "high"
location: "apps/api/src/core/message-core.ts"
---

# Message Core - Corazón del Sistema de Mensajes

**Ubicación:** `apps/api/src/core/message-core.ts`  
**Propósito:** Gestión centralizada del ciclo de vida de mensajes en FluxCore  
**Tipo:** Core System Component  

---

## 🎯 Propósito Principal

`MessageCore` es el componente central responsable de gestionar el ciclo de vida completo de los mensajes en el sistema FluxCore, incluyendo creación, validación, almacenamiento y proyección.

---

## 🏗️ Arquitectura

### Exportaciones Principales:
- `export { MessageEnvelope, ReceiveResult }; // Re-export para compatibilidad (opcional)`
- `export class MessageCore {`
- `export const messageCore = new MessageCore();`

### Dependencias Principales:
- `import { messageService } from '../services/message.service';`
- `import { conversationService } from '../services/conversation.service';`
- `import { relationshipService } from '../services/relationship.service';`
- `import { conversationParticipantService } from '../services/conversation-participant.service';`
- `import { coreEventBus } from './events';`

---

## 🔗 Dependencias del Sistema

### 1. Dependencias que consume:
- **Base de Datos:** Para persistencia de mensajes
- **Event System:** Para emisión de eventos de mensaje
- **Validation Services:** Para validación de contenido

### 2. Quién depende de él:
- **ChatProjector:** Para proyectar mensajes a ChatCore
- **CognitionGateway:** Para procesamiento cognitivo
- **Runtime Services:** Para ejecución de acciones

---

## 🔄 Flujos Principales

### 1. Creación de Mensaje
```typescript
// Flujo básico de creación
const message = await messageCore.create({
  conversationId: 'conv-123',
  senderAccountId: 'acc-456',
  content: { text: 'Hola mundo' },
  generatedBy: 'human'
});
```

### 2. Validación y Procesamiento
```typescript
// Validación automática
await messageCore.validate(message);
await messageCore.process(message);
```

---

## 📋 Estado Actual

- **✅ Implementado y funcional**
- **✅ Integrado con ChatProjector**
- **✅ Soporta múltiples tipos de contenido**
- **✅ Validación automática**

---

## 🚨 Notas Importantes

- **Single Source of Truth:** MessageCore es la única fuente de verdad para mensajes
- **Event-Driven:** Emite eventos para cada cambio de estado
- **Scalable:** Diseñado para alto volumen de mensajes


## 🔗 Capa 2: Conexiones e Interdependencias

### 📦 Dependencias (LO QUE CONSUME)
- `../services/message.service`
- `../services/conversation.service`
- `../services/relationship.service`
- `../services/conversation-participant.service`
- `./events`
- `./types`

### 🔄 Dependientes (QUIÉN LO CONSUME)
- `apps/api/src/core/projections/chat-projector.ts`
- `apps/api/src/index.ts`
- `apps/api/src/routes/adapters.routes.ts`
- `apps/api/src/routes/fluxcore.routes.ts`
- `apps/api/src/routes/messages.routes.ts`
- `apps/api/src/routes/test-chatcore.routes.ts`
- `apps/api/src/routes/test.routes.ts`
- `apps/api/src/scripts/compile-kernel-files-fixed.ts`
- `apps/api/src/scripts/compile-kernel-files.ts`
- `apps/api/src/scripts/compile-kernel-simple.ts`
- `apps/api/src/scripts/debug-message-core-queue.ts`
- `apps/api/src/scripts/send-test-message-complete.ts`
- `apps/api/src/scripts/send-test-message-final.ts`
- `apps/api/src/scripts/send-test-message-fixed.ts`
- `apps/api/src/scripts/send-test-message.ts`
- `apps/api/src/scripts/update-snapshot.ts`
- `apps/api/src/services/fluxcore/fluxi-dependency-injection.ts`
- `apps/api/src/services/fluxcore/reality-adapter.service.ts`
- `apps/api/src/services/message-deletion.service.ts`
- `apps/api/src/services/runtimes/fluxcore-runtime.adapter.ts`
- `apps/api/src/services/template.service.ts`
- `apps/api/src/services/work-engine.service.ts`
- `apps/api/src/websocket/ws-handler.ts`
