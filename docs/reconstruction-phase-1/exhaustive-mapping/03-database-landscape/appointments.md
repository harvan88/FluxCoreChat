---
id: "db-appointments"
type: "subsystem"
status: "stable"
criticality: "medium"
location: "packages/db/src/schema/appointments.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Appointments (Turnos/Citas)

## 🎯 Propósito
Sistema de gestión de citas y turnos para negocios. Permite a una cuenta definir servicios, asignar personal y agendar clientes. La IA puede usar este sistema si `allow_automated_use = true`.

## 🚥 Componentes (Discovery)

### 1. `appointment_services`
Catálogo de servicios con duración, precio y moneda.

### 2. `appointment_staff`
Personal disponible para atender turnos. Incluye `availability` (JSONB con horarios por día) y array de `services` que puede atender.

### 3. `appointments`
Citas agendadas. Vincula servicio + staff + cliente con un `scheduled_at` y un `status` (`pending`, `confirmed`, `cancelled`, `completed`).

## 🧬 Relaciones (Connections)
- Todas las tablas anclan a `accounts.id`.
- `appointments.client_account_id` es opcional (el cliente puede ser externo).
- `appointments.service_id` y `staff_id` son FKs con `ON DELETE SET NULL` para preservar históricos.

## 🏗️ Arquitectura/Flujo
El Flujo principal consiste en validar staff/servicios activos y crear en estado `pending`, para luego usar endpoints de modificación de status.

## 🔗 Dependencias
- **AccountService**: Validar scope del cliente.
- **CalendarSyncService**: (Opcional) Sincronizar hacia Google Calendar si se implementa overlay.

## 🛡️ Reglas de Operación (Operations)
1. **AI Access Gate**: Solo si `allow_automated_use = true` la IA puede consultar o programar citas por tool_call.
2. **Soft Delete**: Los servicios y staff se desactivan (`active = false`) en vez de eliminarse.

## 💡 Ejemplo de Uso
```typescript
// Listar citas pendientes de una cuenta
import { db, appointments } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const pending = await db.select()
  .from(appointments)
  .where(and(
    eq(appointments.accountId, accountId),
    eq(appointments.status, 'pending')
  ));
```
