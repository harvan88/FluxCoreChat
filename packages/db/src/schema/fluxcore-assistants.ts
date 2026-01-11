/**
 * FluxCore: Assistants Schema
 * 
 * Asistentes IA configurables por cuenta.
 * Cada asistente puede tener instrucciones, vector stores y herramientas asignadas.
 */

import { pgTable, uuid, varchar, timestamp, text, jsonb, integer } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * Configuración del modelo IA
 */
export interface AssistantModelConfig {
  provider: string;           // 'openai', 'anthropic', etc.
  model: string;              // 'gpt-4o', 'claude-3', etc.
  temperature: number;        // 0.0 - 2.0
  topP: number;               // 0.0 - 1.0
  responseFormat: 'text' | 'json';
}

/**
 * Configuración de tiempo de respuesta
 */
export interface AssistantTimingConfig {
  responseDelaySeconds: number;
  smartDelay: boolean;
}

export const fluxcoreAssistants = pgTable('fluxcore_assistants', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  externalId: varchar('external_id', { length: 255 }), // ID de OpenAI/Anthropic si aplica
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'production', 'disabled'
  
  // NOTA: Las instrucciones y vector stores ahora están en tablas de relación N:M
  // fluxcore_assistant_instructions y fluxcore_assistant_vector_stores
  
  // Configuración del proveedor IA
  modelConfig: jsonb('model_config').$type<AssistantModelConfig>().default({
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 1.0,
    responseFormat: 'text',
  }).notNull(),
  
  // Configuración de timing
  timingConfig: jsonb('timing_config').$type<AssistantTimingConfig>().default({
    responseDelaySeconds: 2,
    smartDelay: true,
  }).notNull(),
  
  // Metadata
  sizeBytes: integer('size_bytes').default(0),
  tokensUsed: integer('tokens_used').default(0),
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreAssistant = typeof fluxcoreAssistants.$inferSelect;
export type NewFluxcoreAssistant = typeof fluxcoreAssistants.$inferInsert;
