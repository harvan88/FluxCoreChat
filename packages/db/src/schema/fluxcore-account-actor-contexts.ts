import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Account Actor Contexts - Contexto de actores por cuenta
 * 
 * Define el contexto de ejecución para actores dentro de cuentas.
 */
export const fluxcoreAccountActorContexts = pgTable('fluxcore_account_actor_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(),
  actorId: uuid('actor_id').notNull(),
  contextType: text('context_type', { enum: ['default', 'temporary', 'elevated'] }).notNull().default('default'),
  permissions: text('permissions'), // JSON de permisos
  metadata: text('metadata'), // JSON de metadatos del contexto
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Índice por cuenta y actor
  accountActorIdx: index('idx_account_actor_context').on(table.accountId, table.actorId)
}));

export type FluxCoreAccountActorContexts = typeof fluxcoreAccountActorContexts.$inferSelect;
export type NewFluxCoreAccountActorContexts = typeof fluxcoreAccountActorContexts.$inferInsert;
