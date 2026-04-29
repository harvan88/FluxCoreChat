import { FluxCoreCapability } from './index';
import { db, accounts, templates } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { coreEventBus } from '../events';

/**
 * PLATFORM_UPDATE_ACCOUNT_INSTRUCTIONS
 * Permite actualizar el privateContext (Instrucciones) de una cuenta.
 */
export const PLATFORM_UPDATE_ACCOUNT_INSTRUCTIONS: FluxCoreCapability = {
    id: 'platform.update_account_instructions',
    slug: 'platform_update_instructions',
    version: '1.0.0',
    domain: 'fluxcore',
    kind: 'command',
    translationStrategy: 'tool',
    name: 'platform_update_instructions',
    description: 'Actualiza las instrucciones (private_context) de una cuenta específica. Úsala para aplicar mejoras detectadas en el sistema de instrucciones de un cliente.',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'platform_update_instructions',
            description: 'Actualiza las instrucciones estratégicas de una cuenta.',
            parameters: {
                type: 'object',
                properties: {
                    targetAccountId: { type: 'string', description: 'UUID de la cuenta a actualizar.' },
                    instructions: { type: 'string', description: 'Nuevo texto completo de las instrucciones.' },
                },
                required: ['targetAccountId', 'instructions'],
                additionalProperties: false,
            },
        },
    },
    execute: async (_context, args: any) => {
        const { targetAccountId, instructions } = args;
        const [updated] = await db
            .update(accounts)
            .set({ 
                privateContext: instructions,
                updatedAt: new Date()
            })
            .where(eq(accounts.id, targetAccountId))
            .returning();

        if (!updated) throw new Error(`Account ${targetAccountId} not found`);

        coreEventBus.emit('account.profile.updated', { accountId: targetAccountId });
        return { success: true, accountId: targetAccountId };
    }
};

/**
 * PLATFORM_MANAGE_TEMPLATE
 * Crea o actualiza una plantilla física en el Core.
 */
export const PLATFORM_MANAGE_TEMPLATE: FluxCoreCapability = {
    id: 'platform.manage_template',
    slug: 'platform_manage_template',
    version: '1.0.0',
    domain: 'fluxcore',
    kind: 'command',
    translationStrategy: 'tool',
    name: 'platform_manage_template',
    description: 'Crea o actualiza una plantilla de mensaje. Úsala para dotar a una cuenta de respuestas estandarizadas.',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'platform_manage_template',
            description: 'Crea o actualiza una plantilla física.',
            parameters: {
                type: 'object',
                properties: {
                    targetAccountId: { type: 'string', description: 'UUID de la cuenta dueña de la plantilla.' },
                    name: { type: 'string', description: 'Nombre único de la plantilla (ej: SOPORTE_BIENVENIDA).' },
                    content: { type: 'string', description: 'Contenido de la plantilla con {{variables}}.' },
                    category: { type: 'string', description: 'Categoría (support, marketing, sales).' },
                    allowAutomatedUse: { type: 'boolean', description: 'Si la IA puede proponerla automáticamente.' },
                },
                required: ['targetAccountId', 'name', 'content'],
                additionalProperties: false,
            },
        },
    },
    execute: async (_context, args: any) => {
        const { targetAccountId, name, content, category, allowAutomatedUse } = args;
        
        const [result] = await db.insert(templates).values({
            accountId: targetAccountId,
            name,
            content,
            category: category || 'general',
            isActive: true,
            allowAutomatedUse: allowAutomatedUse ?? true,
        }).onConflictDoUpdate({
            target: [templates.accountId, templates.name],
            set: { content, category: category || 'general', allowAutomatedUse: allowAutomatedUse ?? true, updatedAt: new Date() }
        }).returning();

        coreEventBus.emit('template.authorization.changed', { 
            templateId: result.id, 
            accountId: targetAccountId,
            allowAutomatedUse: result.allowAutomatedUse 
        });

        return { success: true, templateId: result.id, name: result.name };
    }
};

/**
 * PLATFORM_AUTHORIZE_AI_TEMPLATE
 * El paso de soberanía: Habilitar una plantilla existente para el uso del motor de IA.
 */
export const PLATFORM_AUTHORIZE_AI_TEMPLATE: FluxCoreCapability = {
    id: 'platform.authorize_ai_template',
    slug: 'platform_authorize_ai_template',
    version: '1.0.0',
    domain: 'fluxcore',
    kind: 'command',
    translationStrategy: 'tool',
    name: 'platform_authorize_ai_template',
    description: 'Autoriza formalmente una plantilla para que el motor de IA pueda verla y usarla.',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'platform_authorize_ai_template',
            description: 'Establece los permisos de IA para una plantilla.',
            parameters: {
                type: 'object',
                properties: {
                    templateId: { type: 'string', description: 'UUID de la plantilla (obtenido de platform_manage_template o list_templates).' },
                    authorize: { type: 'boolean', description: 'Habilitar o deshabilitar para IA.' },
                    instructions: { type: 'string', description: 'Instrucciones específicas para la IA sobre cuándo usar esta plantilla.' },
                },
                required: ['templateId', 'authorize'],
                additionalProperties: false,
            },
        },
    },
    execute: async (_context, args: any) => {
        const { templateId, authorize, instructions } = args;
        const { fluxCoreTemplateSettingsService } = await import('../../services/fluxcore/template-settings.service');
        
        const results = await fluxCoreTemplateSettingsService.updateSettings(
            templateId, 
            authorize, 
            instructions || ''
        );

        return { success: true, templateId, authorized: authorize };
    }
};
