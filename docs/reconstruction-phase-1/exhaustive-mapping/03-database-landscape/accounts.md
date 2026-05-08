---
id: "db-accounts"
type: "database-table"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/accounts.ts"
---

# 📊 Table: accounts

## 🎯 Propósito
La tabla `accounts` representa la "personalidad" o el "sujeto de negocio" dentro de FluxCore. Mientras un `user` es la entidad de login, la `account` es la entidad que participa en chats, consume créditos y tiene configuración de IA. En la Fase 3, se convierte en el SSOT (Single Source of Truth) para datos regionales (país y zona horaria).

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID universal de la cuenta. |
| `owner_user_id` | UUID | FK (users.id) | Usuario dueño de la cuenta. |
| `alias` | VARCHAR(100) | Unique, Not Null | **ID Canónico**. Identificador público único. |
| `country` | VARCHAR(2) | Nullable | **SSOT Regional**. Código ISO 3166-1 alpha-2 (ej: AR, ES). |
| `timezone` | VARCHAR(50) | Nullable | **SSOT Regional**. Zona horaria IANA (ej: America/Argentina/Buenos_Aires). |
| `brand_colors` | JSONB | Default {} | Colores corporativos (primary, secondary, accent). |
| `social_links` | JSONB | Default {} | Enlaces a redes sociales con toggles de visibilidad IA. |
| `allow_automated_use`| BOOLEAN | Default False | Permite que la IA use esta cuenta automáticamente. |
| `avatar_asset_id` | UUID | FK (assets.id) | Referencia al archivo de avatar. |

## 🧬 Relaciones (Connections)
- **Belongs To `users`**: Toda cuenta debe tener un humano dueño.
- **Has Many `account_locations`**: Sedes físicas asociadas.
- **Has Many `weekly_schedules`**: Horarios asociados (vía ownerId polimórfico).
- **Belongs To `assets`**: El avatar es un recurso gestionado por el sistema de assets.

## 🛡️ Reglas de Negocio (Operations)
1. **SSOT de Horarios (D9/D10)**: La zona horaria se define a nivel de cuenta y no de sede. Esto garantiza que todas las sedes de una cuenta operen bajo la misma lógica regional y simplifica el cálculo de apertura.
2. **Restricción de País Único**: Una cuenta está vinculada a un único país para simplificar la lógica de moneda, impuestos y leyes.
3. **Privacidad IA**: Los flags de visibilidad controlan qué porción de la identidad (incluyendo redes sociales) es inyectada en el contexto del LLM.

## 💡 Ejemplo de Uso
```typescript
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const [account] = await db.select()
  .from(accounts)
  .where(eq(accounts.alias, 'mi-negocio'))
  .limit(1);

console.log(`Operando en: ${account.timezone}`);
```
