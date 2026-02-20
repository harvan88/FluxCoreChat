/**
 * CognitiveDispatcher — FluxCore v8.3
 *
 * Canon §4.9: The Decision Router
 *
 * Called by the CognitionWorker when a turn is ready to be processed.
 *
 * Responsibilities:
 * 1. Resolve PolicyContext (business governance) for account + relationship
 * 2. Resolve RuntimeConfig (technical config) for the active assistant
 * 3. Build ConversationMessage[] (semantic message history — no raw signals)
 * 4. Check automation mode gate
 * 5. Emit typing keepalive BEFORE calling runtime
 * 6. Delegate to RuntimeGateway
 * 7. Pass actions to ActionExecutor
 *
 * Canon Invariant 10: RuntimeInput must be complete before handleMessage is called.
 */

import { db, conversations, messages, aiSuggestions } from '@fluxcore/db';
import type { ConversationMessage } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import type { RuntimeInput, ExecutionAction } from '../../core/fluxcore-types';
import { fluxPolicyContextService } from '../flux-policy-context.service';
import { runtimeConfigService } from '../flux-runtime-config.service';
import { runtimeGateway } from './runtime-gateway.service';
import { actionExecutor } from './action-executor.service';

const MAX_HISTORY_MESSAGES = 50;

export interface DispatchResult {
    actions: ExecutionAction[];
    runtimeUsed: string;
    durationMs: number;
    success: boolean;
    error?: string;
}

class CognitiveDispatcherService {

    /**
     * Dispatch a cognitive turn.
     * Called by CognitionWorker when turn_window_expires_at < NOW().
     */
    async dispatch(params: {
        turnId: number;
        conversationId: string;
        accountId: string;
        lastSignalSeq: number | null;
    }): Promise<DispatchResult> {
        const startTime = Date.now();
        const { turnId, conversationId, accountId } = params;

        try {
            // 1. Resolve conversation + relationship
            const [conversation] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);

            if (!conversation) {
                return this.failResult('Conversation not found', startTime);
            }

            // 2. Resolve PolicyContext (Canon §4.3: business governance)
            const policyContext = await fluxPolicyContextService.resolve({
                accountId,
                conversationId,
                relationshipId: conversation.relationshipId ?? undefined,
                channel: (conversation as any).channel ?? 'web',
            });

            // 3. Automation mode gate (governed by PolicyContext)
            console.log(`[FluxPipeline] 📋 POLICY mode=${policyContext.mode} runtime=${policyContext.activeRuntimeId} lang=${policyContext.language} account=${accountId.slice(0,7)}`);
            if (policyContext.mode === 'off') {
                console.log(`[FluxPipeline] ⛔ OFF   account=${accountId.slice(0,7)} → automation disabled`);
                return {
                    actions: [{ type: 'no_action', reason: 'Automation mode is off' }],
                    runtimeUsed: 'none',
                    durationMs: Date.now() - startTime,
                    success: true,
                };
            }

            // 4. Resolve RuntimeConfig (Canon §4.4: technical implementation)
            const runtimeConfig = await runtimeConfigService.resolve({
                accountId,
                runtimeId: policyContext.activeRuntimeId,
                conversationId,
            });
            console.log(`[FluxPipeline] 🤖 ASSIST id=${runtimeConfig.assistantId?.slice(0,8) ?? 'DEFAULT'} name="${runtimeConfig.assistantName ?? 'fallback'}" model=${runtimeConfig.provider ?? 'groq'}/${runtimeConfig.model ?? 'llama-3.1-8b-instant'} instr=${runtimeConfig.instructions ? Math.round(runtimeConfig.instructions.length/4)+' tkn' : 'NONE'} rag=${runtimeConfig.vectorStoreIds?.length ?? 0}`);

            // 5. Fetch + convert conversation history to semantic ConversationMessage[]
            const rawHistory = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(desc(messages.createdAt))
                .limit(MAX_HISTORY_MESSAGES);

            rawHistory.reverse(); // Chronological order

            const conversationHistory: ConversationMessage[] = rawHistory
                .map(msg => {
                    const text = (msg.content as any)?.text as string | undefined;
                    if (!text) return null;
                    const role: 'user' | 'assistant' | 'system' =
                        msg.generatedBy === 'ai' || msg.senderAccountId === accountId ? 'assistant' : 'user';
                    return { role, content: text, createdAt: msg.createdAt };
                })
                .filter(Boolean) as ConversationMessage[];

            const lastMsg = conversationHistory[conversationHistory.length - 1];
            console.log(`[FluxPipeline] 📜 HISTORY n=${conversationHistory.length} last=${lastMsg?.role ?? 'none'} sender=${lastMsg ? rawHistory[rawHistory.length-1]?.senderAccountId?.slice(0,7) : '-'}`);

            // 6. Start typing keepalive (before invoking runtime)
            const typingKeepAlive = this.startTypingKeepAlive(conversationId, accountId);

            try {
                // 7. Build RuntimeInput (Canon §4.5: complete pre-resolved context)
                const input: RuntimeInput = {
                    policyContext,
                    runtimeConfig,
                    conversationHistory,
                };

                const runtimeId = policyContext.activeRuntimeId;

                // 8. Invoke runtime via gateway
                const actions = await runtimeGateway.invoke(runtimeId, input);

                typingKeepAlive.stop();

                // 9. Execute actions via ActionExecutor (Canon §4.8: mediated effects)
                if (policyContext.mode === 'auto') {
                    await actionExecutor.execute(actions, {
                        turnId,
                        conversationId,
                        accountId,
                        authorizedTemplates: policyContext.authorizedTemplates,
                    });
                } else if (policyContext.mode === 'suggest') {
                    const suggestion = actions.find(a => a.type === 'send_message') as any;
                    if (suggestion?.content) {
                        console.log(`[FluxPipeline] 💬 SUGGEST conv=${conversationId.slice(0,7)} content="${suggestion.content.slice(0,80)}"`);
                        
                        // Persist suggestion for operator review
                        await db.insert(aiSuggestions).values({
                            conversationId,
                            accountId,
                            content: suggestion.content,
                            model: runtimeConfig.model || 'unknown',
                            provider: runtimeConfig.provider || 'unknown',
                            status: 'pending',
                        });
                    }
                    await actionExecutor.closeTurn(turnId, accountId);
                }

                return {
                    actions,
                    runtimeUsed: runtimeId,
                    durationMs: Date.now() - startTime,
                    success: true,
                };
            } finally {
                typingKeepAlive.stop();
            }

        } catch (error: any) {
            console.error(`[CognitiveDispatcher] ❌ Dispatch failed for conversation ${conversationId}:`, error.message);
            return this.failResult(error.message, startTime);
        }
    }

    private readonly TYPING_PULSE_MS = 3000;

    private startTypingKeepAlive(conversationId: string, accountId: string): { stop: () => void } {
        let stopped = false;
        let timer: ReturnType<typeof setInterval> | null = null;

        const pulse = () => {
            if (stopped) return;
            actionExecutor.execute(
                [{ type: 'start_typing', conversationId }],
                { turnId: 0, conversationId, accountId, authorizedTemplates: [] }
            ).catch(err => {
                console.warn(`[CognitiveDispatcher] Typing pulse error:`, err.message);
            });
        };

        pulse();
        timer = setInterval(pulse, this.TYPING_PULSE_MS);

        return {
            stop: () => {
                if (stopped) return;
                stopped = true;
                if (timer) { clearInterval(timer); timer = null; }
                console.log(`[CognitiveDispatcher] ⌨️ Typing stopped for ${conversationId}`);
            }
        };
    }

    private failResult(error: string, startTime: number): DispatchResult {
        return {
            actions: [{ type: 'no_action', reason: error }],
            runtimeUsed: 'none',
            durationMs: Date.now() - startTime,
            success: false,
            error,
        };
    }
}

export const cognitiveDispatcher = new CognitiveDispatcherService();
