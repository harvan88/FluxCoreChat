import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Tabla de administradores del sistema.
 * Controla acceso a operaciones sensibles (ej. créditos globales).
 */
export const systemAdmins = pgTable('system_admins', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  scopes: jsonb('scopes')
    .$type<SystemAdminScopes>()
    .default({ credits: true })
    .notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface SystemAdminScopes {
  credits?: boolean;
  policies?: boolean;
  [key: string]: boolean | undefined;
}

export type SystemAdmin = typeof systemAdmins.$inferSelect;
