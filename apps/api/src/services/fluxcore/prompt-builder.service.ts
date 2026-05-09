/**
 * PromptBuilder — FluxCore v8.3
 *
 * Canon §4.10: "PromptBuilder combines two separate sources in distinct
 * sections of the prompt. PolicyContext has priority because it is the
 * voice of the business."
 *
 * Sections (in order):
 *  1. Business identity (resolvedBusinessProfile.displayName/bio) — who is responding
 *  2. PolicyContext directives (tone, emojis, language, contactRules) — PRIORITY
 *  3. RuntimeConfig instructions (domain knowledge, content expertise)
 *  4. Knowledge context (templates, services from resolvedBusinessProfile)
 *
 * Pure function. No DB access. No side effects.
 */

import type { FluxPolicyContext, ConversationMessage } from '@fluxcore/db';
import type { RuntimeConfig } from '@fluxcore/db';
import type { AuthorizedRuntimeContext } from '../../core/fluxcore-types';
import { runtimeInstructionContextService } from './runtime-instruction-context.service';
import { LEGACY_HEADER_PATTERNS } from './template-registry.service';

function stripLegacyBlocks(content: string): string {
    let cleaned = content;
    for (const pattern of LEGACY_HEADER_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trim();
}

function containsTemplateProtocolInstructions(instructions?: string): boolean {
    if (typeof instructions !== 'string' || instructions.trim().length === 0) {
        return false;
    }

    return /CALL_TEMPLATE:|#\s*PLANTILLAS AUTORIZADAS/i.test(instructions);
}

export interface BuiltPrompt {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

class PromptBuilderService {

    build(params: {
        policyContext: FluxPolicyContext;
        authorizedContext?: AuthorizedRuntimeContext;
        runtimeConfig: RuntimeConfig;
        conversationHistory: ConversationMessage[];
        ragContext?: string;
        templateEnforcement?: string;
    }): BuiltPrompt {
        const { policyContext, authorizedContext, runtimeConfig, conversationHistory, ragContext, templateEnforcement } = params;

        const sections: string[] = [];

        // ── Section 1: Business Identity (resolvedBusinessProfile) ───────────
        sections.push(this.buildIdentitySection(policyContext, authorizedContext));

        // ── Section 2: PolicyContext Directives — PRIORITY — Voice of Business ─
        const policySection = this.buildPolicySection(policyContext, authorizedContext, runtimeConfig);
        // Si solo tiene el título (ej: "## Directivas de Atención" + \n), no la incluimos
        if (policySection.trim().split('\n').length > 1) {
            sections.push(policySection);
        }

        // ── Section 3: RuntimeConfig Instructions ─────────────────────────────
        const rawInstructions = authorizedContext?.instructions ?? runtimeConfig.instructions;
        const instructions = stripLegacyBlocks(rawInstructions || '');

        const instructionsSection = runtimeInstructionContextService.buildAuthorizedInstructionsSection({
            instructions,
            title: '## Instrucciones del Asistente',
        });
        if (instructionsSection) {
            // Deduplicación de títulos: Si el contenido ya empieza con un título de nivel 1 o 2 similar, no repetir el título de la sección
            const hasOverlappingTitle = /^\s*#+\s*PLANTILLAS AUTORIZADAS/i.test(instructions || '');
            if (hasOverlappingTitle) {
                sections.push(instructions!.trim());
            } else {
                sections.push(instructionsSection);
            }
        }

        // ── Section 4: Template Enforcement (Protocol) ────────────────────────
        if (templateEnforcement) {
            const alreadyHasProtocol = containsTemplateProtocolInstructions(instructions) || 
                                     containsTemplateProtocolInstructions(policyContext.resolvedBusinessProfile.privateContext as string);
            
            if (!alreadyHasProtocol) {
                sections.push(templateEnforcement.trim());
            }
        }

        // ── Section 5: Knowledge Context (RAG) ────────────────────────────────
        if (ragContext) {
            sections.push(ragContext.trim());
        }

        // ── Section 6: Static Knowledge (Templates/Services) ──────────────────
        const knowledgeSection = this.buildKnowledgeSection(policyContext, authorizedContext);
        if (knowledgeSection) {
            sections.push(knowledgeSection);
        }

        const systemPrompt = sections.join('\n\n');

        // ── Message History ───────────────────────────────────────────────────
        const messages = conversationHistory
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        return { systemPrompt, messages };
    }

    private buildIdentitySection(
        policyContext: FluxPolicyContext,
        authorizedContext?: AuthorizedRuntimeContext
    ): string {
        const resolvedBusinessProfile = authorizedContext?.businessProfile ?? policyContext.resolvedBusinessProfile;
        const lines = [`## Identidad`];

        const name = resolvedBusinessProfile.displayName || 'Asistente Virtual';
        lines.push(`Eres el asistente virtual de **${name}**.`);

        if (authorizedContext?.responder.assistantName) {
            lines.push(`Respondes como **${authorizedContext.responder.assistantName}** dentro de FluxCore.`);
        }

        if (authorizedContext?.systemClock) {
            lines.push(`\n📅 CONTEXTO TEMPORAL DE LA CUENTA: ${authorizedContext.systemClock}`);
        }

        if (resolvedBusinessProfile.bio) {
            lines.push(resolvedBusinessProfile.bio as string);
        }
        if (resolvedBusinessProfile.privateContext) {
            const cleanedPrivateContext = stripLegacyBlocks(resolvedBusinessProfile.privateContext as string);
            if (cleanedPrivateContext) {
                lines.push(`\nContexto adicional: ${cleanedPrivateContext}`);
            }
        }

        // Social links — only present if authorized by aiIncludeSocialLinks toggle
        if (resolvedBusinessProfile.socialLinks) {
            const links = resolvedBusinessProfile.socialLinks;
            const linkLines: string[] = [];
            if (links.instagram) linkLines.push(`- Instagram: ${links.instagram}`);
            if (links.facebook) linkLines.push(`- Facebook: ${links.facebook}`);
            if (links.whatsapp) linkLines.push(`- WhatsApp: ${links.whatsapp}`);
            if (links.website) linkLines.push(`- Sitio web: ${links.website}`);
            if (links.tiktok) linkLines.push(`- TikTok: ${links.tiktok}`);
            if (linkLines.length > 0) {
                lines.push(`\n### Redes y Contacto\n${linkLines.join('\n')}`);
            }
        }

        // Locations - Basic projection
        if (resolvedBusinessProfile.locations && resolvedBusinessProfile.locations.length > 0) {
            const locLines: string[] = [];
            resolvedBusinessProfile.locations.forEach((loc: any) => {
                let text = `* **${loc.name}**`;
                if (loc.isDefault) text += ` (Sede Principal)`;
                text += `\n  - Dirección: ${loc.address}`;
                locLines.push(text);
            });
            lines.push(`\n### Sedes / Ubicaciones físicas\n${locLines.join('\n\n')}`);
        }

        return lines.join('\n');
    }

    private buildPolicySection(
        policyContext: FluxPolicyContext,
        authorizedContext: AuthorizedRuntimeContext | undefined,
        runtimeConfig: RuntimeConfig
    ): string {
        return runtimeInstructionContextService.buildAttentionSection({
            runtimeConfig,
            contactRules: authorizedContext?.contactRules ?? policyContext.contactRules,
            title: '## Directivas de Atención',
            tonePrefix: '- **Tono:** ',
            emojiPrefix: '- **Emojis:** ',
            languagePrefix: '- **Idioma:** Responde siempre en ',
            notesHeading: '### Notas del Contacto',
            preferencesHeading: '### Preferencias del Contacto',
            rulesHeading: '### Reglas para este Contacto',
        });
    }

    private buildKnowledgeSection(
        policyContext: FluxPolicyContext,
        authorizedContext?: AuthorizedRuntimeContext
    ): string | null {
        const resolvedBusinessProfile = authorizedContext?.businessProfile ?? policyContext.resolvedBusinessProfile;
        const parts: string[] = [];
        const templates = resolvedBusinessProfile.templates as Array<{
            templateId: string; name: string; instructions?: string;
            variables: Array<{ name: string; required?: boolean }>; content?: string;
        }> | undefined;

        // FASE 0-3 CONSISTENCY: Always include templates in knowledge section if they exist.
        // Removed mutual exclusion with instructions block to prevent "cognitive blind spots".
        if (templates && templates.length > 0) {
            const templateLines = [`### Plantillas Disponibles`];
            templates.forEach(t => {
                let entry = `- **${t.name}** (ID: ${t.templateId})`;
                if (t.instructions) entry += `\n  Uso: ${t.instructions}`;
                if (t.variables.length > 0) {
                    const vars = t.variables.map(v => v.required ? `${v.name}*` : v.name).join(', ');
                    entry += `\n  Variables: ${vars}`;
                }
                if (t.content) {
                    entry += `\n  Contenido: "${t.content}"`;
                }
                templateLines.push(entry);
            });
            parts.push(templateLines.join('\n'));
        }

        const services = resolvedBusinessProfile.appointmentServices as Array<{
            name: string; description?: string; price?: string;
        }> | undefined;

        if (services && services.length > 0) {
            const serviceLines = [`### Servicios Disponibles`];
            services.forEach(s => {
                let entry = `- **${s.name}**`;
                if (s.description) entry += `: ${s.description}`;
                if (s.price) entry += ` — ${s.price}`;
                serviceLines.push(entry);
            });
            parts.push(serviceLines.join('\n'));
        }

        if (parts.length === 0) return null;
        return `## Conocimiento y Recursos\n\n${parts.join('\n\n')}`;
    }
}

export const promptBuilder = new PromptBuilderService();
