import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accounts } from './accounts';

/**
 * Actor - Entidad ontológica que puede actuar en el sistema
 * Soporta: accounts, visitors, builtin_ai, extensions
 */
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Relaciones opcionales con entidades existentes
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }), // 'owner' | 'admin' | 'member' (legacy)
  
  // Campos ontológicos
  actorType: varchar('actor_type', { length: 20 }).notNull(), // 'account' | 'visitor' | 'builtin_ai' | 'extension'
  extensionId: varchar('extension_id', { length: 100 }), // ID de extensión si actorType='extension'
  displayName: varchar('display_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Campos para visitantes y migración
  externalKey: text('external_key'), // visitor_token u otro identificador externo
  tenantId: uuid('tenant_id').references(() => accounts.id), // tenant dueño del widget
  linkedAccountId: uuid('linked_account_id').references(() => accounts.id), // cuenta real vinculada
  linkedAt: timestamp('linked_at'), // cuándo se vinculó la cuenta
  migratedFrom: uuid('migrated_from'), // referencia temporal a fluxcore_actors.id
});

export type Actor = typeof actors.$inferSelect;
export type NewActor = typeof actors.$inferInsert;
