import { 
  pgTable, 
  text, 
  timestamp,
  uuid,
  index
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Semantic Contexts - Contextos semánticos
 * 
 * Almacena contexto semántico para procesamiento cognitivo.
 */
export const fluxcoreSemanticContexts = pgTable('fluxcore_semantic_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  contextId: uuid('context_id').notNull().unique(),
  conversationId: uuid('conversation_id').notNull(),
  accountId: uuid('account_id').notNull(),
  contextType: text('context_type', { enum: ['conversation', 'user_intent', 'domain_knowledge', 'session_state'] }).notNull(),
  contextData: text('context_data').notNull(), // JSON del contexto
  confidence: text('confidence', { enum: ['high', 'medium', 'low'] }).notNull(),
  extractedAt: timestamp('extracted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: text('is_active', { enum: ['true', 'false'] }).notNull().default('true'),
  sourceSignal: uuid('source_signal'), // Signal que generó este contexto
}, (table) => ({
  // Índices para consultas eficientes
  conversationIdx: index('idx_semantic_conversation').on(table.conversationId, table.isActive),
  accountIdx: index('idx_semantic_account').on(table.accountId, table.contextType),
  typeIdx: index('idx_semantic_type').on(table.contextType, table.expiresAt)
}));

export type FluxCoreSemanticContexts = typeof fluxcoreSemanticContexts.$inferSelect;
export type NewFluxCoreSemanticContexts = typeof fluxcoreSemanticContexts.$inferInsert;
