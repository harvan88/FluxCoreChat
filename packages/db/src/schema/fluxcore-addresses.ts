import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  uniqueIndex
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Addresses - Identidades externas
 * 
 * Mapea identidades externas a actores del sistema.
 */
export const fluxcoreAddresses = pgTable('fluxcore_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: text('driver_id').notNull(),
  externalId: text('external_id').notNull(),
  addressType: text('address_type', { enum: ['user', 'account', 'system', 'api'] }).notNull(),
  metadata: text('metadata'), // JSON de metadatos adicionales
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Índice único para driver + external
  uniqueIdx: uniqueIndex('idx_addresses_unique').on(table.driverId, table.externalId)
}));

export type FluxCoreAddresses = typeof fluxcoreAddresses.$inferSelect;
export type NewFluxCoreAddresses = typeof fluxcoreAddresses.$inferInsert;
