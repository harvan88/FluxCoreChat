import { templateService } from './template.service';

/**
 * AI Template Service
 * Encapsula la lógica para que la IA interactúe con el sistema de plantillas.
 */
export class AITemplateService {

    /**
     * Obtiene solo las plantillas que el usuario ha autorizado para uso de la IA
     */
    async getAvailableTemplates(accountId: string) {
        return templateService.listAITemplates(accountId);
    }

    /**
     * Ejecuta el envío de una plantilla desde la IA
     * Verifica autorización antes de proceder.
     */
    async sendAuthorizedTemplate(params: {
        templateId: string;
        accountId: string;
        conversationId: string;
        variables?: Record<string, string>;
    }) {
        const { templateId, accountId, conversationId, variables } = params;

        // 1. Obtener la plantilla (Business Unit)
        const template = await templateService.getTemplate(accountId, templateId);

        // 2. Verificación de seguridad: ¿Está autorizada para IA?
        if (!template.authorizeForAI || !template.isActive) {
            throw new Error('Template not authorized for AI use');
        }

        // 3. Delegar ejecución al servicio central del núcleo (Soberanía de Chat Core)
        return templateService.executeTemplate({
            templateId,
            accountId,
            conversationId,
            variables,
            generatedBy: 'ai'
        });
    }
}

export const aiTemplateService = new AITemplateService();
