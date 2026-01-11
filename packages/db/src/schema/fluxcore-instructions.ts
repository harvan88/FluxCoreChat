/**
 * FluxCore: Instructions Schema
 * 
 * Instrucciones del sistema (system prompts) configurables.
 * Cada instrucción puede ser asignada a uno o más asistentes.
 */

import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const fluxcoreInstructions = pgTable('fluxcore_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  
  // Identificación
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'private', 'shared', 'public', 'marketplace'
  
  // Versionado
  currentVersionId: uuid('current_version_id'), // FK a fluxcore_instruction_versions (circular ref, handle with care)
  
  // Estado
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'production', 'disabled'
  
  // Metadata
  lastModifiedBy: varchar('last_modified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreInstruction = typeof fluxcoreInstructions.$inferSelect;
export type NewFluxcoreInstruction = typeof fluxcoreInstructions.$inferInsert;
