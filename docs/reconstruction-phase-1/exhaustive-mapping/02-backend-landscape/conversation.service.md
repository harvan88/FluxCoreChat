---
id: "conversation-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/conversation.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ConversationParticipantService, RelationshipService, ActorResolver (utils), Drizzle (conversations, relationships, participants)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Hilos de Conversación (MA-101)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ensure conversation (relational vs anonymous), Visitor-to-Internal conversion, Account-isolated retrieval, Enrichment with contact avatars, Soft-delete (unsubscription)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ConversationService

## 🎯 Propósito
El `ConversationService` es el motor que orquestra los hilos de comunicación en FluxCore. Su responsabilidad principal es garantizar que cada interacción (ya sea entre dos cuentas internas o un visitante anónimo y un agente) ocurra dentro de un contexto persistente y seguro.

## 🚥 Tipos de Hilo
-   **Internal**: Hilos vinculados a una `Relationship` formal entre dos actores conocidos.
-   **Anonymous Thread**: Hilos de visitantes via webchat, identificados por un `visitorToken`.
-   **Canales**: Soporta múltiples canales de entrada (`web`, `whatsapp`, `telegram`, `webchat`).

## 🧬 Conversión de Identidad
Una de las capacidades más críticas del servicio es `convertVisitorConversation`. Cuando un visitante anónimo inicia sesión o se registra, el servicio transfiere todo el historial de mensajes del hilo anónimo a una nueva relación formal, manteniendo la continuidad de la experiencia sin pérdida de datos.

## 🛡️ Aislamiento de Cuentas (MA-101)
Implementa un modelo de aislamiento estricto por `accountId`. A diferencia de otros sistemas que listan chats por usuario, FluxCore filtra las conversaciones basándose en la participación activa de la cuenta específica, permitiendo que un mismo usuario humano gestione identidades profesionales y personales de forma totalmente esteparada.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { conversationService } from 'apps/api/src/services/conversation.service.ts';

// Ejemplo de invocación típica
const result = await conversationService.execute(params);
```
