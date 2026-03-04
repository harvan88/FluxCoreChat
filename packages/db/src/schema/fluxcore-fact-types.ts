import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Fact Types - Catálogo de tipos de hechos
 * 
 * Define los tipos de hechos que el Kernel puede certificar.
 */
export const fluxcoreFactTypes = pgTable('fluxcore_fact_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  factType: text('fact_type').notNull().unique(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  schema: text('schema'), // JSON schema del fact type
  isActive: text('is_active', { enum: ['true', 'false'] }).notNull().default('true'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type FluxCoreFactTypes = typeof fluxcoreFactTypes.$inferSelect;
export type NewFluxCoreFactTypes = typeof fluxcoreFactTypes.$inferInsert;
