---
id: "db-fluxcore-identity"
type: "core"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/fluxcore-identity.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Ontological Identity System (Projector Space)

## 🎯 Propósito
Define la identidad ontológica de FluxCore. Estas tablas son **DERIVADAS** del Journal por el IdentityProjector. El Kernel NO conoce estas tablas.

## 🚥 Componentes (Discovery)

### 1. `fluxcore_actors` — Identidad Global
Representación de una fuente única de voluntad. Puede ser `provisional` (visitante anónimo) o `real` (usuario autenticado).

### 2. `fluxcore_addresses` — Puntos de Entrada Físicos
Endpoint técnico de un canal (ej: `driver: whatsapp`, `external_id: +5491155...`). Unique constraint `(driver_id, external_id)`.

### 3. `fluxcore_actor_address_links` — Binding Actor↔Address
Vincula actores con sus direcciones. Incluye `confidence` y `version` para resolución de identidad progresiva.

### 4. `fluxcore_account_actor_contexts` — Contexto Comercial
El significado semántico de un actor para una cuenta específica. Aquí vive `accountId` (nunca en el Journal).

### 5. `fluxcore_actor_identity_links` — Promoción de Identidad
Vincula un actor provisional (widget visitor) con una cuenta real cuando se autentica.

## 🧬 Relaciones (Connections)
- `fluxcore_actors.created_from_signal` → `fluxcore_signals.sequence_number` (trazabilidad al Journal).
- `fluxcore_actor_identity_links.linking_signal_seq` → `fluxcore_signals.sequence_number`.
- `fluxcore_account_actor_contexts.account_id` → `accounts.id`.

## 🏗️ Arquitectura/Flujo
Las tablas son pasivas y alimentadas unilateralmente por el `IdentityProjector` que interpreta señales del Kernel.

## 🔗 Dependencias
- **IdentityProjector**: Alimentador exclusivo.
- **FluxcoreJournal**: Base factual para las proyecciones.

## 🛡️ Invariantes (Operations)
1. **Projector Space**: Estas tablas se reconstruyen exclusivamente desde el Journal.
2. **accountId solo aquí**: La regla canónica prohíbe `accountId` en el Journal, por lo que reside en `account_actor_contexts`.
3. **Resolución de Identidad Progresiva**: El campo `confidence` en los links permite que el sistema refine la identidad a medida que obtiene más evidencia.

## 💡 Ejemplo de Uso
```typescript
// Resolver actor ontológico desde visitor token
import { db, fluxcoreActors } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

const [actor] = await db.select()
  .from(fluxcoreActors)
  .where(and(
    eq(fluxcoreActors.externalKey, visitorToken),
    eq(fluxcoreActors.tenantId, accountId)
  )).limit(1);
```
