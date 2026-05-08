---
id: "db-special-dates"
type: "database-table"
status: "stable"
criticality: "medium"
location: "packages/db/src/schema/schedules.ts"
---

# 📊 Table: special_dates

## 🎯 Propósito
Gestiona las excepciones al horario regular (feriados, eventos especiales, cierres imprevistos). Estas fechas tienen prioridad absoluta sobre los horarios semanales regulares.

## 🚥 Estructura (Discovery)
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key | ID único de la excepción. |
| `owner_type` | VARCHAR(30) | Not Null | Tipo de entidad. |
| `owner_id` | UUID | Not Null | ID de la entidad dueña. |
| `date` | DATE | Unique, Not Null | Fecha de la excepción (YYYY-MM-DD). |
| `is_closed` | BOOLEAN | Not Null, Default true | Si es true, la entidad cierra todo el día. |
| `label` | VARCHAR(100) | Nullable | Etiqueta descriptiva (ej: "Navidad"). |

## 🧬 Relaciones (Connections)
- **Has Many `special_intervals`**: Si `is_closed` es false, define las franjas horarias específicas para esa fecha especial.

## 🛡️ Reglas de Negocio (Operations)
1. **Prioridad de Excepción**: En el algoritmo de cálculo de apertura (`isBusinessOpen`), se debe consultar primero esta tabla. Si existe una entrada para la fecha consultada, se ignora el `weekly_schedule`.
2. **Unicidad por Dueño**: No se permite más de una entrada en `special_dates` para la misma fecha y el mismo `ownerId`.

## 💡 Ejemplo de Uso
```typescript
import { db, specialDates } from '@fluxcore/db';
import { and, eq } from 'drizzle-orm';

// Verificar si hoy es un día especial para la sede
const [specialDay] = await db.select()
  .from(specialDates)
  .where(and(
    eq(specialDates.ownerType, 'location'),
    eq(specialDates.ownerId, locationId),
    eq(specialDates.date, '2026-12-25')
  ));
```
