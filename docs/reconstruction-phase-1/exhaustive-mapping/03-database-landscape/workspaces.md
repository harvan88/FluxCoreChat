---
id: "db-workspaces"
type: "database-table"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/workspaces.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tablas de colaboración (Workspaces/Members/Invites)" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts (Owner), Users (Members/InvitedBy)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Collaboration & Permissions" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Role-based access (RBAC), Invitation token lifecycle, Automatic member joining" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Tables: workspace_system

## 🎯 Propósito
Este conjunto de tablas habilita la colaboración grupal. Permiten que una cuenta de negocio (`business`) sea administrada por múltiples usuarios con diferentes niveles de acceso.

## 🚥 Estructura Principal (Discovery)

### `workspaces`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | ID del espacio de trabajo. |
| `owner_account_id`| UUID | La cuenta de FluxCore dueña de este workspace. |
| `name` | VARCHAR(255) | Nombre del equipo/espacio. |
| `settings` | JSONB | Configuración global del workspace. |

### `workspace_members`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `workspace_id` | UUID | Referencia al workspace. |
| `user_id` | UUID | El humano miembro. |
| `role` | VARCHAR(20) | `owner`, `admin`, `operator`, `viewer`. |
| `permissions` | JSONB | Overrides granulares de permisos (RBAC). |

### `workspace_invitations`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `email` | VARCHAR(255) | Email invitado (aún no requiere ser usuario). |
| `token` | VARCHAR(100) | Token secreto para aceptar la invitación. |
| `expires_at` | TIMESTAMP | Fecha límite para unirse. |

## 🧬 Relaciones (Connections)
-   **Cascade Delete**: Si se elimina una `account` dueña, se eliminan sus `workspaces`. Si se elimina un `workspace`, se eliminan sus `members` e `invitations`.
-   **Audit Trail**: La columna `invited_by` rastrea qué usuario originó la invitación o la membresía.

## 🛡️ Reglas de Negocio (Operations)
1.  **Inmutabilidad del Dueño**: Siempre debe existir al menos un usuario con rol `owner` en el workspace. No se permite la auto-revocación del último dueño.
2.  **Validación de Email**: Las invitaciones son vinculantes al email. Al aceptar, el sistema valida que el `user.email` actual coincida con el `invitation.email`.
3.  **RBAC Dinámico**: El campo `permissions` permite definir capacidades específicas (ej: `canRespondChats: true`) que pueden sobreescribir los permisos predeterminados del rol asignado.

## 💡 Ejemplo de Uso
```typescript
// Listar miembros de un workspace con sus roles
import { db, workspaceMembers, users } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const members = await db.select({
  userId: workspaceMembers.userId,
  role: workspaceMembers.role,
  name: users.name,
}).from(workspaceMembers)
  .innerJoin(users, eq(workspaceMembers.userId, users.id))
  .where(eq(workspaceMembers.workspaceId, workspaceId));
```
