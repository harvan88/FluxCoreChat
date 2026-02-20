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

export interface BuiltPrompt {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

class PromptBuilderService {

    build(params: {
        policyContext: FluxPolicyContext;
        runtimeConfig: RuntimeConfig;
        conversationHistory: ConversationMessage[];
    }): BuiltPrompt {
        const { policyContext, runtimeConfig, conversationHistory } = params;

        const sections: string[] = [];

        // ── Section 1: Business Identity (resolvedBusinessProfile) ───────────
        sections.push(this.buildIdentitySection(policyContext));

        // ── Section 2: PolicyContext Directives — PRIORITY — Voice of Business ─
        sections.push(this.buildPolicySection(policyContext));

        // ── Section 3: RuntimeConfig Instructions ─────────────────────────────
        if (runtimeConfig.instructions) {
            sections.push(`## Instrucciones del Asistente\n\n${runtimeConfig.instructions}`);
        }

        // ── Section 4: Knowledge from resolvedBusinessProfile ─────────────────
        const knowledgeSection = this.buildKnowledgeSection(policyContext);
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

    private buildIdentitySection(policyContext: FluxPolicyContext): string {
        const { resolvedBusinessProfile } = policyContext;
        const lines = [`## Identidad`];

        const name = resolvedBusinessProfile.displayName || 'Asistente Virtual';
        lines.push(`Eres el asistente virtual de **${name}**.`);

        if (resolvedBusinessProfile.bio) {
            lines.push(resolvedBusinessProfile.bio as string);
        }
        if (resolvedBusinessProfile.privateContext) {
            lines.push(`\nContexto adicional: ${resolvedBusinessProfile.privateContext}`);
        }

        return lines.join('\n');
    }

    private buildPolicySection(policyContext: FluxPolicyContext): string {
        const { tone, useEmojis, language, contactRules } = policyContext;
        const lines = [`## Directivas de Atención`];

        const toneMap: Record<string, string> = {
            formal: 'formal y profesional',
            casual: 'casual y relajado',
            neutral: 'neutro y claro',
        };
        lines.push(`- **Tono:** ${toneMap[tone] || tone}`);
        lines.push(`- **Emojis:** ${useEmojis ? 'Puedes usar emojis de forma moderada' : 'No uses emojis'}`);
        lines.push(`- **Idioma:** Responde siempre en ${language}`);

        const notes = contactRules.filter(r => r.type === 'note');
        const preferences = contactRules.filter(r => r.type === 'preference');
        const rules = contactRules.filter(r => r.type === 'rule');

        if (notes.length > 0) {
            lines.push(`\n### Notas del Contacto`);
            notes.forEach(n => lines.push(`- ${n.content}`));
        }
        if (preferences.length > 0) {
            lines.push(`\n### Preferencias del Contacto`);
            preferences.forEach(p => lines.push(`- ${p.content}`));
        }
        if (rules.length > 0) {
            lines.push(`\n### Reglas para este Contacto`);
            rules.forEach(r => lines.push(`- ${r.content}`));
        }

        return lines.join('\n');
    }

    private buildKnowledgeSection(policyContext: FluxPolicyContext): string | null {
        const { resolvedBusinessProfile } = policyContext;
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
