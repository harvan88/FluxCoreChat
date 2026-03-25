---
id: "db-accounts"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/accounts.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de identidades de actor" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Users, Assets. Referenciada por Conversations, Credits, AI Entitlements" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Account & Billing Management" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Alias uniqueness (Canonical ID), AI privacy flags, Identity-Avatar linkage" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: accounts

## 🎯 Propósito
La tabla `accounts` representa la "personalidad" o el "sujeto de negocio" dentro de FluxCore. Mientras un `user` es la entidad de login, la `account` es la entidad que participa en chats, consume créditos y tiene configuración de IA.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID universal de la cuenta. |
| `owner_user_id` | UUID | FK (users.id) | Usuario dueño de la cuenta. |
| `username` | VARCHAR(100) | Unique, Not Null | Nombre de usuario único (legacy/internal). |
| `display_name` | VARCHAR(255) | Not Null | Nombre legible para otros usuarios. |
| `alias` | VARCHAR(100) | Unique, Not Null | **ID Canónico**. Identificador público único (v8.x). |
| `account_type` | VARCHAR(20) | Not Null | `personal` o `business`. |
| `profile` | JSONB | Not Null | Datos extendidos del perfil. |
| `private_context` | TEXT | Nullable | Información privada inyectada en el prompt de IA. |
| `allow_automated_use`| BOOLEAN | Default False | Permite que la IA use esta cuenta automáticamente. |
| `avatar_asset_id` | UUID | FK (assets.id) | Referencia al archivo de avatar en el sistema de assets. |

## 🧬 Relaciones (Connections)
-   **Belongs To `users`**: Toda cuenta debe tener un humano dueño.
-   **Has One `account_ai_entitlements`**: Define qué modelos de IA puede usar esta cuenta.
-   **Has Many `conversations`**: Chats donde esta cuenta es participante o dueña.
-   **Belongs To `assets`**: El avatar es un recurso gestionado por el sistema de assets.

## 🛡️ Reglas de Negocio (Operations)
1.  **Alias como Identidad**: El `alias` es la ruta pública (`/public/profiles/:alias`). Debe ser validado contra palabras prohibidas de sistema.
2.  **Privacidad IA**: Existen flags específicos (`ai_include_name`, `ai_include_bio`) que controlan qué porción del perfil es visible para el LLM durante la generación de respuestas.
3.  **Contexto Privado**: La columna `private_context` se utiliza para almacenar "instrucciones secretas" o datos de trasfondo que solo la IA lee para personalizar su comportamiento actuando como esta cuenta.

## 💡 Ejemplo de Uso
```typescript
// Obtener cuenta por alias (perfil público)
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const [account] = await db.select()
  .from(accounts)
  .where(eq(accounts.alias, 'mi-negocio'))
  .limit(1);
```
