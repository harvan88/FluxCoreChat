import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Work Slots - Slots de trabajo
 * 
 * Define slots disponibles para ejecución de trabajos.
 */
export const fluxcoreWorkSlots = pgTable('fluxcore_work_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  slotId: uuid('slot_id').notNull().unique(),
  slotType: text('slot_type', { enum: ['cognitive', 'automation', 'monitoring'] }).notNull(),
  capacity: text('capacity', { enum: ['single', 'parallel', 'queue'] }).notNull().default('single'),
  maxConcurrency: text('max_concurrency').notNull().default('1'),
  currentLoad: text('current_load').notNull().default('0'),
  status: text('status', { enum: ['available', 'busy', 'offline', 'maintenance'] }).notNull().default('available'),
  assignedAgentId: uuid('assigned_agent_id'),
  lastHeartbeat: timestamp('last_heartbeat'),
  metadata: text('metadata'), // JSON de metadatos del slot
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Índice por tipo y estado
  typeStatusIdx: index('idx_work_slots_type_status').on(table.slotType, table.status),
  // Índice por agente asignado
  agentIdx: index('idx_work_slots_agent').on(table.assignedAgentId)
}));

export type FluxCoreWorkSlots = typeof fluxcoreWorkSlots.$inferSelect;
export type NewFluxCoreWorkSlots = typeof fluxcoreWorkSlots.$inferInsert;
