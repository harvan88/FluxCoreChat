/**
 * AsistentesOpenAIRuntime — FluxCore v8.3
 *
 * Canon §4.11: Remote cognitive runtime via OpenAI Assistants API.
 *
 * INVARIANTS:
 *  - NO DB access during handleMessage (Canon Inv. 10)
 *  - NO direct effect execution — returns actions only
 *  - Parallel and independent from AsistentesLocalRuntime (never a fallback)
 *  - Requires runtimeConfig.externalAssistantId (asst_xxx)
 *
 * Execution flow:
 *  1. Validate externalAssistantId in runtimeConfig
 *  2. Format conversationHistory as OpenAI thread messages
 *  3. Inject PolicyContext as instruction override
 *  4. runAssistantWithMessages() → wait for run completion
 *  5. Return send_message action
 */

import type { RuntimeAdapter, RuntimeInput, ExecutionAction } from '../../../core/fluxcore-types';
import type { FluxPolicyContext } from '@fluxcore/db';
import { runAssistantWithMessages } from '../../openai-sync.service';

export class AsistentesOpenAIRuntime implements RuntimeAdapter {
    readonly runtimeId = 'asistentes-openai';
    readonly displayName = 'Asistentes OpenAI (v8.3)';

    async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
        const { policyContext, runtimeConfig, conversationHistory } = input;

        // 1. Guard: mode gate
        if (policyContext.mode === 'off') {
            return [{ type: 'no_action', reason: 'Automation mode is off' }];
        }

        // 2. Guard: loop prevention
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (!lastMessage) {
            return [{ type: 'no_action', reason: 'No messages in conversation' }];
        }
        if (lastMessage.role === 'assistant' || lastMessage.role === 'system') {
            return [{ type: 'no_action', reason: 'Loop prevention: last message is not from user' }];
        }

        // 3. Validate external assistant ID (required for this runtime — comes from RuntimeConfig)
        const assistantExternalId = runtimeConfig.externalAssistantId;
        if (!assistantExternalId) {
            return [{
                type: 'no_action',
                reason: 'AsistentesOpenAI requires runtimeConfig.externalAssistantId (asst_xxx)'
            }];
        }

        // 4. Format conversationHistory as OpenAI thread messages
        const threadMessages = conversationHistory
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // 5. Build instructions override from PolicyContext (Canon §4.11: PolicyContext has priority)
        const instructionsOverride = this.buildInstructionsOverride(policyContext);

        // 6. Invoke OpenAI Assistants API (injected service — no DB)
        try {
            console.log(`[AsistentesOpenAI] Running assistant ${assistantExternalId} for account ${policyContext.accountId}`);

            const result = await runAssistantWithMessages({
                assistantExternalId,
                messages: threadMessages,
                additionalInstructions: instructionsOverride || undefined,
                accountId: policyContext.accountId,
                conversationId: policyContext.conversationId,
            });

            if (!result.success || !result.content) {
                return [{
                    type: 'no_action',
                    reason: result.error || 'OpenAI Assistant returned no content'
                }];
            }

            console.log(`[AsistentesOpenAI] ✅ Response received (${result.usage?.totalTokens ?? '?'} tokens)`);

            return [{
                type: 'send_message',
                conversationId: policyContext.conversationId,
                content: result.content.trim(),
            }];

        } catch (error: any) {
            console.error(`[AsistentesOpenAI] ❌ Run failed:`, error.message);
            return [{ type: 'no_action', reason: `OpenAI Assistants error: ${error.message}` }];
        }
    }

    /**
     * Build additional instructions from PolicyContext.
     * PolicyContext governance directives take priority over assistant instructions.
     */
    private buildInstructionsOverride(policyContext: FluxPolicyContext): string {
        const lines: string[] = [];
        const { tone, useEmojis, language, resolvedBusinessProfile, contactRules } = policyContext;

        lines.push(`[DIRECTIVAS DE ATENCIÓN — PRIORIDAD MÁXIMA]`);
        if (resolvedBusinessProfile.displayName) {
            lines.push(`Empresa: ${resolvedBusinessProfile.displayName}`);
        }

        const toneMap: Record<string, string> = {
            formal: 'formal y profesional',
            casual: 'casual y relajado',
            neutral: 'neutro y claro',
        };
        lines.push(`Tono: ${toneMap[tone] || tone}`);
        lines.push(`Emojis: ${useEmojis ? 'sí, moderados' : 'no uses emojis'}`);
        lines.push(`Idioma: responde siempre en ${language}`);

        const rules = contactRules.filter(r => r.type === 'rule');
        const notes = contactRules.filter(r => r.type === 'note');

        if (notes.length > 0) {
            lines.push(`\nNotas del contacto:`);
            notes.forEach(n => lines.push(`- ${n.content}`));
        }
        if (rules.length > 0) {
            lines.push(`\nReglas para este contacto:`);
            rules.forEach(r => lines.push(`- ${r.content}`));
        }

        return lines.join('\n');
    }
}

export const asistentesOpenAIRuntime = new AsistentesOpenAIRuntime();
