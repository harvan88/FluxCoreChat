---
id: "db-actors"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/actors.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla ontológica base" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Users, Accounts. Referenciada por Relationships, Messages, Participants" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Ontological Identity System" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Polymorphic actor types, External key mapping (Visitors), Identity linkage (Legacy migration)" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: actors

## 🎯 Propósito
La tabla `actors` es la piedra angular ontológica de FluxCore v8. Representa a cualquier entidad capaz de generar acciones o recibir mensajes en el sistema, unificando bajo un solo ID a humanos (`accounts`), visitantes anónimos (`visitors`), IAs integradas (`builtin_ai`) y extensiones.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID ontológico universal. |
| `actor_type` | VARCHAR(20) | Not Null | `account`, `visitor`, `builtin_ai`, `extension`. |
| `account_id` | UUID | FK (accounts.id) | Vinculación si el actor es una cuenta registrada. |
| `user_id` | UUID | FK (users.id) | Vinculación directa al usuario logueado. |
| `external_key` | TEXT | Nullable | Token de visitante o ID externo del canal. |
| `display_name` | VARCHAR(100) | Nullable | Nombre para mostrar en la interfaz. |
| `tenant_id` | UUID | FK (accounts.id) | Cuenta dueña del contexto (ej: dueño del widget). |

## 🧬 Relaciones (Connections)
-   **Polimorfismo**: Actúa como el puente hacia `accounts` y `users`.
-   **Relationships**: Las relaciones bilaterales se definen entre dos `actors.id`, no entre cuentas.
-   **Messages**: Los campos `from_actor_id` y `to_actor_id` en la tabla de mensajes apuntan aquí.

## 🛡️ Reglas de Negocio (Operations)
1.  **Unificación de Identidad**: Permite que un visitante anónimo sea convertido en una cuenta registrada manteniendo su historial, simplemente actualizando `linked_account_id` y `linked_at`.
2.  **Actores de Sistema**: Los actores de tipo `extension` o `builtin_ai` permiten rastrear acciones automáticas (ej: una respuesta generada por Karen) con la misma precisión que una acción humana.
3.  **Aislamiento por Tenant**: El `tenant_id` asegura que los visitantes de un widget web pertenezcan lógicamente a la cuenta del cliente que instaló el script, evitando cruces de datos.

## 💡 Ejemplo de Uso
```typescript
// Resolver actor desde cuenta o visitor token
import { db, actors } from '@fluxcore/db';
import { eq, or } from 'drizzle-orm';

const [actor] = await db.select()
  .from(actors)
  .where(or(
    eq(actors.accountId, accountId),
    eq(actors.externalKey, visitorToken)
  ))
  .limit(1);
```
