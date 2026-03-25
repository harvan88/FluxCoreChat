---
id: "relationship-context-service"
type: "logic-service"
status: "stable"
criticality: "high"
location: "apps/api/src/services/relationship-context.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Drizzle (relationships), Core Event Bus, ActorResolver" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Gestor de Memoria Persistente de Relaciones" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Context entry CRUD (notes/preferences/rules), Character limit enforcement (2000), Perspective management (tags/saved names), Event emission" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ RelationshipContextService

## 🎯 Propósito
Este servicio gestiona la "Memoria a Largo Plazo" de una conexión entre dos actores. Permite guardar notas, preferencias y reglas específicas que la IA utilizará para personalizar cada interacción, actuando como un mini-CRM integrado en el chat.

## 🚥 Límites y Optimización
Para evitar que el contexto de la IA se sature, el servicio impone un límite estricto de **2000 caracteres totales** por relación. El servicio calcula dinámicamente el espacio disponible al agregar o editar entradas, garantizando que el prompt final sea siempre eficiente.

## 🧬 Perspectivas Duales
Una relación tiene dos lados (`actorA` y `actorB`). El servicio gestiona las "Perspectivas", permitiendo que cada lado guarde metadatos privados sobre el otro, como etiquetas (`tags`), estados locales (`blocked`, `archived`) o nombres personalizados (`saved_name`).

## 🔔 Sincronización Reactiva
Cada vez que el contexto cambia, se emite el evento `relationship.context.updated`. Esto permite que otros servicios (como el generador de prompts de la IA) sepan que deben invalidar sus cachés y leer la nueva información para la siguiente respuesta.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { relationshipContextService } from 'apps/api/src/services/relationship-context.service.ts';

// Ejemplo de invocación típica
const result = await relationshipContextService.execute(params);
```
