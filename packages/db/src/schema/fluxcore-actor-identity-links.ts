import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Actor Identity Links - Vinculación entre actores e identidades
 * 
 * Conecta actores con identidades del sistema (users, accounts).
 */
export const fluxcoreActorIdentityLinks = pgTable('fluxcore_actor_identity_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull(),
  identityType: text('identity_type', { enum: ['user', 'account'] }).notNull(),
  identityId: uuid('identity_id').notNull(),
  linkType: text('link_type', { enum: ['primary', 'secondary', 'temporary'] }).notNull().default('primary'),
  metadata: text('metadata'), // JSON de metadatos del vínculo
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type FluxCoreActorIdentityLinks = typeof fluxcoreActorIdentityLinks.$inferSelect;
export type NewFluxCoreActorIdentityLinks = typeof fluxcoreActorIdentityLinks.$inferInsert;
