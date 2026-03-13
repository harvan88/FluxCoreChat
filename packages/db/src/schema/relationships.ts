import { pgTable, uuid, timestamp, jsonb, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { actors } from './actors';

export const relationships = pgTable('relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorAId: uuid('actor_a_id')
    .notNull()
    .references(() => actors.id),
  actorBId: uuid('actor_b_id')
    .notNull()
    .references(() => actors.id),

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
}, (table) => ({
  noSelfRelationship: check('no_self_relationship', sql`${table.actorAId} <> ${table.actorBId}`),
  actorsIdx: index('idx_relationships_actors').on(table.actorAId, table.actorBId),
}));

export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

// Tipos para el contexto estructurado
export interface ContextEntry {
  author_account_id: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
  allow_automated_use: boolean;
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
