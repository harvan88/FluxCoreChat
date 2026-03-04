import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Reality Adapters - Conectores de realidad externa
 * 
 * Define cómo el Kernel observa y certifica realidad externa.
 */
export const fluxcoreRealityAdapters = pgTable('fluxcore_reality_adapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  adapterId: text('adapter_id').notNull().unique(),
  adapterName: text('adapter_name').notNull(),
  driverId: text('driver_id').notNull(),
  version: text('version').notNull(),
  status: text('status', { enum: ['active', 'inactive', 'error'] }).notNull().default('active'),
  config: text('config'), // JSON de configuración
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type FluxCoreRealityAdapters = typeof fluxcoreRealityAdapters.$inferSelect;
export type NewFluxCoreRealityAdapters = typeof fluxcoreRealityAdapters.$inferInsert;
