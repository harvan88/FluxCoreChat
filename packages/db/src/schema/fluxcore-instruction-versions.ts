/**
 * FluxCore: Instruction Versions Schema
 * 
 * Historial de versiones del contenido de una instrucción.
 * Permite rollback y fijar versiones específicas en asistentes.
 */

import { pgTable, uuid, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { fluxcoreInstructions } from './fluxcore-instructions';

export const fluxcoreInstructionVersions = pgTable('fluxcore_instruction_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  instructionId: uuid('instruction_id')
    .notNull()
    .references(() => fluxcoreInstructions.id, { onDelete: 'cascade' }),
  
  // Identificación de versión
  versionNumber: integer('version_number').notNull(), // 1, 2, 3...
  
  // Contenido
  content: text('content').notNull(), // El prompt/instrucciones
  
  // Metadata de la versión
  sizeBytes: integer('size_bytes').default(0),
  tokensEstimated: integer('tokens_estimated').default(0),
  wordCount: integer('word_count').default(0),
  lineCount: integer('line_count').default(0),
  changeLog: text('change_log'), // Descripción de cambios
  
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type FluxcoreInstructionVersion = typeof fluxcoreInstructionVersions.$inferSelect;
export type NewFluxcoreInstructionVersion = typeof fluxcoreInstructionVersions.$inferInsert;
