---
id: "message-service"
type: "logic-service"
status: "stable"
criticality: "critical"
location: "apps/api/src/services/message.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "AssetRelationsService, ConversationParticipantService, MessageVersionService, MessageDeletionService, Drizzle (messages)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Núcleo de Ingesta y Gestión de Mensajes" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Message creation with Auto-rejoin, Asset auto-linking, Versioned editing, Visibility-filtered retrieval, Pagination fix" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MessageService

## 🎯 Propósito
El `MessageService` es el punto de entrada principal para el contenido de los chats. Gestiona la persistencia de mensajes, asegurando que cada envío cumpla con las reglas de negocio de participación y trazabilidad de archivos.

## 🚥 Auto-Rejoin y Participación
Al crear un mensaje, el servicio ejecuta una validación de **Auto-rejoin**. Si el remitente se había desuscrito de la conversación, el sistema lo marca automáticamente como activo de nuevo. Esto garantiza que la comunicación nunca se bloquee por estados de desuscripción obsoletos.

## 🧬 Vinculación Automática de Assets
El servicio analiza el contenido del mensaje en busca de archivos (media). Si detecta `assetId`s, coordina con `AssetRelationsService` para crear vínculos formales entre el mensaje y los archivos, facilitando la auditoría y la visualización de galerías en la UI.

## 🛡️ Versionamiento y Visibilidad
-   **Edición**: Las actualizaciones de contenido no sobrescriben el registro original; delegan en `MessageVersionService` para crear una nueva versión, permitiendo el historial de cambios.
-   **Borrados**: Utiliza un sistema de visibilidad basado en actores (`MessageDeletionService`). Un mensaje puede ser "borrado para mí" (oculto en el filtro de lectura) o "borrado para todos" (invalidado globalmente).

## 🔧 Paginación Corregida (Fix v8.3)
Se corrigió la lógica de recuperación de mensajes (`getMessagesByConversationId`) para asegurar que el usuario siempre vea los mensajes más recientes al cargar o actualizar la página. 
- **Lógica Anterior:** Usaba `ASC + LIMIT`, devolviendo siempre los mensajes más antiguos de la conversación.
- **Lógica Actual:** Usa `DESC + LIMIT` (obteniendo los N más recientes) y luego aplica un `.reverse()` en memoria para entregarlos en orden cronológico correcto al frontend.

## 💡 Ejemplo de Uso
```typescript
import { messageService } from './services/message.service';

const messages = await messageService.getMessagesByConversationId(conversationId, 50);
```
