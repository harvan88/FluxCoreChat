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
    }): BuiltPrompt {
        const { policyContext, authorizedContext, runtimeConfig, conversationHistory } = params;

        const sections: string[] = [];

        // ── Section 1: Business Identity (resolvedBusinessProfile) ───────────
        sections.push(this.buildIdentitySection(policyContext, authorizedContext));

        // ── Section 2: PolicyContext Directives — PRIORITY — Voice of Business ─
        sections.push(this.buildPolicySection(policyContext, authorizedContext, runtimeConfig));

        // ── Section 3: RuntimeConfig Instructions ─────────────────────────────
        const instructionsSection = runtimeInstructionContextService.buildAuthorizedInstructionsSection({
            instructions: authorizedContext?.instructions ?? runtimeConfig.instructions,
            title: '## Instrucciones del Asistente',
        });
        if (instructionsSection) {
            sections.push(instructionsSection);
        }

        // ── Section 4: Knowledge from resolvedBusinessProfile ─────────────────
        const knowledgeSection = this.buildKnowledgeSection(policyContext, authorizedContext);
        if (knowledgeSection) {
            sections.push(knowledgeSection);
        }

        // ── Section 5: Execution Directives — GUIDANCE ────────────────────────
        if (authorizedContext && authorizedContext.authorizedTemplates.length > 0) {
            sections.push(`## Directivas de Ejecución\n\n- Tienes acceso a **Plantillas Autorizadas**. Si el mensaje del usuario encaja con la descripción de uso de una plantilla, **DEBES prioritariamente** usar la herramienta \`send_template\` con el ID correspondiente en lugar de generar una respuesta de texto libre.`);
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

        if (resolvedBusinessProfile.bio) {
            lines.push(resolvedBusinessProfile.bio as string);
        }
        if (resolvedBusinessProfile.privateContext) {
            lines.push(`\nContexto adicional: ${resolvedBusinessProfile.privateContext}`);
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

        if (templates && templates.length > 0) {
            const templateLines = [`### Plantillas Disponibles`];
            templates.forEach(t => {
                let entry = `- **${t.name}** (ID: ${t.templateId})`;
                if (t.instructions) entry += `\n  Uso: ${t.instructions}`;
                if (t.variables.length > 0) {
                    const vars = t.variables.map(v => v.required ? `${v.name}*` : v.name).join(', ');
                    entry += `\n  Variables: ${vars}`;
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
