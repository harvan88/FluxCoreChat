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

import { db, conversations, messages, aiSuggestions, fluxcoreCognitionQueue } from '@fluxcore/db';
import type { ConversationMessage } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import type { RuntimeInput, ExecutionAction } from '../../core/fluxcore-types';
import { fluxPolicyContextService } from '../flux-policy-context.service';
import { runtimeGateway } from './runtime-gateway.service';
import { actionExecutor } from './action-executor.service';
import { accountLabelService } from '../account-label.service';
import { createFluxiRuntimeConfig } from './fluxi-dependency-injection';

const MAX_HISTORY_MESSAGES = 50;

export interface DispatchResult {
    actions: ExecutionAction[];
    runtimeUsed: string;
    durationMs: number;
    success: boolean;
    error?: string;
    stopped?: boolean; // Nuevo campo para stop propagation
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

        console.log(`[CognitiveDispatcher] 🎯 DISPATCH START: turnId=${turnId}, conv=${conversationId.slice(0, 8)}, account=${accountId.slice(0, 8)}`);
        
        // 🔍 LOG DEL INPUT EN COGNITIVE DISPATCHER
        console.log(`[CognitiveDispatcher] 🌍 INPUT EN COGNITIVE DISPATCHER:`);
        console.log(`📋 TURN ID:`, turnId);
        console.log(`📋 CONVERSATION ID:`, conversationId);
        console.log(`📋 ACCOUNT ID:`, accountId);
        console.log(`📋 LAST SIGNAL SEQ:`, params.lastSignalSeq);

        try {
            // 1. Resolve conversation + relationship
            console.log(`[CognitiveDispatcher] Step 1: Resolving conversation...`);
            const [conversation] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);

            if (!conversation) {
                return this.failResult('Conversation not found', startTime);
            }

            // 2. Resolve PolicyContext + RuntimeConfig (Unified in v8.3)
            console.log(`[CognitiveDispatcher] Step 2: Resolving PolicyContext + RuntimeConfig...`);
            const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
                accountId,
                conversation?.relationshipId || '',
                (conversation as any)?.channel || 'web'
            );
            policyContext.conversationId = conversationId;
            const accountLabel = await accountLabelService.getLabel(accountId);
            console.log(`[CognitiveDispatcher] ✓ Context resolved: mode=${policyContext.mode}`);

            // 3. Automation mode gate (governed by PolicyContext)
            console.log(`[FluxPipeline] 📋 POLICY mode=${policyContext.mode} account=${accountLabel} (${accountId.slice(0, 7)})`);
            if (policyContext.mode === 'off') {
                console.log(`[FluxPipeline] ⛔ OFF   account=${accountLabel} (${accountId.slice(0, 7)}) → automation disabled`);
                // CRITICAL: Close the turn so it doesn't block future messages
                await actionExecutor.closeTurn(turnId, accountId);
                return {
                    actions: [{ type: 'no_action', reason: 'Automation mode is off' }],
                    runtimeUsed: 'none',
                    durationMs: Date.now() - startTime,
                    success: true,
                };
            }
            console.log(`[FluxPipeline] 🤖 ASSIST id=${runtimeConfig.assistantId?.slice(0, 8) ?? 'DEFAULT'} name="${runtimeConfig.assistantName ?? 'fallback'}" model=${runtimeConfig.provider ?? 'groq'}/${runtimeConfig.model ?? 'llama-3.1-8b-instant'} instr=${runtimeConfig.instructions ? Math.round(runtimeConfig.instructions.length / 4) + ' tkn' : 'NONE'} rag=${runtimeConfig.vectorStoreIds?.length ?? 0}`);

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
                    const content = msg.content as any;
                    
                    // 🎯 Para mensajes de audio, usar una descripción si no hay texto
                    let text = content?.text as string | undefined;
                    
                    if (!text && content?.media?.length > 0) {
                        // Es un mensaje con media (audio/imagen)
                        const audioMedia = content.media.find((m: any) => m.type === 'audio');
                        if (audioMedia) {
                            text = `[Audio: ${audioMedia.name || 'audio'}]`;
                        } else {
                            text = `[Media: ${content.media.length} items]`;
                        }
                    }
                    
                    if (!text) return null;
                    
                    // Correct role assignment: only AI-generated messages are 'assistant'
                    const role: 'user' | 'assistant' | 'system' =
                        msg.generatedBy === 'ai' ? 'assistant' : 'user';
                    return { role, content: text, createdAt: msg.createdAt };
                })
                .filter(Boolean) as ConversationMessage[];

            const lastMsg = conversationHistory[conversationHistory.length - 1];
            console.log(`[FluxPipeline] 📜 HISTORY n=${conversationHistory.length} last=${lastMsg?.role ?? 'none'} sender=${lastMsg ? rawHistory[rawHistory.length - 1]?.senderAccountId?.slice(0, 7) : '-'}`);

            // 6. Start typing keepalive (before invoking runtime)
            const typingKeepAlive = this.startTypingKeepAlive(conversationId, accountId);

            try {
                // 7. Build RuntimeInput (Canon §4.5: complete pre-resolved context)
                // CORRECTO: Respetar selección del usuario desde RuntimeSwitcher
                const { runtimeConfigService } = await import('../runtime-config.service');
                const runtimeConfig = await runtimeConfigService.getRuntime(accountId);
                const userSelection = runtimeConfig.activeRuntimeId;
                
                // Mapeo CORRECTO según selección del usuario
                let runtimeId: string;
                if (userSelection === '@fluxcore/fluxi') {
                    // Usuario seleccionó FLUXI → runtime directo
                    runtimeId = '@fluxcore/fluxi';
                } else if (userSelection === '@fluxcore/asistentes') {
                    // Usuario seleccionó ASISTENTES → usar asistente activo
                    const { fluxcoreService } = await import('../fluxcore.service');
                    const activeAssistant = await fluxcoreService.resolveActiveAssistant(accountId);
                    if (activeAssistant?.assistant?.runtime) {
                        const runtime = activeAssistant.assistant.runtime;
                        const map: Record<string, string> = {
                            'local': 'asistentes-local',
                            'openai': 'asistentes-openai',
                        };
                        runtimeId = map[runtime] ?? runtime;
                    } else {
                        runtimeId = 'asistentes-local'; // Default seguro
                    }
                } else {
                    // Default para cualquier otro caso
                    runtimeId = 'asistentes-local';
                }
                
                console.log(`[CognitiveDispatcher] User selection: ${userSelection} → Runtime: ${runtimeId}`);
                
                // 🔧 FIX: Enriquecer runtimeConfig con datos de ExecutionPlan para trazas
                let enrichedRuntimeConfig: any = runtimeConfig;
                if (runtimeId !== '@fluxcore/fluxi') {
                    // Para runtimes de asistentes, obtener model/provider del ExecutionPlan
                    try {
                        const { resolveExecutionPlan } = await import('../ai-execution-plan.service');
                        const executionPlan = await resolveExecutionPlan(accountId, conversationId);
                        if (executionPlan.canExecute) {
                            enrichedRuntimeConfig = {
                                ...runtimeConfig,
                                runtimeId,
                                model: executionPlan.model,
                                provider: executionPlan.provider,
                            };
                            console.log(`[CognitiveDispatcher] ✅ RuntimeConfig enriched: model=${executionPlan.model}, provider=${executionPlan.provider}`);
                        }
                    } catch (error) {
                        console.warn(`[CognitiveDispatcher] ⚠️ Could not enrich runtimeConfig with ExecutionPlan:`, error);
                    }
                } else {
                    // Para FLUXI, añadir runtimeId directamente
                    enrichedRuntimeConfig = {
                        ...runtimeConfig,
                        runtimeId,
                        model: 'fluxi',
                        provider: 'fluxi',
                    };
                    console.log(`[CognitiveDispatcher] ✅ FLUXI RuntimeConfig enriched: runtimeId=${runtimeId}`);
                }
                
                const input: RuntimeInput = {
                    policyContext,
                    runtimeConfig: runtimeId === '@fluxcore/fluxi' 
                        ? { ...enrichedRuntimeConfig, ...createFluxiRuntimeConfig(accountId) }
                        : enrichedRuntimeConfig,
                    conversationHistory,
                };

                // 8. Invoke runtime via gateway
                console.log(`[CognitiveDispatcher] Step 8: Invoking runtime '${runtimeId}'...`);
                console.log(`[CognitiveDispatcher] 📤 RUNTIME INPUT:`);
                console.log(`  - policyContext.mode: ${input.policyContext.mode}`);
                console.log(`  - runtimeConfig.assistantId: ${input.runtimeConfig.assistantId?.slice(0,8) || 'none'}`);
                console.log(`  - runtimeConfig.model: ${input.runtimeConfig.model || 'default'}`);
                console.log(`  - runtimeConfig.provider: ${input.runtimeConfig.provider || 'default'}`);
                console.log(`  - conversationHistory.length: ${input.conversationHistory.length}`);
                console.log(`  - last message role: ${input.conversationHistory[input.conversationHistory.length-1]?.role || 'none'}`);
                
                const actions = await runtimeGateway.invoke(runtimeId, input);
                
                console.log(`[CognitiveDispatcher] 📥 RUNTIME RETURNED ${actions.length} actions:`);
                actions.forEach((action, i) => {
                    console.log(`  [${i}] type=${action.type}${action.type === 'send_message' ? ` content="${(action as any).content?.slice(0,50)}..."` : ''}`);
                });

                typingKeepAlive.stop();

                // 9. Execute actions via ActionExecutor (Canon §4.8: mediated effects)
                console.log(`[CognitiveDispatcher] Step 9: Executing ${actions.length} actions via ActionExecutor (mode=${policyContext.mode})...`);
                
                // 10. Resolve targetAccountId from cognition_queue
                console.log(`[CognitiveDispatcher] 🔍 Looking up targetAccountId from cognition_queue...`);
                const [queueEntry] = await db
                    .select({ targetAccountId: fluxcoreCognitionQueue.targetAccountId })
                    .from(fluxcoreCognitionQueue)
                    .where(eq(fluxcoreCognitionQueue.id, turnId))
                    .limit(1);
                
                const executionData = await actionExecutor.execute(actions, {
                    turnId,
                    conversationId,
                    accountId,
                    targetAccountId: queueEntry?.targetAccountId || undefined,
                    runtimeId,
                    policyContext,
                    runtimeConfig: enrichedRuntimeConfig
                });

                // Verificar si se debe detener propagación
                const stopped = executionData.results.some(result => 
                    result.action.type === 'propose_work' || 
                    result.action.type === 'advance_work_state'
                );

                if (stopped) {
                    console.log(`[CognitiveDispatcher] 🛑 Stop propagation activated by ${runtimeId}`);
                    return {
                        actions,
                        runtimeUsed: runtimeId,
                        durationMs: Date.now() - startTime,
                        success: true,
                        stopped: true
                    };
                }

                if (policyContext.mode === 'suggest') {
                    console.log(`[CognitiveDispatcher] 🤝 MANUAL MODE: Creating suggestion for operator review`);
                    const suggestion = actions.find(a => a.type === 'send_message') as any;
                    if (suggestion?.content) {
                        console.log(`[FluxPipeline] 💬 SUGGEST conv=${conversationId.slice(0, 7)} content="${suggestion.content.slice(0, 80)}"`);

                        // Persist suggestion for operator review
                        await db.insert(aiSuggestions).values({
                            conversationId,
                            accountId,
                            content: suggestion.content,
                            model: enrichedRuntimeConfig.model || 'unknown',
                            provider: enrichedRuntimeConfig.provider || 'unknown',
                            status: 'pending',
                        });
                    }
                    await actionExecutor.closeTurn(turnId, accountId);
                }

                // 🎯 TELEMETRÍA (Fase 1): Soberanía verificada
                try {
                    const { coreEventBus } = await import('../../core/events');
                    coreEventBus.emit('telemetry:pipeline_step', {
                        messageId: String(turnId),
                        conversationId,
                        step: 'dispatcher',
                        status: 'success',
                        metadata: { runtimeId },
                        timestamp: new Date().toISOString()
                    });
                } catch (e) {}

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
                { turnId: 0, conversationId, accountId, runtimeId: 'internal' }
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
