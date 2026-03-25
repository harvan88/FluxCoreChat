---
id: "db-kernel-journal"
type: "core"
status: "stable"
criticality: "critical"
location: "packages/db/src/schema/fluxcore-journal.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100 }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# 📊 Schema Cluster: Kernel Journal (RFC-0001 — Sovereign Reality)

## 🎯 Propósito
El Journal es la **única fuente de verdad** del sistema completo. Aquí se certifican todas las observaciones de la realidad. El Kernel NO modela negocio: solo registra hechos observados y certificados por adaptadores autorizados. Está **PROHIBIDO** incluir columnas semánticas de aplicación (`accountId`, `conversationId`).

## 🚥 Componentes (Discovery)

### 1. `fluxcore_reality_adapters`
Registro de certificadores autorizados. Cada adaptador tiene un `signing_secret` y una versión.

### 2. `fluxcore_signals`
El diario inmutable. Cada señal tiene:
- **Source** (`source_namespace` + `source_key`): Origen causal.
- **Subject/Object**: Referencia opcional a actores/recursos.
- **Evidence**: Observación cruda con checksum de integridad.
- **Provenance**: Driver y punto de entrada que originó la observación.
- **Certification**: Qué adaptador y versión certificó el hecho.
- **PK**: `bigserial` (`sequence_number`) para ordenamiento determinista global.

### 3. `fluxcore_projector_cursors`
Progreso de cada Projector. Garantiza procesamiento determinista at-least-once.

### 4. `fluxcore_projector_errors`
Log canónico de errores de proyección con conteo de reintentos y resolución.

### 5. `fluxcore_fact_types`
Tabla de referencia para tipos de hechos válidos.

## 🧬 Relaciones (Connections)
- Los **Projectors** (ChatProjector, IdentityProjector) leen del Journal y escriben en tablas de proyección.
- El **CognitionWorker** se activa por señales nuevas.
- Los **Reality Adapters** (WhatsApp, Web Widget, etc.) son los únicos autorizados a escribir aquí.

## 🏗️ Arquitectura/Flujo
El Kernel graba en `fluxcore_signals` e inmediatamente notifica al bus, el cual arranca los proyectores correspondientes basados en `fluxcore_projector_cursors`.

## 🔗 Dependencias
- **Postgres sequences**: Para `sequence_number`.
- **RealityAdapters**: Interfaz única de ingestión con HMAC y llave secreta de firmado.

## 🛡️ Invariantes (Operations)
1. **Inmutabilidad Total**: Una señal certificada NUNCA se modifica.
2. **Fingerprint Único**: El constraint `signal_fingerprint` previene duplicados.
3. **Adapter-External Unique**: Un adaptador no puede certificar dos señales con el mismo `provenance_external_id`.
4. **clock_timestamp()**: Se usa en lugar de `now()` para evitar que transacciones largas compartan timestamp.

## 💡 Ejemplo de Uso
```typescript
// Leer señales del Journal (usado por Projectors)
import { db, fluxcoreSignals } from '@fluxcore/db';
import { gt, asc } from 'drizzle-orm';

const signals = await db.select()
  .from(fluxcoreSignals)
  .where(gt(fluxcoreSignals.sequenceNumber, lastCursor))
  .orderBy(asc(fluxcoreSignals.sequenceNumber))
  .limit(100);
```
