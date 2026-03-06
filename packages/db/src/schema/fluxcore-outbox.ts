import {
  bigint,
  bigserial,
  pgTable,
  text,
  timestamp,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Outbox - Garantiza entrega de eventos del Kernel
 * 
 * Esta tabla asegura que cada evento del Kernel sea entregado
 * a sus suscriptores incluso si el proceso falla.
 */
export const fluxcoreOutbox = pgTable('fluxcore_outbox', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  signalId: bigint('signal_id', { mode: 'number' }).notNull(),
  eventType: text('event_type').notNull(),
  payload: text('payload').notNull(), // JSON string
  status: text('status', { enum: ['pending', 'processing', 'sent'] }).notNull().default('pending'),
  attempts: bigint('attempts', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
  lastError: text('last_error')
}, (table) => ({
  // Índice para procesamiento eficiente de pendientes
  pendingIdx: index('idx_fluxcore_outbox_pending').on(table.status, table.createdAt)
}));

export type FluxCoreOutbox = typeof fluxcoreOutbox.$inferSelect;
export type NewFluxCoreOutbox = typeof fluxcoreOutbox.$inferInsert;
