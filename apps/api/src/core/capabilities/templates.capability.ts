import { FluxCoreCapability } from './index';
import { aiTemplateService } from '../../services/ai-template.service';

export const SYSTEM_SEND_TEMPLATE: FluxCoreCapability = {
    id: 'chatcore.send_template',
    slug: 'send_template',
    version: '1.0.0',
    domain: 'chatcore',
    kind: 'command',
    translationStrategy: 'tool',
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
                    templateId: {
                        type: 'string',
                        description: 'ID exacto de la plantilla autorizada.',
                    },
                    variables: {
                        type: 'object',
                        description: 'Mapa de variables para reemplazo en la plantilla.',
                        additionalProperties: { type: 'string' },
                    },
                },
                required: ['templateId'],
                additionalProperties: false,
            },
        },
    },
    outputSchema: {
        type: 'object',
        properties: {
            messageId: { type: 'string' },
            status: { type: 'string' },
        },
    },
    usageHints: [
        'Usar solo cuando la intención del usuario coincida claramente con una plantilla autorizada.',
        'Se considera capability de comando: su efecto final debe quedar mediado por plataforma.',
    ],
    execute: async (context: { accountId: string; conversationId: string }, args: any) => {
        const templateId = args.templateId ?? args.template_id;
        const { variables } = args;
        if (!templateId) throw new Error('templateId required');

        return aiTemplateService.sendAuthorizedTemplate({
            accountId: context.accountId,
            conversationId: context.conversationId,
            templateId,
            variables: variables || {},
        });
    }
};

export const SYSTEM_LIST_TEMPLATES: FluxCoreCapability = {
    id: 'chatcore.list_available_templates',
    slug: 'list_available_templates',
    version: '1.0.0',
    domain: 'chatcore',
    kind: 'query',
    translationStrategy: 'tool',
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
    outputSchema: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                category: { type: 'string' },
                variables: { type: 'array', items: { type: 'string' } },
                instructions: { type: 'string' },
            },
        },
    },
    usageHints: [
        'Usar para descubrir qué templates están autorizados antes de proponer o enviar uno.',
    ],
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
