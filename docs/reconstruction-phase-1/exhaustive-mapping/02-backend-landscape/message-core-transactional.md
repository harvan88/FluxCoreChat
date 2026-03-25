---
id: "message-core-transactional"
type: "core-persistence"
status: "ratified"
criticality: "critical"
location: "apps/api/src/core/message-core-transactional.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "MessageService, ConversationService, RelationshipService, Drizzle ORM" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Garante de Persistencia de Realidad" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Atomic ACID transactions, Multi-table synchronization (Messages/Convs/Rels), Post-persistence verification, Non-blocking WebSocket broadcast, Metadata enrichment" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 🏗️ Message Core Transactional

## 🎯 Propósito
El `MessageCoreTransactional` es el responsable de asegurar que la "realidad" sea persistida de forma atómica. En FluxCore, un mensaje no existe legalmente hasta que ha sido grabado en la base de datos junto con la actualización de su conversación y relación correspondiente.

## 🗄️ Modelos de Datos e Integridad Relacional
### Transacción Atómica (ACID)
Cada recepción de mensaje ejecuta una transacción de Base de Datos que engloba:
1.  **Creación del Mensaje**: Inserción en la tabla `messages`.
2.  **Actualización de Conversación**: Sincronización de `lastMessageAt` y `lastMessageText`.
3.  **Toque de Relación**: Actualización de la última interacción para rankings y prioridades.
**Invariante**: Si cualquiera de estos pasos falla, la DB hace rollback completo, evitando estados inconsistentes (ej: conversación que apunta a un mensaje que no existe).

## 🧬 Verificación Post-Persistencia
Como medida de seguridad adicional, después de la inserción pero antes del commit de la transacción, el servicio realiza una consulta SQL cruda para verificar que el registro realmente existe en el almacenamiento físico. Esto protege contra fallos silenciosos de drivers o proxies de DB.

## 🛡️ Desacoplamiento de Efectos Secundarios
Una vez que el commit es exitoso y los datos están seguros:
-   Se emite el **Broadcast por WebSocket** (fuera de la transacción).
-   Se disparan eventos de telemetría.
Este diseño asegura que fallos en la capa de red (WebSockets) nunca impidan que un mensaje se guarde correctamente en la base de datos.

## 💡 Ejemplo de Uso
```typescript
// Componente del backend: message-core-transactional
import { messageCoreTransactional } from 'apps/api/src/core/message-core-transactional.ts';

// Se integra en el pipeline cognitivo de FluxCore
const result = await messageCoreTransactional.process(input);
```
