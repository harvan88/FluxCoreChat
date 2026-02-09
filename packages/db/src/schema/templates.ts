import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, jsonb, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Templates Schema
 *
 * Plantillas de mensajes scope accountId.
 */
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),

  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),

  variables: jsonb('variables')
    .$type<TemplateVariable[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  tags: jsonb('tags')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  isActive: boolean('is_active').notNull().default(true),

  usageCount: integer('usage_count').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  accountIdx: index('idx_templates_account').on(table.accountId),
  accountNameIdx: index('idx_templates_account_name').on(table.accountId, table.name),
}));

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'contact' | 'custom';
  label?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}
