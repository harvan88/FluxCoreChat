import { fluxCoreTemplateSettingsService, type AuthorizedTemplate } from './template-settings.service';

export interface TemplateInstructionBlock {
    content: string;
    templateCount: number;
}

const LEGACY_HEADER_PATTERNS: RegExp[] = [
    /# INSTRUCCIONES DE USO DE PLANTILLAS[\s\S]*?(?=#|$)/gi,
    /# LIBRERÍA DE PLANTILLAS[\s\S]*?(?=#|$)/gi,
    /# LISTA DE PLANTILLAS AUTORIZADAS[\s\S]*?(?=#|$)/gi,
    /# REGLA DE ORO[\s\S]*?(?=#|$)/gi,
    /# SISTEMA DE PLANTILLAS OFICIALES[\s\S]*?(?=#|$)/gi,
    /# PLANTILLAS AUTORIZADAS[\s\S]*?(?=#|$)/gi,
    /## LIBRERÍA DE PLANTILLAS[\s\S]*?(?=#|$)/gi,
    /## LIBRERÍA DE INTENCIONES[\s\S]*?(?=#|$)/gi,
    /## LISTA DE PLANTILLAS AUTORIZADAS[\s\S]*?(?=#|$)/gi,
];

class TemplateRegistryService {

    async getAuthorizedTemplates(accountId: string): Promise<AuthorizedTemplate[]> {
        return fluxCoreTemplateSettingsService.listAuthorizedTemplates(accountId);
    }

    async buildInstructionBlock(accountId: string): Promise<TemplateInstructionBlock | null> {
        const aiTemplates = await this.getAuthorizedTemplates(accountId);
        if (aiTemplates.length === 0) return null;

        const templatesList = aiTemplates.map(t => {
            const instruction = t.aiUsageInstructions?.trim() || 'n/a';
            const variables = t.variables.map(v => v.name).join(', ') || 'n/a';
            return `- ID: ${t.id}\n  Nombre: ${t.name}\n  Cuándo usarla: ${instruction}\n  Variables: ${variables}`;
        }).join('\n\n');

        const content = `
# PLANTILLAS AUTORIZADAS

## Principio fundamental: Plantillas son excepción, no regla

Las plantillas solo deben usarse cuando la intención del usuario coincide EXACTAMENTE con una plantilla disponible. Tu comportamiento por defecto es responder normalmente como asistente. NO busques activamente razones para usar plantillas.

## Uso del token CALL_TEMPLATE:

Si determinas que una plantilla aplica según las reglas que siguen, responde únicamente con:
CALL_TEMPLATE:<template_id>

Este token indica al sistema que ejecute la plantilla especificada. No agregues texto adicional, no expliques qué es el token, simplemente devuélvelo tal como se indica.

Dispones de plantillas oficiales para intenciones específicas. No parafrasees ni inventes su contenido.

## Plantillas disponibles:

${templatesList}

## Reglas de uso:

REGLA 1 - Coincidencia exacta con una plantilla y sin intención adicional pendiente:
Responde únicamente con el marcador, PROHIBIDO agregar texto extra.
CALL_TEMPLATE:<template_id>

REGLA 2 - Coincidencia con una plantilla y el usuario además expresó otra intención concreta que la plantilla no cubre:
Responde con el marcador primero. En la línea siguiente, responde solo lo que la plantilla no cubre. Sin relleno, sin repetir lo que ya cubre la plantilla.
CALL_TEMPLATE:<template_id>
<respuesta exclusivamente a la intención no cubierta>

REGLA 3 - Múltiples plantillas relevantes:
Un marcador por línea, en orden de relevancia. Texto complementario solo si aplica REGLA 2.
CALL_TEMPLATE:<template_id_1>
CALL_TEMPLATE:<template_id_2>
<respuesta exclusivamente a la intención no cubierta, si existe>

REGLA 4 - Sin coincidencia con ninguna plantilla:
Responde normalmente según tu rol. No menciones las plantillas.

IMPORTANTE: Texto complementario solo es válido si responde una intención concreta del usuario que ninguna plantilla cubre. Cualquier otro texto - relleno, confirmaciones, frases de transición - está prohibido.
        `.trim();

        return { content, templateCount: aiTemplates.length };
    }

    async canExecute(templateId: string, accountId: string): Promise<boolean> {
        const settings = await fluxCoreTemplateSettingsService.getSettings(templateId);
        if (!settings.authorizeForAI) return false;

        const authorized = await this.getAuthorizedTemplates(accountId);
        return authorized.some(t => t.id === templateId);
    }

    stripLegacyBlocks(content: string): string {
        let cleaned = content;
        for (const pattern of LEGACY_HEADER_PATTERNS) {
            cleaned = cleaned.replace(pattern, '');
        }
        return cleaned.trim();
    }
}

export const templateRegistryService = new TemplateRegistryService();