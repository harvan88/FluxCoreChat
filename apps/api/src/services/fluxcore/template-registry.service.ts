import { fluxCoreTemplateSettingsService, type AuthorizedTemplate } from './template-settings.service';

/**
 * Template Registry Service
 *
 * Single Source of Truth para la inyección de plantillas en prompts de IA.
 * Centraliza:
 *  - Consulta de plantillas autorizadas por cuenta
 *  - Generación del bloque de instrucciones (prompt fragment)
 *  - Validación de ejecución (canExecute)
 *
 * Ambos runtimes (OpenAI y Local) deben consumir este servicio
 * para garantizar consistencia.
 */

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
    /## LIBRERÍA DE PLANTILLAS[\s\S]*?(?=#|$)/gi,
    /## LIBRERÍA DE INTENCIONES[\s\S]*?(?=#|$)/gi,
    /## LISTA DE PLANTILLAS AUTORIZADAS[\s\S]*?(?=#|$)/gi,
];

class TemplateRegistryService {
    /**
     * Devuelve las plantillas activas y autorizadas para IA de una cuenta.
     */
    async getAuthorizedTemplates(accountId: string): Promise<AuthorizedTemplate[]> {
        return fluxCoreTemplateSettingsService.listAuthorizedTemplates(accountId);
    }

    /**
     * Genera el bloque de instrucciones que describe las plantillas disponibles.
     * Retorna `null` si la cuenta no tiene plantillas autorizadas.
     */
    async buildInstructionBlock(accountId: string): Promise<TemplateInstructionBlock | null> {
        const aiTemplates = await this.getAuthorizedTemplates(accountId);
        if (aiTemplates.length === 0) return null;

        const templatesList = aiTemplates.map(t => {
            const instruction = t.aiUsageInstructions
                ? t.aiUsageInstructions.replace(/\|/g, '-')
                : 'n/a';
            const variables = t.variables.map(v => v.name).join(', ') || 'n/a';
            return `| ${t.id} | ${t.name} | ${instruction} | ${variables} |`;
        }).join('\n');

        const deterministicDirective = `
### DETECCIÓN AUTOMÁTICA LOCAL (CALL_TEMPLATE)

Cuando el runtime local esté en **modo automático** y detectes con claridad que el mensaje coincide con una plantilla autorizada:

1. Responde **exclusivamente** con el texto \`CALL_TEMPLATE:<template_id>\`.
2. Si necesitas variables, añade inmediatamente después un JSON con los valores. Ejemplo:
   \`CALL_TEMPLATE:123e4567-e89b-12d3-a456-426614174000 {"nombre":"Ana"}\`
3. No agregues texto adicional ni explicaciones. El runtime interpretará este marcador y enviará la plantilla correspondiente.

Si no hay coincidencia clara, responde normalmente.
        `.trim();

        const content = `
# SISTEMA DE PLANTILLAS OFICIALES

Tienes acceso a plantillas predefinidas para respuestas específicas. Estas plantillas contienen contenido oficial (PDFs, imágenes, textos formateados) que NO puedes parafrasear ni inventar.

## COMPORTAMIENTO SEGÚN LA INTENCIÓN:

### SI la intención del usuario COINCIDE con una plantilla:
1. Llama a \`send_template\` con el ID correspondiente.
2. NO añadas texto adicional. El sistema entregará la plantilla automáticamente.
3. Tu respuesta debe estar VACÍA (solo la llamada a la herramienta).

### SI la intención del usuario NO COINCIDE con ninguna plantilla:
1. Responde NORMALMENTE según tu rol definido.
2. Usa tu personalidad y conocimientos para atender al usuario.
3. NO menciones las plantillas a menos que sea relevante.

## LIBRERÍA DE INTENCIONES (solo estas disparan plantillas):
| ID (template_id) | Nombre de Plantilla (Intención) | Contexto / Instrucciones | Variables Requeridas |
|---|---|---|---|
${templatesList}

IMPORTANTE: Si el mensaje del usuario no encaja claramente con ninguna de las intenciones de arriba, asume tu rol principal y responde con naturalidad.

${deterministicDirective}
        `.trim();

        return { content, templateCount: aiTemplates.length };
    }

    /**
     * Verifica si una plantilla específica puede ser ejecutada por la IA para una cuenta.
     */
    async canExecute(templateId: string, accountId: string): Promise<boolean> {
        const settings = await fluxCoreTemplateSettingsService.getSettings(templateId);
        if (!settings.authorizeForAI) return false;

        // Verificar que la plantilla pertenece a la cuenta y está activa
        const authorized = await this.getAuthorizedTemplates(accountId);
        return authorized.some(t => t.id === templateId);
    }

    /**
     * Elimina bloques de plantillas heredados del contenido de una instrucción.
     * Necesario para limpiar instrucciones que fueron contaminadas por la
     * inyección estática anterior.
     */
    stripLegacyBlocks(content: string): string {
        let cleaned = content;
        for (const pattern of LEGACY_HEADER_PATTERNS) {
            cleaned = cleaned.replace(pattern, '');
        }
        return cleaned.trim();
    }
}

export const templateRegistryService = new TemplateRegistryService();
