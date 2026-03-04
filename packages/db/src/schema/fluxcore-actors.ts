import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Actors - Entidades del sistema
 * 
 * Representa actores dentro del sistema FluxCore.
 */
export const fluxcoreActors = pgTable('fluxcore_actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: text('actor_type', { enum: ['user', 'account', 'system', 'ai', 'api'] }).notNull(),
  displayName: text('display_name').notNull(),
  metadata: text('metadata'), // JSON de metadatos adicionales
  isActive: text('is_active', { enum: ['true', 'false'] }).notNull().default('true'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Índice por tipo
  typeIdx: index('idx_actors_type').on(table.actorType)
}));

export type FluxCoreActors = typeof fluxcoreActors.$inferSelect;
export type NewFluxCoreActors = typeof fluxcoreActors.$inferInsert;
