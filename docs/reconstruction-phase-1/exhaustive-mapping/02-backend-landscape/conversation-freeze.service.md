---
id: "conversation-freeze-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/conversation-freeze.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Conversation Participant Service, Drizzle (conversations, messages)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Motor de Inmutabilidad y Bloqueo de Hilos (v1.3)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Permanent freezing, Legal hold, Mutation guards, Edit window enforcement" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ ConversationFreezeService (v1.3)

## 🎯 Propósito
Implementa las reglas de inmutabilidad para los hilos de conversación. Su función es "congelar" estados para prevenir ediciones o nuevos mensajes cuando una conversación ha cumplido un propósito específico (ej: publicación) o por requerimientos legales, garantizando la integridad histórica de los chats.

## 🧊 Razones de Congelación (`FreezeReason`)
- **`published`**: La conversación ha sido expuesta como parte de un perfil público o artículo y no debe cambiar.
- **`legal_hold`**: Bloqueo estricto por cumplimiento normativo o investigación.
- **`manual`**: Bloqueo iniciado por un participante (reversible).

## 🛡️ Guardias de Mutación (`checkMutationAllowed`)
Este es un componente crítico que debe ser consultado por cualquier servicio que intente modificar un mensaje o una conversación. Si la conversación está congelada, el servicio lanza un error que bloquea la operación a nivel de API, protegiendo los datos contra cambios no autorizados.

## ⏳ Ventana de Edición Dinámica
Además de la congelación permanente, el servicio calcula si un mensaje aún es editable basándose en una ventana de **15 minutos** desde su creación. Si el tiempo expira, la conversación se comporta como "semi-congelada" para ese mensaje específico, incluso si el hilo general sigue activo.

## 🔐 Reglas de Descongelación
Solo las conversaciones congeladas por la razón `manual` pueden ser descongeladas, y estrictamente por el mismo actor que inició el bloqueo original, preservando la soberanía del usuario sobre sus hilos privados.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { conversationFreezeService } from 'apps/api/src/services/conversation-freeze.service.ts';

// Ejemplo de invocación típica
const result = await conversationFreezeService.execute(params);
```
