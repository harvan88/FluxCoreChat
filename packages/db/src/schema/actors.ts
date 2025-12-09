import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { accounts } from './accounts';

/**
 * Actor - Relación usuario-cuenta con rol
 * COR-004: Soporte para actores de extensiones y builtin AI
 */
export const actors = pgTable('actors', {
  id: uuid('id').primaryKey().defaultRandom(),
  // COR-004: Campos opcionales para soportar actores de extensiones
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }), // 'owner' | 'admin' | 'member' (opcional)
  // COR-004: Nuevos campos para actor model (migration-008)
  actorType: varchar('actor_type', { length: 20 }).notNull(), // 'account' | 'builtin_ai' | 'extension'
  extensionId: varchar('extension_id', { length: 100 }), // ID de extensión si actorType='extension'
  displayName: varchar('display_name', { length: 100 }), // Nombre para mostrar
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Actor = typeof actors.$inferSelect;
export type NewActor = typeof actors.$inferInsert;
