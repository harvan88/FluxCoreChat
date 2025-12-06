import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const relationships = pgTable('relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountAId: uuid('account_a_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  accountBId: uuid('account_b_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Perspectivas bilaterales (sin contexto)
  perspectiveA: jsonb('perspective_a')
    .default({ saved_name: null, tags: [], status: 'active' })
    .notNull(),
  perspectiveB: jsonb('perspective_b')
    .default({ saved_name: null, tags: [], status: 'active' })
    .notNull(),
  
  // Contexto UNIFICADO con autoría
  context: jsonb('context')
    .default({ entries: [], total_chars: 0 })
    .notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastInteraction: timestamp('last_interaction'),
});

export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

// Tipos para el contexto estructurado
export interface ContextEntry {
  author_account_id: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
  created_at: string;
}

export interface RelationshipContext {
  entries: ContextEntry[];
  total_chars: number;
}

export interface RelationshipPerspective {
  saved_name: string | null;
  tags: string[];
  status: 'active' | 'blocked' | 'archived';
}
