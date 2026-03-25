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
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Overwrite for all (60min window), Hide for self (visibility filter), WebSocket broadcast, Kernel state certification" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MessageDeletionService

## 🎯 Propósito
Implementa la lógica de "Eliminación" de mensajes bajo una política de permanencia de datos. En FluxCore, los mensajes nunca se borran físicamente por acción del usuario; en su lugar, se utilizan técnicas de **Sobrescritura Destructiva** (para todos) u **Ocultamiento por Actor** (para uno mismo).

## 🏮 Principios de Diseño
1.  **Inmutabilidad Física**: Las filas en la tabla `messages` persisten para auditoría histórica.
2.  **Overwrite for All**: Reemplaza el contenido original por un texto canónico fijo ("Este mensaje fue eliminado").
3.  **Hide for Self**: Utiliza la tabla `message_visibility` para que un actor específico deje de ver el mensaje sin afectar a los demás.

## 🚥 Sobrescritura (Scope: 'all')
-   **Ventana de Tiempo**: Limitada a **60 minutos** desde la creación del mensaje.
-   **Propiedad**: Solo el emisor original (`senderAccountId`) puede ejecutar esta acción.
-   **Efecto**: Actualiza `content`, marca `overwrittenAt` y notifica a todos los participantes vía WebSocket.
-   **Certificación**: Emite una señal al Kernel (`EXTERNAL_STATE_OBSERVED`) registrando el hash del contenido original antes de su destrucción.

## 👁️ Visibilidad (Scope: 'self')
-   **Sin Ventana**: Se puede ocultar un mensaje para uno mismo en cualquier momento.
-   **Persistencia**: Crea una entrada en `message_visibility` vinculando `messageId` y `actorId`.
-   **Query Filter**: Proporciona el método `getMessagesWithVisibilityFilter` que realiza un `notInArray` contra los IDs ocultos del actor, asegurando que la UI no cargue mensajes "borrados".

## 🧹 Acciones en Masa
-   **`hideAllMessagesForActor`**: Implementa la funcionalidad de "Vaciar Chat". Registra masivamente todos los mensajes actuales de una conversación como ocultos para el actor solicitante.

## 🔄 Compatibilidad Legacy
Mantiene redirecciones de los términos antiguos (`redact`, `redaction`) hacia los nuevos (`overwrite`, `overwritten`) para no romper integraciones existentes mientras se completa la transición terminológica.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { messageDeletionService } from 'apps/api/src/services/message-deletion.service.ts';

// Ejemplo de invocación típica
const result = await messageDeletionService.execute(params);
```
