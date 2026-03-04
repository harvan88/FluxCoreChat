import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Actor Address Links - Vinculación entre actores y direcciones
 * 
 * Conecta actores internos con direcciones externas.
 */
export const fluxcoreActorAddressLinks = pgTable('fluxcore_actor_address_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull(),
  addressId: uuid('address_id').notNull(),
  linkType: text('link_type', { enum: ['primary', 'secondary', 'temporary'] }).notNull().default('primary'),
  metadata: text('metadata'), // JSON de metadatos del vínculo
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type FluxCoreActorAddressLinks = typeof fluxcoreActorAddressLinks.$inferSelect;
export type NewFluxCoreActorAddressLinks = typeof fluxcoreActorAddressLinks.$inferInsert;
