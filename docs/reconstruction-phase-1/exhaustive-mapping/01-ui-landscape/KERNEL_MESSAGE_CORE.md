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
