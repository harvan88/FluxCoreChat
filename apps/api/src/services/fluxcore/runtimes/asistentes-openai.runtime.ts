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
import { runAssistantWithMessages } from '../../openai-sync.service';
import { runtimeInstructionContextService } from '../runtime-instruction-context.service';
import { runtimeStyleService } from '../runtime-style.service';
import { capabilityOpenAIOfferService } from '../../capability-openai-offer.service';

interface OpenAIInstructionsSource {
    instructions?: string;
    tone?: string;
    language?: string;
    useEmojis?: boolean;
    businessProfile: RuntimeInput['authorizedContext']['businessProfile'];
    contactRules: RuntimeInput['authorizedContext']['contactRules'];
}

export class AsistentesOpenAIRuntime implements RuntimeAdapter {
    readonly runtimeId = 'asistentes-openai';
    readonly displayName = 'Asistentes OpenAI (v8.3)';

    async handleMessage(input: RuntimeInput): Promise<ExecutionAction[]> {
        const { policyContext, authorizedContext, runtimeConfig, conversationHistory } = input;

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

        const style = runtimeStyleService.resolve(runtimeConfig);

        // 5. Build instructions override from PolicyContext (Canon §4.11: PolicyContext has priority)
        const instructionsOverride = this.buildInstructionsOverride({
            instructions: authorizedContext.instructions,
            tone: style.tone,
            language: style.language,
            useEmojis: style.useEmojis,
            businessProfile: authorizedContext.businessProfile,
            contactRules: authorizedContext.contactRules,
        });

        // 5.5 Resolve available tools for OpenAI (mediated by platform)
        const tools = capabilityOpenAIOfferService.listToolsForLegacyOffer({
            hasKnowledgeBase: (runtimeConfig.vectorStoreIds?.length ?? 0) > 0,
            hasTemplatesTool: (authorizedContext.authorizedTemplates?.length ?? 0) > 0,
        });

        // 6. Invoke OpenAI Assistants API (injected service — no DB)
        try {
            console.log(`[AsistentesOpenAI] Running assistant ${assistantExternalId} for account ${authorizedContext.accountId} with ${tools.length} tools`);

            const result = await runAssistantWithMessages({
                assistantExternalId,
                messages: threadMessages,
                additionalInstructions: instructionsOverride || undefined,
                tools,
                accountId: authorizedContext.accountId,
                conversationId: authorizedContext.conversationId,
                vectorStoreIds: runtimeConfig.vectorStoreIds,
                authorizedTemplates: authorizedContext.authorizedTemplates,
            });

            if (!result.success || !result.content) {
                return [{
                    type: 'no_action',
                    reason: result.error || 'OpenAI Assistant returned no content'
                }];
            }

            console.log(`[AsistentesOpenAI] ✅ Response received (${result.usage?.totalTokens ?? '?'} tokens)`);

            const actions: ExecutionAction[] = result.actions || [];

            if (result.content) {
                actions.push({
                    type: 'send_message',
                    conversationId: authorizedContext.conversationId,
                    content: result.content.trim(),
                });
            }

            return actions;

        } catch (error: any) {
            console.error(`[AsistentesOpenAI] ❌ Run failed:`, error.message);
            return [{ type: 'no_action', reason: `OpenAI Assistants error: ${error.message}` }];
        }
    }

    /**
     * Build additional instructions from PolicyContext.
     * PolicyContext governance directives take priority over assistant instructions.
     */
    private buildInstructionsOverride(source: OpenAIInstructionsSource): string {
        const lines: string[] = [];
        const { instructions, businessProfile, contactRules, tone, language, useEmojis } = source;

        const instructionsSection = runtimeInstructionContextService.buildAuthorizedInstructionsSection({
            instructions,
            title: '[INSTRUCCIONES AUTORIZADAS]',
        });
        if (instructionsSection) {
            lines.push(instructionsSection);
            lines.push('');
        }

        lines.push(`[DIRECTIVAS DE ATENCIÓN — PRIORIDAD MÁXIMA]`);
        if (businessProfile.displayName) {
            lines.push(`Empresa: ${businessProfile.displayName}`);
        }

        lines.push(runtimeInstructionContextService.buildAttentionSection({
            style: {
                tone: tone ?? 'neutral',
                language: language ?? 'es',
                useEmojis: useEmojis ?? false,
            },
            contactRules,
            title: 'Directivas activas',
            tonePrefix: 'Tono: ',
            emojiPrefix: 'Emojis: ',
            languagePrefix: 'Idioma: responde siempre en ',
            notesHeading: 'Notas del contacto:',
            preferencesHeading: 'Preferencias del contacto:',
            rulesHeading: 'Reglas para este contacto:',
        }));

        return lines.join('\n');
    }
}

export const asistentesOpenAIRuntime = new AsistentesOpenAIRuntime();
