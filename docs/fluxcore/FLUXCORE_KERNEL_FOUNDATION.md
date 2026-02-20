# FluxCore Kernel Foundation

> RFC-0001 — FluxCore Kernel Freeze (Estado: RATIFICADO)

---

## RFC-0001 Resumen

**Efecto:** inmediato. **Ámbito:** todo FluxCore. **Autoridad:** Arquitectura FluxCore.

- Este documento no introduce diseño: **lo cierra**. El Kernel se convierte en interfaz permanente.
- Se considera estable la combinación de tablas (`fluxcore_signals`, `fluxcore_outbox`, `fluxcore_reality_adapters`, `fluxcore_projector_cursors`), contrato `Kernel.ingestSignal()`, esquema de firma y `sequence_number + evidence_raw`.
- El costo de cambiar el Kernel es mayor que el de adaptarse a él.
- El Journal puede estar incompleto, ruidoso o sin semántica de negocio y **no se rediseñará**. Solo certifica que FluxCore recibió evidencia.
- Está prohibido modificar semánticamente el Journal (columnas, significados, `sequence_number`, nociones de chat/CRM, borrado de evidencia, mutaciones o rescritura del pasado). Si una feature requiere alterar historia, la feature está mal diseñada.
- **Permitido:** índices, tablas derivadas, proyectores, nuevos Reality Adapters, versiones de adapters, nuevas interpretaciones, reconstrucciones desde cero. Toda semántica vive en proyectores.
- Política de errores: no se corrige el Journal; se corrige el proyector o se versiona el adapter. La historia permanece intacta.
- Consecuencia: FluxCore es un sistema replayable. Todo estado debe reconstruirse leyendo `fluxcore_signals ORDER BY sequence_number`. Si no es posible, es bug.
- Cláusula extrema: solo una imposibilidad física (corrupción irreversible) justifica reemplazar el Kernel, creando versión nueva sin migrar destructivamente.
- Efecto organizacional: debates del Kernel cierran; el trabajo pasa a adapters/proyectores; el progreso depende de código corriendo.
- Declaración final: el diseño actual es suficiente para construir. El Kernel se valida por operación, no por perfección hipotética.

**Kernel Freeze ratificado.**

> Documento fundacional: describe el Journal ontológico, los tipos expuestos y el contrato del Kernel. Debe revisarse y aprobarse antes de cualquier implementación.

---

## 1. Propósito

FluxCore es un Work Operating System. El Kernel es el único guardián de la realidad certificada. Todo dato derivado (chat, IA, agentes, CRM, automatizaciones) existe gracias a este Journal. Cualquier violación a este contrato degrada FluxCore a un event-sourced chat.

Objetivos del Kernel:

1. Registrar observaciones físicas certificables (hechos universales) — no dependen de tenants ni de interpretación de negocio.
2. Garantizar idempotencia física absoluta.
3. Mantener un orden total global (`sequence_number`).
4. Asignar tiempo de observación confiable (`observed_at`) proveniente del momento en que la realidad tocó FluxCore.
5. Conservar evidencia cruda para reprocesar la historia con nuevas interpretaciones sin mutar el Journal.

### 1.1 Fenómeno vs hecho

- **Fenómeno**: algo que ocurre en el mundo externo (una persona escribe en WhatsApp, un webhook llega tarde, etc.).
- **Observación**: evidencia física que FluxCore recibe de ese fenómeno (el paquete HTTPS que ingresa, el audio subido a S3, el correo recibido).
- **SystemFact**: la fila en `fluxcore_signals` que certifica haber recibido esa observación con evidencia verificable.

Regla fundamental: **el Kernel no afirma el fenómeno**, afirma la observación. Un SystemFact dice “FluxCore recibió evidencia con estas propiedades” y nada más. Todas las interpretaciones posteriores (intenciones, lectura de mensajes, resultados de IA) viven en proyectores. El Journal funciona como registro forense: conserva rastros físicos de interacción causal con la realidad para que el resto de FluxCore pueda reconstruir la historia sin alterar la evidencia.

---

## 2. Esquema SQL del Journal

Archivo: `packages/db/migrations/001_fluxcore_journal.sql`

```sql
CREATE TABLE fluxcore_reality_adapters (
    adapter_id      TEXT PRIMARY KEY,
    driver_id       TEXT NOT NULL,
    adapter_class   TEXT NOT NULL CHECK (adapter_class IN ('SENSOR', 'GATEWAY', 'INTERPRETER')),
    description     TEXT NOT NULL,
    signing_secret  TEXT NOT NULL,
    adapter_version TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fluxcore_signals (
    sequence_number        BIGSERIAL PRIMARY KEY,

    signal_fingerprint     TEXT NOT NULL UNIQUE,
    fact_type              TEXT NOT NULL CHECK (fact_type IN (
        'EXTERNAL_INPUT_OBSERVED',
        'EXTERNAL_STATE_OBSERVED',
        'DELIVERY_SIGNAL_OBSERVED',
        'MEDIA_CAPTURED',
        'SYSTEM_TIMER_ELAPSED',
        'CONNECTION_EVENT_OBSERVED'
    )),

    source_namespace       TEXT NOT NULL,
    source_key             TEXT NOT NULL,

    subject_namespace      TEXT,
    subject_key            TEXT,

    object_namespace       TEXT,
    object_key             TEXT,

    evidence_raw           JSONB NOT NULL,
    evidence_format        TEXT NOT NULL,
    evidence_checksum      TEXT NOT NULL,

    provenance_driver_id   TEXT NOT NULL,
    provenance_external_id TEXT,
    provenance_entry_point TEXT,

    certified_by_adapter   TEXT NOT NULL REFERENCES fluxcore_reality_adapters(adapter_id),
    certified_adapter_version TEXT NOT NULL,

    claimed_occurred_at    TIMESTAMPTZ,
    observed_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CHECK ((subject_namespace IS NULL) = (subject_key IS NULL))
);

CREATE INDEX idx_fluxcore_source
    ON fluxcore_signals(source_namespace, source_key, sequence_number);

CREATE INDEX idx_fluxcore_subject
    ON fluxcore_signals(subject_namespace, subject_key, sequence_number)
    WHERE subject_namespace IS NOT NULL;

CREATE INDEX idx_fluxcore_sequence
    ON fluxcore_signals(sequence_number);

CREATE INDEX idx_fluxcore_claimed_occurred
    ON fluxcore_signals(claimed_occurred_at);

CREATE UNIQUE INDEX ux_fluxcore_adapter_external
    ON fluxcore_signals(certified_by_adapter, provenance_external_id)
    WHERE provenance_external_id IS NOT NULL;
ALTER TABLE fluxcore_outbox
    ADD CONSTRAINT ux_outbox_sequence UNIQUE(sequence_number);

CREATE FUNCTION fluxcore_prevent_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'fluxcore_signals is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fluxcore_no_update
BEFORE UPDATE ON fluxcore_signals
FOR EACH ROW EXECUTE FUNCTION fluxcore_prevent_mutation();

CREATE TRIGGER fluxcore_no_delete
BEFORE DELETE ON fluxcore_signals
FOR EACH ROW EXECUTE FUNCTION fluxcore_prevent_mutation();
```

### Reglas del esquema
- La identidad física primaria es `(certified_by_adapter, provenance_external_id)` cuando `external_id` existe; el fingerprint actúa como respaldo cuando la fuente no provee ID.
- El fingerprint se calcula con datos soberanos del fenómeno físico (adapter, source, checksum) y jamás incluye `adapterVersion`.
- `observed_at` lo define Postgres; ningún proceso puede falsificarlo.
- La identidad descriptiva (nombres, avatares) vive en proyectores.
- `sequence_number` define el reloj lógico del sistema.
- `sequence_number` ordena la observación; los proyectores que necesiten orden causal deben aplicar tolerancia usando `claimed_occurred_at`.
- `evidence_checksum` es obligatorio para validar integridad histórica.
- Toda señal incluye `certified_by_adapter`; solo adapters registrados pueden generar hechos.
- Clases de adapters: `SENSOR`/`GATEWAY` pueden certificar realidad física; `INTERPRETER` jamás puede invocar al Kernel.
- `source_namespace/source_key` identifican el origen causal de la observación aun cuando no exista un actor discernible; `subject` es opcional.

### Outbox transaccional

```sql
CREATE TABLE fluxcore_outbox (
    id               BIGSERIAL PRIMARY KEY,
    sequence_number  BIGINT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at     TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unprocessed
    ON fluxcore_outbox(processed_at)
    WHERE processed_at IS NULL;

CREATE TABLE fluxcore_projector_cursors (
    projector_name        TEXT PRIMARY KEY,
    last_sequence_number  BIGINT NOT NULL
);

CREATE TABLE fluxcore_fact_types (
    fact_type TEXT PRIMARY KEY,
    description TEXT NOT NULL
);
```

### Reglas para outbox y cursores
- La entrada en `fluxcore_outbox` se crea en la misma transacción que la observación certificada y hereda su `sequence_number`.
- `fluxcore_projector_cursors` es el único lugar donde cada proyector puede persistir su avance; debe actualizarse en la misma transacción que los writes derivados.
- Ningún proceso puede encolar mensajes ni avanzar cursores fuera de este contrato.

### Clases físicas de `fact_type`

El Kernel solo reconoce las siguientes clases inmutables (todas describen interacción física con el sistema):

1. `EXTERNAL_INPUT_OBSERVED`
2. `EXTERNAL_STATE_OBSERVED`
3. `DELIVERY_SIGNAL_OBSERVED`
4. `MEDIA_CAPTURED`
5. `SYSTEM_TIMER_ELAPSED`
6. `CONNECTION_EVENT_OBSERVED`

Nuevas semánticas se modelan en proyectores usando estos cimientos; el Kernel jamás introduce fact types dependientes del negocio.

---

## 3. Tipos TypeScript Públicos

Archivo: `apps/api/src/core/types.ts`

```ts
export type ActorRef = {
  namespace: string;
  key: string;
};

export type SourceRef = {
  namespace: string;
  key: string;
};

export interface Evidence {
  raw: unknown;
  format: string;
  provenance: {
    driverId: string;
    externalId?: string;
    entryPoint?: string;
  };
  claimedOccurredAt?: Date; // tiempo provisto por la fuente (puede ser inconsistente)
}

export interface ExternalObservation {
  driverId: string;
  payload: unknown;
  receivedAt: Date;
}

export type PhysicalFactType =
  | 'EXTERNAL_INPUT_OBSERVED'
  | 'EXTERNAL_STATE_OBSERVED'
  | 'DELIVERY_SIGNAL_OBSERVED'
  | 'MEDIA_CAPTURED'
  | 'SYSTEM_TIMER_ELAPSED'
  | 'CONNECTION_EVENT_OBSERVED';

export interface KernelCandidateSignal {
  factType: PhysicalFactType;
  source: SourceRef;
  subject?: ActorRef;
  object?: ActorRef;
  evidence: Evidence;
  certifiedBy: {
    adapterId: string;
    adapterVersion: string;
    signature: string;
  };
}
```

### Notas
- Los drivers solo producen `ExternalObservation`. Un Reality Adapter registrado transforma observaciones en `KernelCandidateSignal`, firma el payload y garantiza versión. Ese `KernelCandidateSignal` representa una observación física certificada (SystemFact), no una interpretación de negocio.
- `source` es obligatorio y describe el origen causal (canal, proveedor, scheduler). `subject/object` son opcionales y se usan solo cuando el adapter puede identificar actores sin inferirlos.
- `claimedOccurredAt` se almacena para análisis causal pero no reemplaza `observed_at`.
- Los fact types están fijos en la lista de clases físicas; cualquier semántica de negocio vive en proyectores.
- Ningún código fuera de un Reality Adapter puede invocar directamente al Kernel.

---

## 4. Contrato `ingestFact()`

Archivo: `apps/api/src/core/kernel.ts`

```ts
import crypto from 'node:crypto';
import { db } from '@fluxcore/db';
import { fluxcoreSignals, fluxcoreOutbox, fluxcoreRealityAdapters } from '@fluxcore/db/schema';
import { eq } from 'drizzle-orm';
import type { KernelCandidateSignal, PhysicalFactType } from './types';

const PHYSICAL_FACT_TYPES: ReadonlySet<PhysicalFactType> = new Set([
  'EXTERNAL_INPUT_OBSERVED',
  'EXTERNAL_STATE_OBSERVED',
  'DELIVERY_SIGNAL_OBSERVED',
  'MEDIA_CAPTURED',
  'SYSTEM_TIMER_ELAPSED',
  'CONNECTION_EVENT_OBSERVED',
]);

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return '{' + entries
    .map(([key, val]) => JSON.stringify(key) + ':' + canonicalize(val))
    .join(',') + '}';
}

function checksumEvidence(raw: unknown): string {
  const serialized = canonicalize(raw ?? null);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function fingerprint(p: KernelCandidateSignal, checksum: string): string {
  const base = [
    p.certifiedBy.adapterId,
    p.source.namespace,
    p.source.key,
    p.evidence.provenance.externalId ?? '',
    checksum,
  ].join('|');

  return crypto.createHash('sha256').update(base).digest('hex');
}

export class Kernel {
  async ingestSignal(candidate: KernelCandidateSignal): Promise<number> {
    if (!PHYSICAL_FACT_TYPES.has(candidate.factType)) {
      throw new Error(`Unknown physical fact class: ${candidate.factType}`);
    }

    const adapterAllowed = await db.query.fluxcoreRealityAdapters.findFirst({
      where: (t, { eq }) => eq(t.adapterId, candidate.certifiedBy.adapterId),
      columns: { adapterId: true, driverId: true, adapterClass: true, signingSecret: true, adapterVersion: true },
    });

    if (!adapterAllowed) {
      throw new Error(`Unknown reality adapter: ${candidate.certifiedBy.adapterId}`);
    }

    if (adapterAllowed.adapterClass === 'INTERPRETER') {
      throw new Error(`Interpreter adapters cannot certify physical reality (${candidate.certifiedBy.adapterId})`);
    }

    if (adapterAllowed.driverId !== candidate.evidence.provenance.driverId) {
      throw new Error(`Driver mismatch for adapter ${candidate.certifiedBy.adapterId}`);
    }

    const canonicalCandidate = canonicalize({
      factType: candidate.factType,
      subject: candidate.subject,
      object: candidate.object ?? null,
      evidence: candidate.evidence,
      adapterId: candidate.certifiedBy.adapterId,
      adapterVersion: candidate.certifiedBy.adapterVersion,
    });

    const expectedSignature = crypto
      .createHmac('sha256', adapterAllowed.signingSecret)
      .update(canonicalCandidate)
      .digest('hex');

    if (expectedSignature !== candidate.certifiedBy.signature) {
      throw new Error('Invalid reality adapter signature');
    }

    return db.transaction(async (tx) => {
      const checksum = checksumEvidence(candidate.evidence.raw);
      const signalFingerprint = fingerprint(candidate, checksum);

      if (candidate.evidence.provenance.externalId) {
        const existingByExternal = await tx.query.fluxcoreSignals.findFirst({
          where: (t, { and, eq }) => and(
            eq(t.certifiedByAdapter, candidate.certifiedBy.adapterId),
            eq(t.provenanceExternalId, candidate.evidence.provenance.externalId)
          ),
          columns: { sequenceNumber: true },
        });

        if (existingByExternal) {
          return existingByExternal.sequenceNumber;
        }
      }

      const inserted = await tx.insert(fluxcoreSignals)
        .values({
          signalFingerprint,
          factType: candidate.factType,
          sourceNamespace: candidate.source.namespace,
          sourceKey: candidate.source.key,
          subjectNamespace: candidate.subject?.namespace ?? null,
          subjectKey: candidate.subject?.key ?? null,
          objectNamespace: candidate.object?.namespace ?? null,
          objectKey: candidate.object?.key ?? null,
          evidenceRaw: candidate.evidence.raw,
          evidenceFormat: candidate.evidence.format,
          evidenceChecksum: checksum,
          provenanceDriverId: candidate.evidence.provenance.driverId,
          provenanceExternalId: candidate.evidence.provenance.externalId ?? null,
          provenanceEntryPoint: candidate.evidence.provenance.entryPoint ?? null,
          certifiedByAdapter: candidate.certifiedBy.adapterId,
          certifiedAdapterVersion: adapterAllowed.adapterVersion,
          claimedOccurredAt: candidate.evidence.claimedOccurredAt ?? null,
        })
        .onConflictDoNothing()
        .returning({ sequenceNumber: fluxcoreSignals.sequenceNumber });

      if (inserted.length > 0) {
        await tx.insert(fluxcoreOutbox)
          .values({ sequenceNumber: inserted[0].sequenceNumber })
          .onConflictDoNothing();

        return inserted[0].sequenceNumber;
      }

      const existing = await tx.query.fluxcoreSignals.findFirst({
        where: (t, { eq }) => eq(t.signalFingerprint, signalFingerprint),
        columns: { sequenceNumber: true },
      });

      if (!existing) {
        throw new Error('Kernel invariant violation: fingerprint conflict but record not found');
      }

      return existing.sequenceNumber;
    });
  }
}

export const kernel = new Kernel();
```

### Propiedades garantizadas
1. **Contacto causal probado**: cada SystemFact afirma que FluxCore recibió evidencia verificable proveniente de un canal físico (SENSOR/GATEWAY) identificado por `source`.
2. **Identidad física**: `(adapter, external_id)` gobierna idempotencia cuando la fuente provee ID; el fingerprint (adapter + source + checksum) cubre fuentes que no lo hacen.
3. **Orden total global**: `sequence_number` incrementa monotónicamente sin depender de la fuente.
4. **Tiempo de observación confiable**: `observed_at` usa `clock_timestamp()` para capturar el instante físico real en que la transacción tocó el Kernel.
5. **Separación temporal**: `sequence_number` refleja observación del sistema; `claimed_occurred_at` refleja el tiempo reportado por la fuente.
6. **Evidencia preservada**: se almacena `evidence_raw` con checksum obligatorio para reprocesos deterministas.
7. **Inmutabilidad física**: triggers impiden `UPDATE`/`DELETE`; el pasado no puede reescribirse.
8. **Despertar inevitable**: cada observación certificada enciende una entrada en `fluxcore_outbox` dentro de la misma transacción.

---

## 5. Reglas operativas que el código debe cumplir

1. **Prohibido** introducir `accountId`, `conversationId`, `messageId` o cualquier dato de UI en el Journal. Eso pertenece a proyectores.
2. **Reality Adapter obligatorio**: solo adapters registrados (`fluxcore_reality_adapters`) con firma válida pueden invocar el Kernel; drivers/IA/proyectores jamás escriben directo.
3. **Clase física obligatoria**: únicamente adapters de clase `SENSOR` o `GATEWAY` pueden certificar observaciones; los `INTERPRETER` quedan limitados a proyectores derivados y no pueden tocar el Kernel.
4. **Source obligatorio**: todo `KernelCandidateSignal` debe incluir `source` (namespace + key) que describa el origen causal probado, incluso si no hay sujetos identificables.
5. **Fact types físicos**: el Reality Adapter debe mapear toda observación a una de las seis clases físicas soportadas.
6. **Evidencia obligatoria**: ningún fenómeno se certifica sin `raw`, `format`, `provenance`, checksum (JSON canónico) y `signature` emitida con el secret del adapter.
7. **Adapter-version recording**: toda señal persiste la versión del Reality Adapter para permitir replay determinista, pero la versión no participa en la identidad física.
8. **ActorRef mínimo**: cuando exista `subject/object`, solo contienen `namespace` + `key`. Display names, avatares o metadata viven en proyecciones de identidad.
9. **Replay obligatorio**: todo proyector debe reconstruir su estado leyendo `fluxcore_signals` en orden (`sequence_number`) y, cuando la causalidad importe, aplicar reglas basadas en `claimed_occurred_at`.
10. **Adapters sin semántica**: los drivers reportan observaciones, los Reality Adapters interpretan y el Kernel certifica. Ningún código de aplicación o IA puede saltarse esta frontera.
11. **Cursor atómico**: cada proyector debe persistir sus writes y actualizar su cursor en `fluxcore_projector_cursors` dentro de la MISMA transacción para garantizar exactly-once.

---

## 6. Invariantes formales del Kernel

1. **Inmutabilidad**: ningún hecho certificado puede modificarse ni eliminarse (garantizado por triggers).
2. **Certificación única**: una observación física certificada por un Reality Adapter genera un único `sequence_number`. Si existe `provenance_external_id`, la identidad primaria es `(adapter, external_id)`; si no, el fingerprint (adapter + source + checksum) garantiza unicidad.
3. **Despertar inevitable**: toda observación insertada produce exactamente una entrada en `fluxcore_outbox` (constraint `ux_outbox_sequence`) dentro de la misma transacción y cada proyector mantiene su cursor en `fluxcore_projector_cursors`.
4. **Separación temporal**: `sequence_number` ordena observaciones; los proyectores deben aplicar tolerancia al desorden temporal usando `claimed_occurred_at` cuando la causalidad sea relevante.
5. **Observación ≠ interpretación**: el Journal solo contiene evidencia de contacto con la realidad; cualquier deducción (intenciones, resúmenes, inferencias de IA) se materializa en proyectores.
6. **Source irreductible**: cada SystemFact persiste su `source` para que futuras interpretaciones puedan reconstruir causalidad incluso si nunca se identificó un actor.

---

## 7. Estado de Implementación (Canon v7.0)

**ESTADO ACTUAL: IMPLEMENTADO & ACTIVO (2026-02-14)**

1. **Reality Adapter**: ✅ `fluxcore/whatsapp-gateway` implementado en `reality-adapter.service.ts`.
2. **BaseProjector**: ✅ Implementado en `kernel/base.projector.ts`.
3. **Migraciones**: ✅ Ejecutada migración `036_rfc0001_kernel_foundation.sql`.
4. **Wiring**: ✅ Webhooks conectados al Kernel.

El Kernel está congelado. Cualquier cambio futuro debe ser aditivo (nuevos adapters, proyectores) y NO modificar `fluxcore_signals`.

Para detalles de operación, ver `docs/fluxcore/KERNEL_STATUS.md`.
