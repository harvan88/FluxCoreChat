
import { coreEventBus } from '../core/events';
import { messageCore } from '../core/message-core';
import { extensionHost } from './extension-host.service';
import type { MessageEnvelope, ReceiveResult } from '../core/types';
import { logTrace } from '../utils/file-logger';
import { flowRegistryService, executeFlow, type ExecutorDependencies, type TriggerData } from './agent-runtime';
import { fluxPolicyContextService } from './flux-policy-context.service';
import type { FluxPolicyContext } from '@fluxcore/db';

/**
 * AI Orchestrator Service
 * Responsable de coordinar las respuestas automáticas de la IA escuchando eventos del Core.
 * Reemplaza la lógica hardcodeada en MessageCore.
 */
class AIOrchestratorService {
    private autoReplyQueue: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        coreEventBus.on('core:message_received', (payload) => {
            // Ejecutar en background para no bloquear el Event Loop síncrono si hubiera
            this.handleMessageReceived(payload).catch(err =>
                console.error('[AIOrchestrator] Error handling message:', err)
            );
        });

        console.log('[AIOrchestrator] Service initialized and listening');
    }

    private async handleMessageReceived(payload: { envelope: MessageEnvelope; result: ReceiveResult }) {
        try {
            require('fs').appendFileSync('AI_TEST.log', `[${new Date().toISOString()}] AIOrchestrator received message: ${payload.envelope.id}\n`);
        } catch { }
        console.log(`[AIOrchestrator] 📨 RECEIVED MESSAGE: ${payload.envelope.id} content: ${JSON.stringify(payload.envelope.content)}`);
        const { envelope, result } = payload;

        // 1. Validaciones básicas: éxito en la persistencia del Core
        if (!result.success || !result.messageId) {
            logTrace(`⏹️ AIOrchestrator: Ignoring (Message receive/persistence failed).`);
            return;
        }

        // Asegurar que el envelope tenga el ID persistido para downstream
        envelope.id = result.messageId;

        // 2. Validar contenido textual
        const messageText = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
        if (!messageText || messageText.trim().length === 0) {
            // Si no hay texto, tal vez sea un audio pendiente de enriquecer. NO hacemos nada aquí.
            const hasAudio = (envelope.content?.media || []).some((m: any) =>
                m.type === 'audio' || (m.mimeType && m.mimeType.startsWith('audio/'))
            );

            if (hasAudio) {
                logTrace(`⏳ AIOrchestrator: No text but Audio detected. Waiting for MediaEnrichment event...`);
            } else {
                logTrace(`⏹️ AIOrchestrator: Ignoring (Empty text and no audio detected).`);
            }
            return;
        }

        // 3. Obtener Account ID Objetivo y Relationship
        const targetAccountId = envelope.targetAccountId;
        if (!targetAccountId) {
            logTrace(`❌ AIOrchestrator ABORT: Missing targetAccountId.`);
            return;
        }

        const { conversationService } = await import('./conversation.service');
        const { automationController } = await import('./automation-controller.service');

        const conv = await conversationService.getConversationById(envelope.conversationId);
        if (!conv) {
            logTrace(`❌ AIOrchestrator ABORT: Conversation ${envelope.conversationId} not found.`);
            return;
        }
        const relationshipId = conv.relationshipId;


        const automationMode = await automationController.getMode(targetAccountId, relationshipId);

        // Canon v7.0: Resolve PolicyContext ONCE before any runtime invocation
        const policyContext = await fluxPolicyContextService.resolve({
            accountId: targetAccountId,
            relationshipId: relationshipId ?? undefined,
            automationMode,
        });

        logTrace(`[AIOrchestrator] PolicyContext resolved: runtime=${policyContext.activeRuntimeId}, mode=${policyContext.automation.mode}, tone=${policyContext.attention.tone}`);

        const extensionResults = await extensionHost.processMessage({

            accountId: targetAccountId,
            relationshipId,
            conversationId: envelope.conversationId,
            message: {
                id: envelope.id,
                content: envelope.content,
                type: envelope.type,
                senderAccountId: envelope.senderAccountId,
            },
            automationMode,
            policyContext,
        });

        // Si una extensión (como WES) detuvo la propagación, la IA de charla se retira.
        const isStopped = extensionResults.some(r => r.stopPropagation);
        if (isStopped) {
            logTrace(`⏹️ AIOrchestrator: Propagation stopped by extension (System/WES/Domain).`);
            return;
        }

        // 5. EVALUAR TRIGGER DE AUTOMATIZACIÓN IA
        const messageTypeForTarget: 'incoming' | 'outgoing' | 'system' =
            envelope.senderAccountId === targetAccountId ? 'outgoing' : 'incoming';

        if (envelope.generatedBy === 'ai') {
            logTrace(`⏹️ AIOrchestrator: Message generated by AI, skipping conversational automation.`);
            return;
        }

        const automationResult = await automationController.evaluateTrigger({
            accountId: targetAccountId,
            relationshipId: relationshipId,
            messageContent: messageText,
            messageType: messageTypeForTarget,
            senderId: envelope.senderAccountId,
        });

        if (!automationResult.shouldProcess) {
            logTrace(`⏹️ AIOrchestrator: Automation result says NO (Reason: ${automationResult.reason}).`);
            return;
        }

        logTrace(`📨 AIOrchestrator Proceeding with mode: ${automationResult.mode}`);

        // WOS-100: Canonical Routing Logic (Interpretation)
        // -------------------------------------------------------------

        // 1. Strict Runtime Separation (Soberanía de Runtime - Dimensión 1)
        const { runtimeConfigService } = await import('./runtime-config.service');
        const runtimeConfig = await runtimeConfigService.getRuntime(targetAccountId);
        const configuredRuntime = runtimeConfig.activeRuntimeId;

        logTrace(`[AIOrchestrator] Active Runtime for ${targetAccountId}: ${configuredRuntime}`);

        // ONLY attempt WES interpretation if explicitly configured as the runtime.
        if (configuredRuntime === '@fluxcore/fluxi') {
            const interpreterMatch = await this.tryWesInterpretation(envelope, messageText, targetAccountId, automationResult.mode);
            if (interpreterMatch) return;
        } else {
            logTrace(`[AIOrchestrator] ⏭️ WES Interpretation skipped (Runtime is ${configuredRuntime}).`);
        }

        // 4. Si no hubo match de WES, aplicar reglas de Charla (Chat)
        if (automationResult.mode !== 'automatic') {
            logTrace(`⏹️ AIOrchestrator: Ignoring Chat (Mode is ${automationResult.mode}).`);
            return;
        }

        // 5. Programar respuesta de Chat
        logTrace(`✅ AIOrchestrator: Scheduling Auto-Reply for Account ${targetAccountId}`);
        this.scheduleAutoReply(envelope, messageText, targetAccountId, automationResult.mode, envelope.id, policyContext);
    }

    private async tryWesInterpretation(
        envelope: MessageEnvelope,
        messageText: string,
        targetAccountId: string,
        automationMode: string
    ): Promise<boolean> {
        try {
            const { wesInterpreterService } = await import('../../../../extensions/fluxcore-fluxi/src/interpreter');
            const { workEngineService } = await import('./work-engine.service');

            const proposedAnalysis = await wesInterpreterService.interpret(
                targetAccountId,
                envelope.conversationId,
                messageText
            );

            if (proposedAnalysis) {
                logTrace(`[AIOrchestrator] 🧠 Intent Detected: ${proposedAnalysis.intent} (${proposedAnalysis.confidence})`);

                // 1. Persistir Propuesta
                const proposed = await workEngineService.proposeWork({
                    accountId: targetAccountId,
                    conversationId: envelope.conversationId,
                    traceId: envelope.id || `intent-${Date.now()}`,
                    workDefinitionId: proposedAnalysis.workDefinitionId,
                    intent: proposedAnalysis.intent,
                    candidateSlots: proposedAnalysis.candidateSlots,
                    confidence: proposedAnalysis.confidence,
                    modelInfo: { model: 'llama-3.1-8b-instant', provider: 'groq' }
                });

                // 2. Si el modo es automático, ABRIR TRABAJO (Zero-Click)
                if (automationMode === 'automatic') {
                    logTrace(`[AIOrchestrator] 📦 Proposal Persisted: ${proposed.id}. Opening work automatically...`);
                    const openedWork = await workEngineService.openWork(targetAccountId, proposed.id);

                    await messageCore.send({
                        conversationId: envelope.conversationId,
                        senderAccountId: targetAccountId,
                        content: { text: `Entendido. Iniciando trabajo: ${proposedAnalysis.intent}...` },
                        type: 'outgoing',
                        generatedBy: 'system',
                        targetAccountId: envelope.senderAccountId,
                    });

                    logTrace(`[AIOrchestrator] ✅ Work Opened via Interpreter: ${openedWork.id}`);
                    return true;
                }

                logTrace(`[AIOrchestrator] 📦 Proposal Persisted: ${proposed.id}. Handing over to Agent Runtime (Mode: ${automationMode}).`);

                // CRITICAL ARCHITECTURE FIX:
                // In supervised mode, WES proposes but does NOT execute. 
                // We MUST return 'false' to allow the Agent Runtime to generate a conversational response 
                // (e.g., "I've prepared a draft for X, suds you like to proceed?").
                // WES only "takes control" (returns true) if it actually opens/executes the work.
                return false;
            }
        } catch (error: any) {
            console.error('[AIOrchestrator] Interpreter error:', error);
        }
        return false;
    }

    private async scheduleAutoReply(
        envelope: MessageEnvelope,
        messageText: string,
        targetAccountId: string,
        automationMode: 'automatic' | 'supervised' | 'disabled',
        triggerMessageId?: string,
        policyContext?: FluxPolicyContext,
    ) {
        const debounceKey = envelope.conversationId;

        // Cancelar timer anterior si existe (debounce)
        const existingTimeout = this.autoReplyQueue.get(debounceKey);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.autoReplyQueue.delete(debounceKey);
        }

        // Configuración de delay
        const aiMode = automationMode === 'automatic' ? 'auto' : 'suggest';
        let delayMs = 2000; // Default
        try {
            delayMs = await extensionHost.getAIAutoReplyDelayMs(targetAccountId);
        } catch (error) {
            console.warn('[AIOrchestrator] Failed to get delay config, using default:', error);
        }

        // Programar ejecución
        const timeout = setTimeout(async () => {
            try {
                // ── Try multi-agent flows first (Fase 3) ────────────────
                const agentOutput = await this.tryAgentFlows(
                    targetAccountId,
                    envelope.conversationId,
                    messageText,
                    triggerMessageId,
                    envelope.senderAccountId,
                );

                if (agentOutput) {
                    logTrace(`[AIOrchestrator] 🤖 Agent flow produced output, sending...`);
                    await messageCore.send({
                        conversationId: envelope.conversationId,
                        senderAccountId: targetAccountId,
                        content: { text: agentOutput },
                        type: 'outgoing',
                        generatedBy: 'ai',
                        targetAccountId: envelope.senderAccountId,
                    });
                    logTrace(`[AIOrchestrator] ✅ Agent flow response SENT.`);
                    return;
                }

                // ── Fall through to single-agent path ───────────────────

                logTrace(`[AIOrchestrator] 🤖 Triggering AI Generation for conversation ${envelope.conversationId}`);
                const result = await extensionHost.generateAIResponse(
                    envelope.conversationId,
                    targetAccountId,
                    messageText,
                    {
                        mode: aiMode,
                        triggerMessageId: triggerMessageId,
                        triggerMessageCreatedAt: envelope.timestamp || new Date(),
                        traceId: triggerMessageId,
                        policyContext,
                    }
                );

                // ── Blocked: notify account owner via WebSocket and send fallback message to user if appropriate ──
                if (!result.ok) {
                    logTrace(`[AIOrchestrator] 🚫 BLOCKED: ${result.block.reason} — ${result.block.message}`);

                    // 1. WebSocket for the account owner/UI
                    const payload = {
                        type: 'ai:execution_blocked',
                        data: {
                            conversationId: envelope.conversationId,
                            accountId: targetAccountId,
                            block: result.block,
                        },
                    };
                    await messageCore.broadcastToConversation(envelope.conversationId, payload);

                    // 2. Persistent message for the user if it's a credit or provider issue
                    if (result.block.reason === 'insufficient_credits' || result.block.reason === 'no_providers') {
                        await messageCore.send({
                            conversationId: envelope.conversationId,
                            senderAccountId: targetAccountId,
                            content: {
                                text: result.block.message,
                                __fluxcore: { blocked: true, reason: result.block.reason }
                            } as any,
                            type: 'outgoing',
                            generatedBy: 'system',
                            targetAccountId: envelope.senderAccountId
                        });
                    }

                    return;
                }

                // ── Success with content ────────────────────────────────
                const suggestion = result.suggestion;
                if (suggestion?.content) {
                    const stripped = extensionHost.stripFluxCorePromoMarker(suggestion.content);
                    const finalText = stripped.promo
                        ? extensionHost.appendFluxCoreBrandingFooter(stripped.text)
                        : stripped.text;

                    const content: any = stripped.promo
                        ? { text: finalText, __fluxcore: { branding: true } }
                        : { text: finalText };

                    await messageCore.send({
                        conversationId: envelope.conversationId,
                        senderAccountId: targetAccountId,
                        content: content as any,
                        type: 'outgoing',
                        generatedBy: 'ai',
                        targetAccountId: envelope.senderAccountId
                    });

                    // WES-170: Si la IA propuso un trabajo, persistir propuesta y luego abrirlo formalmente
                    if (suggestion.proposedWork) {
                        const { workEngineService } = await import('./work-engine.service');

                        logTrace(`[AIOrchestrator] 📦 Proposing Work: ${suggestion.proposedWork.workDefinitionId}`);

                        try {
                            // 1. Persistir la propuesta
                            const proposed = await workEngineService.proposeWork({
                                accountId: targetAccountId,
                                conversationId: envelope.conversationId,
                                traceId: suggestion.proposedWork.traceId || suggestion.traceId || 'ai-auto',
                                workDefinitionId: suggestion.proposedWork.workDefinitionId,
                                intent: suggestion.proposedWork.intent,
                                candidateSlots: suggestion.proposedWork.candidateSlots,
                                confidence: suggestion.proposedWork.confidence,
                                modelInfo: { model: suggestion.model, provider: suggestion.provider }
                            });

                            logTrace(`[AIOrchestrator] 📦 Proposal Persisted: ${proposed.id}. Opening work...`);

                            // 2. Abrir el trabajo formalmente
                            const openedWork = await workEngineService.openWork(targetAccountId, proposed.id);
                            logTrace(`[AIOrchestrator] ✅ Work Opened: ${openedWork.id}`);
                        } catch (wesErr: any) {
                            console.error('[AIOrchestrator] Failed to process proposed work:', wesErr);
                            logTrace(`[AIOrchestrator] ❌ Failed to process proposed work: ${wesErr.message}`);
                        }
                    }

                    logTrace(`[AIOrchestrator] ✅ AI Response SENT.`);
                } else {
                    logTrace(`[AIOrchestrator] ⚠️ AI generated empty content.`);
                }
            } catch (err: any) {
                console.error('[AIOrchestrator] Error generating/sending reply:', err);
                logTrace(`❌ ERROR during AI execution: ${err.message}`);
            } finally {
                this.autoReplyQueue.delete(debounceKey);
            }
        }, delayMs);

        this.autoReplyQueue.set(debounceKey, timeout);
    }

    /**
     * Try to handle a message via active multi-agent flows.
     * Returns the final text output if an agent handled it, or null to fall through to single-agent.
     */
    private async tryAgentFlows(
        targetAccountId: string,
        conversationId: string,
        messageText: string,
        messageId?: string,
        senderAccountId?: string,
    ): Promise<string | null> {
        try {
            const activeAgents = await flowRegistryService.getActiveAgents(targetAccountId);
            if (activeAgents.length === 0) return null;

            // Find first agent whose trigger matches
            for (const agent of activeAgents) {
                const trigger = (agent.triggerConfig as any) || { type: 'message_received' };
                if (trigger.type !== 'message_received') continue;

                const flow = agent.flow as any;
                if (!flow?.steps || flow.steps.length === 0) continue;

                logTrace(`[AIOrchestrator] 🤖 Running agent flow "${agent.name}" (${agent.id})`);

                const triggerData: TriggerData = {
                    type: 'message_received',
                    content: messageText,
                    messageId,
                    conversationId,
                    senderAccountId,
                    recipientAccountId: targetAccountId,
                };

                // Build executor dependencies (lazy — actual LLM/RAG/Tool calls wired at execution time)
                const deps: ExecutorDependencies = {
                    accountId: targetAccountId,
                    callLLM: async (params) => {
                        // Use the FluxCore extension's direct LLM call via the loaded module
                        const { resolveExecutionPlan } = await import('./ai-execution-plan.service');
                        const plan = await resolveExecutionPlan(targetAccountId, conversationId);
                        if (!plan.canExecute) throw new Error(plan.block.message);

                        const providerOrder = params.providerOrder || plan.providerOrder;

                        // Load FluxCore module directly
                        const fluxMod = await import('../../../../extensions/fluxcore-asistentes/src/index');
                        const ext = typeof fluxMod.getFluxCore === 'function' ? fluxMod.getFluxCore() : null;
                        if (!ext || typeof ext.callLLM !== 'function') {
                            throw new Error('FluxCore extension not available for LLM calls');
                        }
                        return ext.callLLM({
                            model: params.model,
                            systemPrompt: params.systemPrompt,
                            messages: params.messages,
                            temperature: params.temperature,
                            maxTokens: params.maxTokens,
                            providerOrder,
                        });
                    },
                    searchKnowledge: async (params) => {
                        const { retrievalService } = await import('./retrieval.service');
                        const result = await retrievalService.search(
                            params.query,
                            params.vectorStoreIds,
                            params.accountId,
                            { topK: params.topK || 5, minScore: params.minScore || 0.3 },
                        );
                        return {
                            chunks: (result.chunks || []).map((c: any) => ({
                                content: c.content || '',
                                score: c.similarity || 0,
                                source: c.metadata?.documentTitle,
                            })),
                            totalTokens: result.totalTokens || 0,
                        };
                    },
                    executeTool: async (params) => {
                        const { aiToolService } = await import('./ai-tools.service');
                        const toolCall = {
                            id: `agent-tool-${Date.now()}`,
                            type: 'function' as const,
                            function: { name: params.toolName, arguments: JSON.stringify(params.input) },
                        };
                        try {
                            const result = await aiToolService.executeTool(toolCall, {
                                accountId: params.accountId,
                                conversationId,
                            });
                            return { output: result };
                        } catch (e: any) {
                            return { output: null, error: e?.message || 'Tool execution failed' };
                        }
                    },
                };

                const scopes = (agent.scopes as any) || {
                    allowedModels: [],
                    maxTotalTokens: 5000,
                    maxExecutionTimeMs: 30000,
                    allowedTools: [],
                    canCreateSubAgents: false,
                };

                const result = await executeFlow(flow, scopes, triggerData, deps, {
                    agentId: agent.id,
                    flowName: agent.name,
                    abortOnError: true,
                    maxSteps: 20,
                });

                logTrace(`[AIOrchestrator] Agent flow "${agent.name}" completed: success=${result.success}, steps=${result.steps.length}, tokens=${result.totalTokenUsage.total}`);

                if (result.success && result.output) {
                    const text = typeof result.output === 'string'
                        ? result.output
                        : result.output?.content || result.output?.text || JSON.stringify(result.output);
                    return text;
                }

                if (result.error) {
                    logTrace(`[AIOrchestrator] Agent flow error: ${result.error}`);
                }
            }
        } catch (err: any) {
            console.error('[AIOrchestrator] Agent flow execution error:', err?.message);
            logTrace(`[AIOrchestrator] ❌ Agent flow error: ${err?.message}`);
        }

        return null;
    }

    public init() {
        console.log('[AIOrchestrator] Explicit initialization called');
    }
}

export const aiOrchestrator = new AIOrchestratorService();
