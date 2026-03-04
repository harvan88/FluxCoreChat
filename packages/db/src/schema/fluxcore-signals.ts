import { 
  bigserial, 
  pgTable, 
  text, 
  timestamp, 
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Signals - Eventos certificados por el Kernel
 * 
 * Registro inmutable de toda realidad declarada al Kernel.
 */
export const fluxcoreSignals = pgTable('fluxcore_signals', {
  sequenceNumber: bigserial('sequence_number', { mode: 'number' }).primaryKey(),
  signalId: uuid('signal_id').notNull().unique(),
  factType: text('fact_type').notNull(),
  subjectNamespace: text('subject_namespace').notNull(),
  subjectKey: text('subject_key').notNull(),
  provenanceDriverId: text('provenance_driver_id').notNull(),
  provenanceAdapterId: text('provenance_adapter_id').notNull(),
  evidenceRaw: text('evidence_raw').notNull(), // JSON string
  claimedOccurredAt: timestamp('claimed_occurred_at').notNull(),
  observedAt: timestamp('observed_at').notNull().defaultNow(),
  certifiedAt: timestamp('certified_at').notNull().defaultNow(),
  status: text('status', { enum: ['certified', 'processing', 'error'] }).notNull().default('certified'),
}, (table) => ({
  // Índices para consultas eficientes
  subjectIdx: index('idx_fluxcore_signals_subject').on(table.subjectNamespace, table.subjectKey),
  factTypeIdx: index('idx_fluxcore_signals_fact_type').on(table.factType),
  occurredAtIdx: index('idx_fluxcore_signals_occurred_at').on(table.claimedOccurredAt),
}));

export type FluxCoreSignals = typeof fluxcoreSignals.$inferSelect;
export type NewFluxCoreSignals = typeof fluxcoreSignals.$inferInsert;
