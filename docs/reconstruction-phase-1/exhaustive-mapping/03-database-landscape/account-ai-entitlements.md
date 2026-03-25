---
id: "db-account-ai-entitlements"
type: "database-table"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/account-ai-entitlements.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Tabla de permisos de IA" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "FK a Accounts. Consumido por RuntimeGateway y AIService" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Subscription & Feature Flags" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Provider filtering, Feature toggle (enabled), Model-provider linkage" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Table: account_ai_entitlements

## 🎯 Propósito
Esta tabla actúa como el "Feature Flag" de IA para cada cuenta. Define si una cuenta tiene acceso a capacidades cognitivas y qué infraestructura (proveedores) está autorizada a utilizar.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID del permiso. |
| `account_id` | UUID | FK (accounts.id) | Cuenta a la que pertenecen los permisos. |
| `enabled` | BOOLEAN | Default False | Swich maestro de IA para la cuenta. |
| `allowed_providers`| JSONB | Default [] | Array de strings (ej: `['groq', 'openai']`). |
| `default_provider` | VARCHAR(20) | Nullable | Proveedor preferido si no se especifica uno. |

## 🧬 Relaciones (Connections)
-   **One-to-One Partial with `accounts`**: Cada cuenta puede tener un registro de entitlements. Si no existe, se asume `enabled = false`.
-   **Consumidores**: El `AIService` y los `RuntimeAdapters` consultan esta tabla antes de realizar peticiones a APIs externas de LLM.

## 🛡️ Reglas de Negocio (Operations)
1.  **Prevención de Costos**: Si `enabled` es `false`, el sistema bloquea cualquier pipeline cognitivo en el kernel antes de llegar al despacho, ahorrando recursos de computación.
2.  **Seguridad de Datos**: El campo `allowed_providers` permite restringir cuentas específicas a proveedores con cumplimiento (compliance) particular (ej: Solo usar modelos locales o solo OpenAI Azure).
3.  **Casandra Alert**: Históricamente (v7.x), existían discrepancias entre las tablas de asistentes y entitlements. En v8.x, esta tabla es la **Autoridad Suprema** sobre el acceso a modelos.

## 💡 Ejemplo de Uso
```typescript
// Verificar acceso a proveedor IA
import { db, accountAiEntitlements } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const [e] = await db.select()
  .from(accountAiEntitlements)
  .where(eq(accountAiEntitlements.accountId, accountId))
  .limit(1);
```
