import { db, templates, fluxcoreTemplateSettings, type Template } from '@fluxcore/db';
import { eq, and, desc, inArray } from 'drizzle-orm';

export interface AuthorizedTemplate extends Template {
    aiUsageInstructions: string | null;
    aiIncludeName: boolean;
    aiIncludeContent: boolean;
    aiIncludeInstructions: boolean;
}

export class FluxCoreTemplateSettingsService {
    constructor(private readonly orm = db) { }

    /**
     * Lista las plantillas autorizadas para IA de una cuenta.
     * Realiza un JOIN entre templates (Core) y fluxcore_template_settings (Extension).
     */
    async listAuthorizedTemplates(accountId: string): Promise<AuthorizedTemplate[]> {
        const rows = await this.orm
            .select({
                template: templates,
                settings: fluxcoreTemplateSettings
            })
            .from(templates)
            .innerJoin(fluxcoreTemplateSettings, eq(templates.id, fluxcoreTemplateSettings.templateId))
            .where(
                and(
                    eq(templates.accountId, accountId),
                    eq(templates.isActive, true),
                    eq(fluxcoreTemplateSettings.authorizeForAI, true)
                )
            )
            .orderBy(desc(templates.updatedAt));

        // Mapear resultado plano
        return rows.map(({ template, settings }) => ({
            ...template,
            aiUsageInstructions: settings.aiUsageInstructions,
            aiIncludeName: settings.aiIncludeName,
            aiIncludeContent: settings.aiIncludeContent,
            aiIncludeInstructions: settings.aiIncludeInstructions
        }));
    }

    /**
     * Obtiene settings para múltiples templates (optimizado para listas)
     */
    async getSettingsMap(templateIds: string[]): Promise<Map<string, { authorizeForAI: boolean, aiUsageInstructions: string | null, aiIncludeName: boolean, aiIncludeContent: boolean, aiIncludeInstructions: boolean }>> {
        if (templateIds.length === 0) return new Map();

        const rows = await this.orm
            .select()
            .from(fluxcoreTemplateSettings)
            .where(inArray(fluxcoreTemplateSettings.templateId, templateIds));

        const map = new Map();
        rows.forEach(r => map.set(r.templateId, {
            authorizeForAI: r.authorizeForAI,
            aiUsageInstructions: r.aiUsageInstructions,
            aiIncludeName: r.aiIncludeName,
            aiIncludeContent: r.aiIncludeContent,
            aiIncludeInstructions: r.aiIncludeInstructions
        }));
        return map;
    }

    /**
     * Obtiene o crea la configuración de IA para una plantilla
     */
    async getSettings(templateId: string) {
        const [settings] = await this.orm
            .select()
            .from(fluxcoreTemplateSettings)
            .where(eq(fluxcoreTemplateSettings.templateId, templateId));

        return settings || {
            authorizeForAI: false,
            aiUsageInstructions: null,
            aiIncludeName: true,
            aiIncludeContent: true,
            aiIncludeInstructions: true
        };
    }

    /**
     * Actualiza la configuración de IA para una plantilla
     */
    async updateSettings(templateId: string, authorizeForAI: boolean, aiUsageInstructions?: string, granularPermissions?: { aiIncludeName?: boolean, aiIncludeContent?: boolean, aiIncludeInstructions?: boolean }) {
        const current = await this.getSettings(templateId);

        return await this.orm
            .insert(fluxcoreTemplateSettings)
            .values({
                templateId,
                authorizeForAI,
                aiUsageInstructions: aiUsageInstructions || null,
                aiIncludeName: granularPermissions?.aiIncludeName ?? current.aiIncludeName ?? true,
                aiIncludeContent: granularPermissions?.aiIncludeContent ?? current.aiIncludeContent ?? true,
                aiIncludeInstructions: granularPermissions?.aiIncludeInstructions ?? current.aiIncludeInstructions ?? true
            })
            .onConflictDoUpdate({
                target: fluxcoreTemplateSettings.templateId,
                set: {
                    authorizeForAI,
                    aiUsageInstructions: aiUsageInstructions || null,
                    aiIncludeName: granularPermissions?.aiIncludeName ?? current.aiIncludeName ?? true,
                    aiIncludeContent: granularPermissions?.aiIncludeContent ?? current.aiIncludeContent ?? true,
                    aiIncludeInstructions: granularPermissions?.aiIncludeInstructions ?? current.aiIncludeInstructions ?? true,
                    updatedAt: new Date()
                }
            })
            .returning();
    }
}

export const fluxCoreTemplateSettingsService = new FluxCoreTemplateSettingsService();
