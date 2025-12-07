import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // 'personal' | 'business'
  
  // COR-005: Alias para identificación contextual en relaciones
  // Permite que una cuenta tenga un nombre diferente según la relación
  // Ej: "Mi Negocio" puede ser "Proveedor Juan" en una relación específica
  alias: varchar('alias', { length: 100 }),
  
  profile: jsonb('profile').default({}).notNull(),
  privateContext: text('private_context'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
