import { templateService } from './template.service';
import { templateRegistryService } from './fluxcore/template-registry.service';

/**
 * AI Template Service
 * Encapsula la lógica para que la IA interactúe con el sistema de plantillas.
 * Delega autorización al TemplateRegistryService (Single Source of Truth).
 */
export class AITemplateService {

    /**
     * Obtiene solo las plantillas que el usuario ha autorizado para uso de la IA
     */
    async getAvailableTemplates(accountId: string) {
        return templateRegistryService.getAuthorizedTemplates(accountId);
    }

    /**
     * Ejecuta el envío de una plantilla desde la IA
     * Verifica autorización via TemplateRegistry antes de proceder.
     */
    async sendAuthorizedTemplate(params: {
        templateId: string;
        accountId: string;
        conversationId: string;
        variables?: Record<string, string>;
    }) {
        const { templateId, accountId, conversationId, variables } = params;

        // 1. Verificación de seguridad centralizada (TemplateRegistry)
        const canExecute = await templateRegistryService.canExecute(templateId, accountId);
        if (!canExecute) {
            throw new Error('Template not authorized for AI use');
        }

        // 2. Delegar ejecución al servicio central del núcleo (Soberanía de Chat Core)
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
