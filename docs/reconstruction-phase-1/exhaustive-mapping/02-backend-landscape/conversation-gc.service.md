---
id: "conversation-gc-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/conversation-gc.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (conversations, participants), SQL Native" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Reclector de Basura de Hilos Abandonados (v2.0)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Subscription tracing, Physical deletion, Cascade cleanup, Orphan detection" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ConversationGCService (v2.0)

## 🎯 Propósito
Implementa el sistema de "Garbage Collection" (Recolección de Basura) para las conversaciones de FluxCore. Su objetivo es detectar y eliminar físicamente de la base de datos aquellas conversaciones que ya no tienen ningún participante activo (todos se han desuscrito o abandonado el hilo), liberando espacio y optimizando el rendimiento del motor de búsqueda.

## 🕵️ Detección de Abandono (`findAbandonedConversations`)
Utiliza consultas SQL nativas (`EXISTS` / `NOT EXISTS`) de alta eficiencia para identificar hilos donde:
1. Existió participación en el pasado.
2. Absolutamente todos los participantes actuales tienen una fecha en el campo `unsubscribed_at`.

## 🧹 Limpieza en Cascada
Al eliminar una conversación, el servicio confía en las **Foreign Key Constraints** a nivel de base de datos (`onDelete: cascade`). Esto asegura que miles de mensajes, adjuntos y registros de auditoría efímeros se borren atómicamente junto con la cabecera de la conversación, manteniendo la integridad referencial sin necesidad de lógica compleja en el código TS.

## 🛡️ Auditoría de Limpieza
A diferencia de los borrados de usuario, el GC es una operación de sistema. El servicio registra en los logs de la consola y telemetría interna cuántas conversaciones fueron removidas en cada ciclo, permitiendo monitorizar el volumen de datos purgados.

## ⚙️ Operación Asíncrona
Este servicio está diseñado para ser invocado por un worker periódico (Cron), permitiendo que la limpieza ocurra en horas de baja carga sin impactar la latencia de los usuarios que están chateando activamente.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { conversationGcService } from 'apps/api/src/services/conversation-gc.service.ts';

// Ejemplo de invocación típica
const result = await conversationGcService.execute(params);
```
