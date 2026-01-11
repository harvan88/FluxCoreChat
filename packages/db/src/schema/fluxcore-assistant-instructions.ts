/**
 * FluxCore: Assistant Instructions Schema
 * 
 * Relación muchos a muchos: Asistentes <-> Instrucciones
 * Permite componer un asistente con múltiples instrucciones ordenadas.
 */

import { pgTable, uuid, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { fluxcoreAssistants } from './fluxcore-assistants';
import { fluxcoreInstructions } from './fluxcore-instructions';

export const fluxcoreAssistantInstructions = pgTable('fluxcore_assistant_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assistantId: uuid('assistant_id')
    .notNull()
    .references(() => fluxcoreAssistants.id, { onDelete: 'cascade' }),
  instructionId: uuid('instruction_id')
    .notNull()
    .references(() => fluxcoreInstructions.id, { onDelete: 'cascade' }),
  
  // Configuración de la referencia
  versionId: varchar('version_id', { length: 100 }), // Si null, usa la última versión (HEAD)
  order: integer('order').default(0).notNull(),      // Para concatenar en orden específico
  isEnabled: boolean('is_enabled').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type FluxcoreAssistantInstruction = typeof fluxcoreAssistantInstructions.$inferSelect;
export type NewFluxcoreAssistantInstruction = typeof fluxcoreAssistantInstructions.$inferInsert;
