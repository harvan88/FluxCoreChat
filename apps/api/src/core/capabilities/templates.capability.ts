import { FluxCoreCapability } from './index';
import { aiTemplateService } from '../../services/ai-template.service';

export const SYSTEM_SEND_TEMPLATE: FluxCoreCapability = {
    name: 'send_template',
    description: 'Envia una plantilla de mensaje preautorizada. Úsala SOLO si la intención del usuario coincide con una plantilla disponible.',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'send_template',
            description: 'Envia una plantilla de mensaje preautorizada. Úsala SOLO si la intención del usuario coincide con una plantilla disponible. Requiere template_id y, si aplica, variables para reemplazo.',
            parameters: {
                type: 'object',
                properties: {
                    template_id: {
                        type: 'string',
                        description: 'ID exacto de la plantilla autorizada.',
                    },
                    variables: {
                        type: 'object',
                        description: 'Mapa de variables para reemplazo en la plantilla.',
                        additionalProperties: { type: 'string' },
                    },
                },
                required: ['template_id'],
                additionalProperties: false,
            },
        },
    },
    execute: async (context: { accountId: string; conversationId: string }, args: any) => {
        const { template_id, variables } = args;
        if (!template_id) throw new Error('template_id required');

        return aiTemplateService.sendAuthorizedTemplate({
            accountId: context.accountId,
            conversationId: context.conversationId,
            templateId: template_id,
            variables: variables || {},
        });
    }
};

export const SYSTEM_LIST_TEMPLATES: FluxCoreCapability = {
    name: 'list_available_templates',
    description: 'Lista las plantillas autorizadas para IA. Úsala para encontrar el template_id correcto antes de enviar.',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'list_available_templates',
            description: 'Lista las plantillas autorizadas para IA. Úsala para encontrar el template_id correcto antes de enviar.',
            parameters: {
                type: 'object',
                properties: {},
                additionalProperties: false,
            },
        },
    },
    execute: async (context: { accountId: string }) => {
        const templates = await aiTemplateService.getAvailableTemplates(context.accountId);
        return templates.map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            variables: t.variables?.map((v: any) => v.name) || [],
            instructions: t.aiUsageInstructions || null,
        }));
    }
};
