import { pgTable, uuid, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { templates } from './templates';

/**
 * FluxCore Template Settings Schema
 *
 * Configuración extendida para plantillas, gestionada por FluxCore.
 * Separa la lógica de IA del núcleo de plantillas.
 */
export const fluxcoreTemplateSettings = pgTable('fluxcore_template_settings', {
    templateId: uuid('template_id')
        .primaryKey()
        .references(() => templates.id, { onDelete: 'cascade' }),

    authorizeForAI: boolean('authorize_for_ai').notNull().default(false),

    // Instrucciones específicas para que la IA sepa cuándo y cómo usar esta plantilla
    aiUsageInstructions: text('ai_usage_instructions'),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type FluxCoreTemplateSettings = typeof fluxcoreTemplateSettings.$inferSelect;
export type NewFluxCoreTemplateSettings = typeof fluxcoreTemplateSettings.$inferInsert;
