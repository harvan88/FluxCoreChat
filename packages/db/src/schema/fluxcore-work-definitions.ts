import { 
  pgTable, 
  text, 
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

/**
 * FluxCore Work Definitions - Definiciones de trabajo
 * 
 * Define tipos de trabajo que pueden ejecutar los agentes.
 */
export const fluxcoreWorkDefinitions = pgTable('fluxcore_work_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workType: text('work_type').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description').notNull(),
  category: text('category', { enum: ['communication', 'analysis', 'automation', 'escalation'] }).notNull(),
  inputSchema: text('input_schema'), // JSON schema de entrada
  outputSchema: text('output_schema'), // JSON schema de salida
  executionTemplate: text('execution_template'), // Plantilla de ejecución
  requirements: text('requirements'), // JSON de requisitos
  isActive: text('is_active', { enum: ['true', 'false'] }).notNull().default('true'),
  version: text('version').notNull().default('1.0.0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type FluxCoreWorkDefinitions = typeof fluxcoreWorkDefinitions.$inferSelect;
export type NewFluxCoreWorkDefinitions = typeof fluxcoreWorkDefinitions.$inferInsert;
