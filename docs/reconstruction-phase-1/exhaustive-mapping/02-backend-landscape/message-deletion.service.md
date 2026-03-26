---
id: "message-deletion-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/message-deletion.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (messages, message_visibility), Message Core, ChatCore Gateway (Certification)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Visibilidad y Sobrescritura de Mensajes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Overwrite for all (60min window), Hide for self (visibility filter), WebSocket broadcast, Pagination fix" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MessageDeletionService

## 🎯 Propósito
Implementa la lógica de "Eliminación" de mensajes bajo una política de permanencia de datos. En FluxCore, los mensajes nunca se borran físicamente por acción del usuario; en su lugar, se utilizan técnicas de **Sobrescritura Destructiva** (para todos) u **Ocultamiento por Actor** (para uno mismo).

##  Lanternas de Visibilidad
- **Overwrite for All**: Reemplaza el contenido original por un texto canónico fijo ("Este mensaje fue eliminado").
- **Hide for Self**: Utiliza la tabla `message_visibility` para que un actor específico deje de ver el mensaje sin afectar a los demás.

## 👁️ Visibilidad y Paginación (Fix v8.3)
Se actualizó el método `getMessagesWithVisibilityFilter` para corregir el orden de entrega de mensajes filtrados. 
- **Lógica Anterior:** Consultaba mensajes en orden ascendente con límite, lo que causaba que el frontend solo viera los mensajes más antiguos de la conversación tras una recarga.
- **Lógica Actual:** Recupera los mensajes en orden descendente (`desc(messages.createdAt)`) para capturar los más recientes, y luego invierte el array para mantener la cronología esperada por la UI.

## 🚥 Sobrescritura (Scope: 'all')
-   **Ventana de Tiempo**: Limitada a **60 minutos** desde la creación del mensaje.
-   **Propiedad**: Solo el emisor original (`senderAccountId`) puede ejecutar esta acción.
-   **Efecto**: Actualiza `content`, marca `overwrittenAt` y notifica a todos los participantes vía WebSocket.

## 💡 Ejemplo de Uso
```typescript
import { messageDeletionService } from './services/message-deletion.service';

const messages = await messageDeletionService.getMessagesWithVisibilityFilter(conversationId, actorId, 50);
```
