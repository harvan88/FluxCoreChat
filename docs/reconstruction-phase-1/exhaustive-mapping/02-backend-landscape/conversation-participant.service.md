---
id: "conversation-participant-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/conversation-participant.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ActorResolver (utils), Drizzle (participants, conversations, relationships)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Participación y Aislamiento" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Participant auto-generation from relationships, Active list retrieval, Recipient discovery, Auto-rejoin (reactivation), Anonymous-to-registered mapping" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ConversationParticipantService

## 🎯 Propósito
Este servicio gestiona la visibilidad y participación activa de las cuentas dentro de los hilos de conversación. Es el encargado de determinar quién tiene derecho a leer un mensaje y quién debe recibir notificaciones de eventos nuevos.

## 🚥 Roles y Identidades
Define una taxonomía Clara para los participantes:
-   **Roles**: `initiator` (quien abrió el chat), `recipient` (destino principal), `observer` (participantes pasivos o externos).
-   **Identidades**: `registered` (cuenta interna), `anonymous` (visitante widget), `system` (entidad automatizada).

## 🧬 Sincronización con Relaciones
El servicio implementa la lógica de `ensureParticipantsForConversation`. Al detectar una conversación nueva basada en una relación, resuelve automáticamente ambos actores a sus respectivas `accountId`s y crea los registros de participación correspondientes, asegurando que ambos lados vean el chat en su bandeja de entrada.

## 🛡️ Auto-Rejoin (Reactivación)
Gestiona la columna `unsubscribed_at`. Cuando una cuenta envía un mensaje a un chat del que se había desuscrito, este servicio gatilla un `ensureActiveParticipant`, eliminando la marca de desuscripción y volviendo a poner la conversación en el estado "activo" del usuario de forma transparente.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { conversationParticipantService } from 'apps/api/src/services/conversation-participant.service.ts';

// Ejemplo de invocación típica
const result = await conversationParticipantService.execute(params);
```
