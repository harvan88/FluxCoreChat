---
id: "db-account-locations"
type: "database-table"
status: "stable"
criticality: "high"
location: "packages/db/src/schema/locations.ts"
---

# 📊 Table: account_locations

## 🎯 Propósito
La tabla `account_locations` gestiona las sedes físicas de una cuenta de negocio. Permite definir la ubicación geográfica (coordenadas), datos de contacto específicos por sede y el tipo de servicio ofrecido (delivery, pickup, etc.).

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID único de la sede. |
| `account_id` | UUID | FK (accounts.id) | Cuenta dueña de la sede. |
| `name` | VARCHAR(255) | Not Null | Nombre descriptivo (ej: "Sucursal Centro"). |
| `address` | TEXT | Nullable | Dirección legible para humanos. |
| `lat` | REAL | Nullable | Latitud para geolocalización. |
| `lon` | REAL | Nullable | Longitud para geolocalización. |
| `service_type` | VARCHAR(20) | Default 'both' | `delivery`, `pickup`, `both`, `online_only`. |
| `coverage_radius_km`| REAL | Nullable | Radio de cobertura para servicios de entrega. |
| `status` | VARCHAR(20) | Default 'active' | `active`, `temp_closed`, `perm_closed`. |
| `is_default` | BOOLEAN | Default false | Marca la sede principal de la cuenta. |

## 🧬 Relaciones (Connections)
- **Belongs To `accounts`**: Cada sede pertenece a una única cuenta de negocio.
- **Has Many `weekly_schedules`**: Horarios de atención vinculados a esta sede (ownerType='location').
- **Has Many `special_dates`**: Excepciones de horario vinculadas a esta sede.

## 🛡️ Reglas de Negocio (Operations)
1. **Soberanía de la Dirección (D2)**: El campo `address` escrito por el usuario es la autoridad. Las coordenadas `lat`/`lon` son datos de apoyo para el mapa y cálculos de distancia, pero no deben sobrescribir la dirección manual.
2. **Desacoplamiento de Zona Horaria (D9)**: A partir de la Fase 3, las sedes NO tienen zona horaria propia. Utilizan la zona horaria definida en `accounts.timezone`.
3. **Validación de Radio (D6)**: Si el `service_type` incluye `delivery`, el campo `coverage_radius_km` es obligatorio para que la IA y el sistema puedan validar la factibilidad del servicio.

## 💡 Ejemplo de Uso
```typescript
import { db, accountLocations } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

// Obtener sedes activas para una cuenta
const locations = await db.select()
  .from(accountLocations)
  .where(and(
    eq(accountLocations.accountId, accountId),
    eq(accountLocations.status, 'active')
  ));
```
