import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Work Events - Eventos de trabajo
 * 
 * Registra eventos del ciclo de vida de trabajos.
 */
export const fluxcoreWorkEvents = pgTable('fluxcore_work_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workId: uuid('work_id').notNull(),
  eventType: text('event_type', { enum: ['created', 'started', 'progress', 'completed', 'failed', 'cancelled'] }).notNull(),
  eventData: text('event_data').notNull(), // JSON del evento
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  source: text('source', { enum: ['agent', 'system', 'user'] }).notNull(),
  metadata: text('metadata'), // JSON de metadatos adicionales
}, (table) => ({
  // Índice por trabajo y tipo
  workTypeIdx: index('idx_work_events_work_type').on(table.workId, table.eventType),
  // Índice por timestamp
  timestampIdx: index('idx_work_events_timestamp').on(table.timestamp)
}));

export type FluxCoreWorkEvents = typeof fluxcoreWorkEvents.$inferSelect;
export type NewFluxCoreWorkEvents = typeof fluxcoreWorkEvents.$inferInsert;
