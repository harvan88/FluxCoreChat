---
id: "db-relationships"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/relationships.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de vínculos bilaterales" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Actors (A y B). Referenciada por Conversations" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Social Graph & Context" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Structured context (JSONB), Bilateral perspectives, Last interaction tracking" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: relationships

## 🎯 Propósito
La tabla `relationships` define la conexión social y el contexto compartido entre dos actores. Es donde se almacena "lo que sabemos" sobre la interacción entre un usuario y su contacto, o entre un cliente y un agente de soporte.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID del vínculo. |
| `actor_a_id` | UUID | FK (actors.id), Not Null | Primer actor de la relación. |
| `actor_b_id` | UUID | FK (actors.id), Not Null | Segundo actor de la relación. |
| `perspective_a` | JSONB | Not Null | Cómo ve el Actor A al Actor B (tags, nombre guardado). |
| `perspective_b` | JSONB | Not Null | Cómo ve el Actor B al Actor A. |
| `context` | JSONB | Not Null | **Memoria Compartida**. Notas, reglas y preferencias. |
| `last_interaction`| TIMESTAMP | Nullable | Fecha del último mensaje o evento compartido. |

## 🧬 Relaciones (Connections)
-   **Bilateral**: Siempre vincula dos `actors`. Existe un constraint `no_self_relationship` para evitar que un actor tenga una relación consigo mismo.
-   **Conversations**: La mayoría de las conversaciones están ancladas a una `relationship_id` para heredar su contexto.

## 🛡️ Reglas de Negocio (Operations)
1.  **Memoria de IA**: El campo `context` es consumido por el `ContextBus` para alimentar el prompt de la IA con hechos previos (ej: "A este cliente le gusta que le hablen de tú").
2.  **Perspectivas**: Permite que el Actor A guarde al Actor B como "Mamá" mientras que el Actor B guarda al Actor A como "Hijo", sin conflicto de datos.
3.  **Bloqueo**: El campo `status` dentro de las perspectivas permite implementar bloqueos unilaterales o archivado de contactos.

## 💡 Ejemplo de Uso
```typescript
// Buscar relación entre dos actores
import { db, relationships } from '@fluxcore/db';
import { eq, and, or } from 'drizzle-orm';

const [rel] = await db.select()
  .from(relationships)
  .where(or(
    and(eq(relationships.actorAId, actorA), eq(relationships.actorBId, actorB)),
    and(eq(relationships.actorAId, actorB), eq(relationships.actorBId, actorA))
  )).limit(1);
```
