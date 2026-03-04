import { pgTable, text, timestamp, bigserial, bigint, integer, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * FluxCore Kernel Journal — RFC-0001 (RATIFIED)
 *
 * These tables define the ONLY source of truth for the entire system.
 * The Kernel certifies observations; it does NOT model business.
 *
 * PROHIBITED in this file:
 *   accountId, conversationId, messageId, userId,
 *   or any application-level semantic column.
 */

// ─────────────────────────────────────────────
// 1. Reality Adapters — Registered Certifiers
// ─────────────────────────────────────────────

export const fluxcoreRealityAdapters = pgTable('fluxcore_reality_adapters', {
    adapterId: text('adapter_id').primaryKey(),
    driverId: text('driver_id').notNull(),
    adapterClass: text('adapter_class').notNull(), // CHECK enforced via SQL migration
    description: text('description').notNull(),
    signingSecret: text('signing_secret').notNull(),
    adapterVersion: text('adapter_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 2. Signals — The Immutable Journal
// ─────────────────────────────────────────────

export const fluxcoreSignals = pgTable('fluxcore_signals', {
    sequenceNumber: bigserial('sequence_number', { mode: 'number' }).primaryKey(),

    signalFingerprint: text('signal_fingerprint').notNull().unique(),

    factType: text('fact_type').notNull(), // CHECK enforced via SQL migration

    // Source: causal origin of the observation (always required)
    sourceNamespace: text('source_namespace').notNull(),
    sourceKey: text('source_key').notNull(),

    // Subject: optional actor reference
    subjectNamespace: text('subject_namespace'),
    subjectKey: text('subject_key'),

    // Object: optional target/resource reference
    objectNamespace: text('object_namespace'),
    objectKey: text('object_key'),

    // Evidence: the raw physical observation (REQUIRED, never interpreted)
    evidenceRaw: jsonb('evidence_raw').notNull(),
    evidenceFormat: text('evidence_format').notNull(),
    evidenceChecksum: text('evidence_checksum').notNull(),

    // Provenance: where did this observation come from
    provenanceDriverId: text('provenance_driver_id').notNull(),
    provenanceExternalId: text('provenance_external_id'),
    provenanceEntryPoint: text('provenance_entry_point'),

    // Certification: which adapter certified this fact
    certifiedByAdapter: text('certified_by_adapter').notNull().references(
        () => fluxcoreRealityAdapters.adapterId
    ),
    certifiedAdapterVersion: text('certified_adapter_version').notNull(),

    // Temporal
    claimedOccurredAt: timestamp('claimed_occurred_at', { withTimezone: true }),
    // observed_at uses clock_timestamp() — set via SQL migration DEFAULT, not ORM
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
}, (table) => ({
    sourceIdx: index('idx_fluxcore_source').on(table.sourceNamespace, table.sourceKey, table.sequenceNumber),
    subjectIdx: index('idx_fluxcore_subject').on(table.subjectNamespace, table.subjectKey, table.sequenceNumber),
    sequenceIdx: index('idx_fluxcore_sequence').on(table.sequenceNumber),
    claimedOccurredIdx: index('idx_fluxcore_claimed_occurred').on(table.claimedOccurredAt),
    adapterExternalUnq: unique('ux_fluxcore_adapter_external').on(table.certifiedByAdapter, table.provenanceExternalId),
}));

// ─────────────────────────────────────────────
// 3. Projector Cursors — Deterministic Progress
// ─────────────────────────────────────────────

export const fluxcoreProjectorCursors = pgTable('fluxcore_projector_cursors', {
    projectorName: text('projector_name').primaryKey(),
    lastSequenceNumber: bigint('last_sequence_number', { mode: 'number' }).notNull(),
});

// ─────────────────────────────────────────────
// 5. Projector Errors — Canonical Error Log
// ─────────────────────────────────────────────

export const fluxcoreProjectorErrors = pgTable('fluxcore_projector_errors', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    projectorName: text('projector_name').notNull(),
    signalSeq: bigint('signal_seq', { mode: 'number' }).notNull().references(
        () => fluxcoreSignals.sequenceNumber
    ),
    errorMessage: text('error_message').notNull(),
    errorStack: text('error_stack'),
    attempts: integer('attempts').notNull().default(1),
    firstFailedAt: timestamp('first_failed_at', { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
    lastFailedAt: timestamp('last_failed_at', { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (table) => ({
    projectorSignalUnq: unique('ux_projector_signal').on(table.projectorName, table.signalSeq),
    unresolvedIdx: index('idx_projector_errors_unresolved').on(table.resolvedAt),
}));

// ─────────────────────────────────────────────
// 6. Fact Types — Reference Table
// ─────────────────────────────────────────────

export const fluxcoreFactTypes = pgTable('fluxcore_fact_types', {
    factType: text('fact_type').primaryKey(),
    description: text('description').notNull(),
});

// ─────────────────────────────────────────────
// Inferred Types
// ─────────────────────────────────────────────

export type FluxcoreRealityAdapter = typeof fluxcoreRealityAdapters.$inferSelect;
export type NewFluxcoreRealityAdapter = typeof fluxcoreRealityAdapters.$inferInsert;

export type FluxcoreSignal = typeof fluxcoreSignals.$inferSelect;
export type NewFluxcoreSignal = typeof fluxcoreSignals.$inferInsert;

export type FluxcoreProjectorCursor = typeof fluxcoreProjectorCursors.$inferSelect;
export type NewFluxcoreProjectorCursor = typeof fluxcoreProjectorCursors.$inferInsert;

export type FluxcoreFactType = typeof fluxcoreFactTypes.$inferSelect;

export type FluxcoreProjectorError = typeof fluxcoreProjectorErrors.$inferSelect;
export type NewFluxcoreProjectorError = typeof fluxcoreProjectorErrors.$inferInsert;
