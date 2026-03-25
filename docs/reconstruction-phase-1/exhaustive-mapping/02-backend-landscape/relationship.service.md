---
id: "relationship-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/relationship.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "ActorService, AccountService, ContextLimits (utils), Drizzle (relationships, conversations, actors)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Vínculos entre Actores (COR-003)" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Symmetric relationship creation, Perspective management (A vs B), Long-term context injection (Notes/Rules), Interaction tracking, Cascading deletion" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RelationshipService

## 🎯 Propósito
El `RelationshipService` gestiona el vínculo persistente entre dos actores. A diferencia de un hilo de conversación corto, la relación es el contenedor de la "memoria compartida" y las reglas de interacción a largo plazo entre un usuario y su asistente, o entre dos cuentas de negocio.

## 🚥 Garantía de Conversación (BUG-003)
El servicio implementa una regla de integridad crítica: **Toda relación debe tener al menos una conversación activa**. Si se intenta crear o recuperar una relación que por algún error perdió su hilo, el servicio lo genera automáticamente para evitar estados inconsistentes en la UI.

## 🧬 Perspectivas y Contexto
Gestiona dos tipos de datos "vivos":
-   **Perspectives**: Metadatos que definen cómo se ve el otro actor (ej: alias local, notas de contacto).
-   **Context Entries**: Un log de hechos o reglas (ej: "No le gusta que lo llamen por su segundo nombre") que la IA utiliza para personalizar la experiencia. El servicio aplica límites estrictos de caracteres (`COR-006`) para mantener el performance del modelo.

## 🛡️ Simetría de Actores
Las relaciones son agnósticas a quién la inició. El servicio resuelve los IDs de los actores (`actorAId` vs `actorBId`) de forma simétrica para evitar duplicidad de vínculos entre las mismas dos entidades, garantizando una "Single Source of Truth" para cada pareja de comunicación.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { relationshipService } from 'apps/api/src/services/relationship.service.ts';

// Ejemplo de invocación típica
const result = await relationshipService.execute(params);
```
