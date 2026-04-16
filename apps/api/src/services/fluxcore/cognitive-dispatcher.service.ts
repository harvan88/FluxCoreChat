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

import { trace } from '@opentelemetry/api';
import { db, conversations, messages, aiSuggestions, fluxcoreCognitionQueue } from '@fluxcore/db';
import type { ConversationMessage } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import type { RuntimeInput, ExecutionAction } from '../../core/fluxcore-types';
import { fluxPolicyContextService } from '../flux-policy-context.service';
import { runtimeSelectionService } from '../runtime-selection.service';
import { runtimeCompositionService } from '../runtime-composition.service';
import { runtimeGateway } from './runtime-gateway.service';
import { actionExecutor } from './action-executor.service';
import { monitoringRegistry } from '../../telemetry/tracer';
import { aiTraceService } from '../ai-trace.service';
import { accountLabelService } from '../account-label.service';
import { runtimeInputFactoryService } from './runtime-input-factory.service';
import { aiTraceService } from '../ai-trace.service';
import { signCandidate } from './kernel-utils';
import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';

const MAX_HISTORY_MESSAGES = 50;
const COGNITIVE_GATEWAY_SIGNING_SECRET = 'sovereign-secret-key-change-me-in-prod';

export interface DispatchResult {
    actions: ExecutionAction[];
    runtimeUsed: string;
    durationMs: number;
    success: boolean;
    error?: string;
    stopped?: boolean; // Nuevo campo para stop propagation
}

const toSafeJson = (value: unknown) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return {
            _serializationError: 'non-serializable-value',
            preview: String(value),
        };
    }
};

const summarizeActions = (actions: ExecutionAction[]): string | undefined => {
    const summary = actions
        .map((action) => {
            const typedAction = action as any;

            if (action.type === 'send_message') {
                return `[send_message] ${typedAction.content || ''}`;
            }

            if (action.type === 'send_template') {
                return `[send_template] ${typedAction.templateId || ''}`;
            }

            if (action.type === 'no_action') {
                return `[no_action] ${typedAction.reason || ''}`;
            }

            return `[${action.type}]`;
        })
        .join('\n');

    return summary || undefined;
};

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
            
            // 🆕 PASAR VISITOR TOKEN COMO FALLBACK PARA VISITANTES
            const contactId = conversation?.relationshipId || conversation?.visitorToken || '';
            console.log(`[CognitiveDispatcher] 🎯 ContactId resolved: ${contactId} (relationshipId: ${conversation?.relationshipId}, visitorToken: ${conversation?.visitorToken})`);
            
            const policyContext = await fluxPolicyContextService.resolvePolicyContext({
                accountId,
                conversationId,
                contactId,
                channel: (conversation as any)?.channel || 'web',
            });
            const accountLabel = await accountLabelService.getLabel(accountId);
            const runtimeSelection = await runtimeSelectionService.resolve(accountId);
            console.log(`[CognitiveDispatcher] ✓ Context resolved: mode=${policyContext.mode}`);
            console.log(`[CognitiveDispatcher] ✓ RuntimeSelection resolved: strategy=${runtimeSelection.strategy} state=${runtimeSelection.state} activeRuntimeId=${runtimeSelection.activeRuntimeId}`);

            // 🎯 REALIDAD (Soberanía): Certificar Contexto Resuelto
            try {
                const evidence: Evidence = {
                    raw: { 
                        runtimeId: runtimeSelection.activeRuntimeId,
                        strategy: runtimeSelection.strategy,
                        mode: policyContext.mode,
                        injectedContext: {
                            authorizedTemplates: policyContext.authorizedTemplates?.length || 0,
                            contactRules: policyContext.contactRules?.length || 0,
                            businessProfile: !!policyContext.resolvedBusinessProfile,
                            templateList: (policyContext.resolvedBusinessProfile as any).templates?.map((t: any) => t.name) || []
                        }
                    },
                    format: 'json',
                    provenance: {
                        driverId: 'fluxcore/cognition',
                        externalId: `disp-${params.lastSignalSeq || Date.now()}`,
                        entryPoint: 'cognitive-dispatcher',
                    },
                    claimedOccurredAt: new Date().toISOString(),
                };

                const candidate: KernelCandidateSignal = {
                    factType: 'COGNITIVE_STEP_OBSERVED',
                    source: { namespace: '@fluxcore/cognition', key: 'dispatcher' },
                    subject: { namespace: '@fluxcore/cognition', key: accountId },
                    evidence,
                    certifiedBy: {
                        adapterId: 'cognitive-gateway',
                        adapterVersion: '1.0.0',
                        signature: ''
                    }
                };
                
                candidate.certifiedBy.signature = signCandidate(candidate, COGNITIVE_GATEWAY_SIGNING_SECRET);
                await kernel.ingestSignal(candidate);
            } catch (e) {
                console.error(`[CognitiveDispatcher] Failed to certify dispatcher step:`, e);
            }

            // 3. Automation mode gate (governed by PolicyContext)
            console.log(`[FluxPipeline] 📋 POLICY mode=${policyContext.mode} account=${accountLabel} (${accountId.slice(0, 7)})`);
            if (policyContext.mode === 'off' || runtimeSelection.state === 'inactive') {
                const reason = policyContext.mode === 'off'
                    ? 'Automation mode is off'
                    : (runtimeSelection.reason || 'Runtime strategy is inactive');
                console.log(`[FluxPipeline] ⛔ STOP  account=${accountLabel} (${accountId.slice(0, 7)}) → ${reason}`);
                // CRITICAL: Close the turn so it doesn't block future messages
                await actionExecutor.closeTurn(turnId, accountId);
                return {
                    actions: [{ type: 'no_action', reason }],
                    runtimeUsed: 'none',
                    durationMs: Date.now() - startTime,
                    success: true,
                };
            }

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
                const { runtimeId, runtimeConfig: enrichedRuntimeConfig } = await runtimeCompositionService.resolve({
                    accountId,
                    conversationId,
                    selection: runtimeSelection,
                });

                console.log(`[CognitiveDispatcher] Runtime selection: ${runtimeSelection.activeRuntimeId} → Runtime: ${runtimeId}`);
                console.log(`[FluxPipeline] 🤖 ASSIST id=${enrichedRuntimeConfig.assistantId?.slice(0, 8) ?? 'DEFAULT'} name="${enrichedRuntimeConfig.assistantName ?? 'fallback'}" model=${enrichedRuntimeConfig.provider ?? 'groq'}/${enrichedRuntimeConfig.model ?? 'llama-3.1-8b-instant'} instr=${enrichedRuntimeConfig.instructions ? Math.round(enrichedRuntimeConfig.instructions.length / 4) + ' tkn' : 'NONE'} rag=${enrichedRuntimeConfig.vectorStoreIds?.length ?? 0}`);
                // 🎯 Identidad de Turno (v10.0)
                const messageId = String(params.lastSignalSeq || turnId);

                const input: RuntimeInput = await runtimeInputFactoryService.build({
                    accountId,
                    conversationId,
                    runtimeId,
                    policyContext,
                    runtimeConfig: enrichedRuntimeConfig,
                    conversationHistory,
                    lastUserMessage: lastMsg?.content,
                });

                // 🎯 Propagar Identidad de Turno (v10.0)
                input.executionId = messageId;

                // 8. Invoke runtime via gateway (AHORA TOTALMENTE VISIBLE)
                console.log(`[CognitiveDispatcher] Step 8: Invoking runtime '${runtimeId}'...`);
                
                // 🎯 TELEMETRÍA (Fase 1: Runtime Start)
                try {
                    const { coreEventBus } = await import('../../core/events');
                    coreEventBus.emit('telemetry:pipeline_step', {
                        messageId,
                        conversationId,
                        accountId,
                        step: 'runtime',
                        status: 'processing',
                        metadata: { runtimeId },
                        timestamp: new Date().toISOString()
                    });
                } catch (e) {}

                // 🎯 TELEMETRÍA OPENTELEMETRY: Captura del Payload Crudo (Plantillas + Historial)
                const { trackCognitiveStep } = await import('../../telemetry/tracer');
                const runtimeStartedAtMs = Date.now();
                let initialTraceId: string | undefined;
                
                const actions = await trackCognitiveStep(
                    'IA_RUNTIME_INVOCATION',
                    {
                        'account.id': accountId,
                        'conversation.id': conversationId,
                        'model': input.runtimeConfig.model || 'unknown_model',
                        'runtime.id': runtimeId,
                    },
                    input,
                    async () => {
                        const span = trace.getActiveSpan();
                        initialTraceId = span?.spanContext().traceId;
                        return await runtimeGateway.invoke(runtimeId, input, params.lastSignalSeq || undefined);
                    },
                    messageId // 🎯 VÍNCULO DETERMINISTA (v10.0)
                );

                // 🎯 TELEMETRÍA (Fase 1: Runtime Success)
                try {
                    const { coreEventBus } = await import('../../core/events');
                    coreEventBus.emit('telemetry:pipeline_step', {
                        messageId,
                        conversationId,
                        accountId,
                        step: 'runtime',
                        status: 'success',
                        metadata: { runtimeId, traceId: initialTraceId },
                        timestamp: new Date().toISOString()
                    });
                } catch (e) {}
                
                console.log(`[CognitiveDispatcher] ✅ Turn complete. TraceID: ${initialTraceId}. Actions: ${actions.length}`);
                actions.forEach((action, i) => {
                    console.log(`  [${i}] type=${action.type}${action.type === 'send_message' ? ` content="${(action as any).content?.slice(0,50)}..."` : ''}`);
                });

                typingKeepAlive.stop();

                // Persistencia automática desactivada (v14.2)

                // ── SUGGEST GATE ──────────────────────────────────────────
                // Canon §4.9: In suggest mode, save suggestion for operator
                // review and return early. NEVER execute actions automatically.
                // ──────────────────────────────────────────────────────────
                if (policyContext.mode === 'suggest') {
                    console.log(`[CognitiveDispatcher] 🤝 SUGGEST MODE: Saving suggestion, NOT executing actions`);
                    const sendAction = actions.find(a => a.type === 'send_message') as any;

                    if (sendAction?.content) {
                        console.log(`[FluxPipeline] 💬 SUGGEST conv=${conversationId.slice(0, 7)} content="${sendAction.content.slice(0, 80)}"`);

                        // Persist suggestion for operator review
                        await db.insert(aiSuggestions).values({
                            conversationId,
                            accountId,
                            content: sendAction.content,
                            model: enrichedRuntimeConfig.model || 'unknown',
                            provider: enrichedRuntimeConfig.provider || 'unknown',
                            status: 'pending',
                        });
                    }

                    // Close turn so CognitionWorker doesn't re-pick it
                    await actionExecutor.closeTurn(turnId, accountId);

                    // Telemetry
                    try {
                        const { coreEventBus } = await import('../../core/events');
                        coreEventBus.emit('telemetry:pipeline_step', {
                            messageId: String(params.lastSignalSeq || turnId),
                            conversationId,
                            accountId,
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
                }
                // ── END SUGGEST GATE ──────────────────────────────────────

                // 9. Execute actions via ActionExecutor (Canon §4.8: mediated effects)
                // Only AUTO mode reaches here (OFF already returned above)
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
                    targetAccountId: queueEntry?.targetAccountId || 'unknown',
                    runtimeId,
                    policyContext,
                    runtimeConfig: input.runtimeConfig,
                    triggerSignalId: params.lastSignalSeq || undefined,
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

                // 🎯 TELEMETRÍA (Fase 1): Soberanía verificada
                try {
                    const { coreEventBus } = await import('../../core/events');
                    coreEventBus.emit('telemetry:pipeline_step', {
                        messageId: String(params.lastSignalSeq || turnId),
                        conversationId,
                        accountId,
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
                // 🎯 LIMPIEZA DE MEMORIA SILENCIOSA (v14.2)
                try {
                    const { cognitiveCollector } = await import('../../telemetry/tracer');
                    if (initialTraceId) cognitiveCollector.clear(initialTraceId);
                    if (messageId) cognitiveCollector.clear(messageId);
                } catch (e) {
                    console.warn('[CognitiveDispatcher] 🧹 Remote cleanup failed (non-critical):', e);
                }
            }

        } catch (error: any) {
            console.error(`[CognitiveDispatcher] ❌ Dispatch failed for conversation ${conversationId}:`, error.message);
            return this.failResult(error.message, startTime);
        }
    }

    private async persistPipelineTrace(params: {
        accountId: string;
        conversationId: string;
        runtimeId: string;
        mode: string;
        runtimeConfig: RuntimeInput['runtimeConfig'];
        runtimeInput: RuntimeInput;
        actions: ExecutionAction[];
        startedAtMs: number;
        traceId?: string;
    }): Promise<void> {
        const completedAt = new Date();
        const { cognitiveCollector } = await import('../../telemetry/tracer');
        
        // 🎯 RECUPERAR REALIDAD FÍSICA (FASES COGNITIVAS)
        // Usamos el traceId pasado explícitamente (v8.6) para evitar fragmentación
        const traceId = params.traceId;
        const cognitiveSteps = traceId ? cognitiveCollector.getSteps(traceId) : {};

        // 🎯 VÁLVULA DE PERSISTENCIA SELECTIVA (v13.1)
        if (!monitoringRegistry.isPersistenceEnabled(params.accountId)) {
            console.log(`[CognitiveDispatcher] 🔇 Persistence skipped for ${params.accountId} (Monitoring Valve: OFF)`);
            // Limpiar memoria igualmente antes de salir
            if (traceId) {
                cognitiveCollector.clear(traceId);
            }
            return;
        }

        try {
            await aiTraceService.persistTrace({
                accountId: params.accountId,
                conversationId: params.conversationId,
                runtime: params.runtimeId,
                provider: params.runtimeConfig.provider || 'unknown',
                model: params.runtimeConfig.model || 'unknown',
                mode: params.mode,
                startedAt: new Date(params.startedAtMs),
                completedAt,
                durationMs: completedAt.getTime() - params.startedAtMs,
                requestBody: toSafeJson(params.runtimeInput),
                requestContext: toSafeJson({
                    _cognitiveSteps: cognitiveSteps, // AQUÍ SE GUARDA LA REALIDAD FÍSICA
                    actionCount: params.actions.length,
                    actionTypes: params.actions.map((action) => action.type),
                    actions: params.actions,
                }),
                responseContent: summarizeActions(params.actions),
            });
        } catch (err: any) {
            console.error(`[CognitiveDispatcher] ❌ Persistence failure: ${err.message}`);
        } finally {
            // 🎯 v8.8: LIMPIEZA DE MEMORIA DETERMINISTA
            // Se ejecuta SIEMPRE para evitar fugas de memoria (colapso del sistema)
            if (traceId) {
                cognitiveCollector.clear(traceId);
                console.log(`[CognitiveDispatcher] 🧹 Memory cleared for TraceID: ${traceId}`);
            }
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
