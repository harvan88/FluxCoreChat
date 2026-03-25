---
id: "db-users"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/users.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla base de identidad" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Referenciado por Accounts, Workspaces, Audit Logs" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Core Auth & Identity" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Email uniqueness, UUID v4 primary keys, Automatic timestamp management" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: users

## 🎯 Propósito
La tabla `users` es la raíz de la identidad humana en el sistema. Almacena las credenciales de acceso y los metadatos básicos de las personas físicas que utilizan FluxCore.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default Random | Identificador único universal. |
| `email` | VARCHAR(255) | Unique, Not Null | Correo electrónico (identificador de login). |
| `password_hash` | VARCHAR(255) | Not Null | Hash de la contraseña (BCrypt/Argon2). |
| `name` | VARCHAR(255) | Not Null | Nombre completo del usuario. |
| `created_at` | TIMESTAMP | Default Now | Fecha de registro. |
| `updated_at` | TIMESTAMP | Default Now | Fecha de última modificación. |

## 🧬 Relaciones (Connections)
-   **Has Many `accounts`**: Un usuario puede ser dueño de múltiples cuentas (Personales o Business).
-   **Has Many `workspace_members`**: Un usuario puede pertenecer a múltiples espacios de trabajo colaborativos.
-   **Has Many `password_reset_tokens`**: Tokens temporales vinculados al usuario para recuperación.

## 🛡️ Reglas de Negocio (Operations)
1.  **Unicidad de Email**: El sistema impide registros duplicados con el mismo correo, asegurando la integridad del proceso de login.
2.  **Cascada**: La eliminación de un usuario desencadena la eliminación de sus cuentas asociadas (Cascade) para cumplir con el derecho al olvido (GDPR).
3.  **Auditoría**: Siempre mantiene el rastro de creación y actualización automática.

## 💡 Ejemplo de Uso
```typescript
// Buscar usuario por email (login flow)
import { db, users } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const [user] = await db.select()
  .from(users)
  .where(eq(users.email, 'admin@fluxcore.io'))
  .limit(1);
```
