
import { coreEventBus } from '../core/events';
import { messageCore } from '../core/message-core';
import type { MessageEnvelope, ReceiveResult } from '../core/types';
import { logTrace } from '../utils/file-logger';
import { fluxPolicyContextService } from './flux-policy-context.service';
import type { ExecutionAction } from './runtime-gateway.service';
import { runtimeGateway } from './runtime-gateway.service';
import { extensionHost } from './extension-host.service';
import { featureFlags } from '../config/feature-flags';
import { db, fluxcoreCognitionQueue } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import { accountLabelService } from './account-label.service';

/**
 * MessageDispatchService — backend como transporte sin agencia.
 * Recibe eventos del Core, resuelve PolicyContext y delega TODO al runtime.
 * El backend solo ejecuta side-effects explícitos retornados por el runtime.
 */
class MessageDispatchService {
    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        coreEventBus.on('core:message_received', (payload) => {
            this.handleMessageReceived(payload).catch((err) =>
                console.error('[MessageDispatch] Error handling message:', err)
            );
        });

        console.log('[MessageDispatch] Service initialized and listening');
    }

    private async handleMessageReceived(payload: { envelope: MessageEnvelope; result: ReceiveResult }) {
        const { envelope, result } = payload;

        console.log(`[MessageDispatch] 🎬 handleMessageReceived called: conv=${envelope.conversationId.slice(0,7)}, success=${result.success}, msgId=${result.messageId?.slice(0,8)}`);
        
        // 🔍 LOG DEL INPUT INJECTADO POR FLUXCORE
        console.log(`[MessageDispatch] 🌍 INPUT INJECTADO POR FLUXCORE:`);
        console.log(`📋 ENVELOPE COMPLETO:`, JSON.stringify(envelope, null, 2));
        console.log(`📋 META DEL ENVELOPE:`, JSON.stringify(envelope.meta || {}, null, 2));
        console.log(`📋 CONTENT DEL ENVELOPE:`, JSON.stringify(envelope.content, null, 2));

        if (!result.success || !result.messageId) {
            console.log(`[MessageDispatch] ⏭️  SKIP: result not successful or no messageId`);
            return; // AI-generated or typing — no re-dispatch
        }

        envelope.id = result.messageId;

        const targetAccountId = envelope.targetAccountId;
        const targetLabel = await accountLabelService.getLabel(targetAccountId || '');
        const safeTargetId = targetAccountId ? targetAccountId.slice(0, 7) : 'NONE';
        console.log(`[MessageDispatch] 🎯 targetAccount: ${targetLabel} (${safeTargetId})`);
        if (!targetAccountId) {
            console.log(`[MessageDispatch] ⏭️  SKIP: No targetAccountId`);
            return; // No target (AI emission without target) — skip
        }

        const { conversationService } = await import('./conversation.service');
        const conversation = await conversationService.getConversationById(envelope.conversationId);
        if (!conversation) {
            console.log(`❌ [MessageDispatch] ABORT: Conversation ${envelope.conversationId} not found.`);
            return;
        }

        // 🛡️ PROTECTION: Skip AI processing for internal/self channels
        // 🔑 USAR ROUTING DEFINIDO POR CHATCORE WORLD DEFINER
        // Nota: worldContext vendría de conversation.meta si está disponible
        const routing = { requiresAi: true, skipProcessing: false }; // Temporal hasta que worldContext esté en conversation
        
        if (routing.skipProcessing || conversation.channel === 'internal' || conversation.channel === 'test') {
            console.log(`[MessageDispatch] ⏭️  SKIP AI: channel=${conversation.channel}, routing.skipProcessing=${routing.skipProcessing} (WorldDefiner decision)`);
            return;
        }

        // 🛡️ PROTECTION: Skip AI if sender and target are the same (self-conversation)
        if (envelope.senderAccountId === targetAccountId) {
            console.log(`[MessageDispatch] ⏭️  SKIP AI: Self-conversation detected (sender=target=${targetAccountId.slice(0,7)})`);
            return;
        }

        // ChatProjector is the only component allowed to enqueue cognition turns per Canon v8.3.
        console.log(`[MessageDispatch] 🔍 NEW_ARCH=${featureFlags.fluxNewArchitecture}, conv=${envelope.conversationId.slice(0,7)}, target=${targetAccountId.slice(0,7)}`);

        const policyContext = await fluxPolicyContextService.resolve({
            accountId: targetAccountId, // 🔑 targetAccountId correcto desde resolveTargetAccount
            conversationId: envelope.conversationId,
            relationshipId: conversation.relationshipId ?? undefined,
            // 🔑 NO especificar channel - dejar que FluxPolicyContext lo resuelva
        });

        console.log(`[MessageDispatch] 🌍 POLICY CONTEXT RESUELTO POR FLUXCORE:`);
        console.log(`📋 POLICY CONTEXT COMPLETO:`, JSON.stringify(policyContext, null, 2));
        console.log(`📋 CHANNEL RESUELTO:`, policyContext.channel);
        console.log(`📋 SOURCE RESUELTO:`, policyContext.source);

        logTrace('[MessageDispatch] PolicyContext resolved.');

        if (!featureFlags.fluxNewArchitecture) {
            // 1. Extension Host Processing (Interceptors/Middleware)
            logTrace('[MessageDispatch] Invoking Extension Host (legacy path)...');
            const extensionResults = await extensionHost.processMessage({
                accountId: targetAccountId,
                relationshipId: conversation.relationshipId || '',
                conversationId: envelope.conversationId,
                message: {
                    id: envelope.id,
                    content: envelope.content,
                    type: envelope.type,
                    senderAccountId: envelope.senderAccountId,
                },
                policyContext,
                automationMode: result.automation?.mode,
            });

            // Execute actions from extensions
            let stopped = false;
            for (const res of extensionResults) {
                if (res.actions && res.actions.length > 0) {
                    logTrace(`[MessageDispatch] Executing actions from extension ${res.extensionId}`);
                    await this.executeActions(res.actions);
                }
                if (res.stopPropagation) {
                    logTrace(`[MessageDispatch] Propagation stopped by extension ${res.extensionId}`);
                    stopped = true;
                }
            }

            if (stopped) {
                return;
            }

            // 2. Runtime Gateway (Legacy Final Handler)
            logTrace('[MessageDispatch] Delegating to Runtime Gateway (legacy path).');
            const executionResult = await runtimeGateway.handleMessage({
                envelope,
                policyContext,
            });

            await this.executeActions(executionResult.actions || []);

            // Legacy path handles everything
            return;
        }

        // NEW_ARCH=true: CognitionWorker handles runtime invocation.
        logTrace('[MessageDispatch] NEW_ARCH active — runtime handled by CognitionWorker.');
    }

    private async executeActions(actions: ExecutionAction[]) {
        for (const action of actions) {
            await this.executeAction(action).catch((err) => {
                console.error('[MessageDispatch] Failed to execute action:', action.type, err);
            });
        }
    }

    private async executeAction(action: ExecutionAction) {
        switch (action.type) {
            case 'send_message': {
                await messageCore.send({
                    conversationId: action.payload.conversationId,
                    senderAccountId: action.payload.senderAccountId,
                    content: action.payload.content,
                    type: 'outgoing',
                    generatedBy: action.payload.generatedBy,
                    targetAccountId: action.payload.targetAccountId,
                });
                return;
            }
            case 'broadcast_event': {
                // ✅ NO MÁS BROADCAST DUPLICADO
                // Los eventos de broadcast ahora se manejan automáticamente por MessageCore.receive()
                console.log(`[MessageDispatch] ✅ Broadcast event handled by MessageCore`);
                console.log(`📋 EVENT:`, action.payload.event);
                return;
            }
            case 'propose_work': {
                const { workEngineService } = await import('./work-engine.service');
                const proposed = await workEngineService.proposeWork({
                    accountId: action.payload.accountId,
                    conversationId: action.payload.conversationId,
                    traceId: action.payload.proposal.traceId,
                    workDefinitionId: action.payload.proposal.workDefinitionId,
                    intent: action.payload.proposal.intent,
                    candidateSlots: action.payload.proposal.candidateSlots,
                    confidence: action.payload.proposal.confidence,
                    modelInfo: action.payload.proposal.modelInfo,
                });
                if (action.payload.openWork) {
                    await workEngineService.openWork(action.payload.accountId, proposed.id);
                }
                return;
            }
            case 'send_template': {
                const { aiTemplateService } = await import('./ai-template.service');
                await aiTemplateService.sendAuthorizedTemplate({
                    accountId: action.payload.accountId,
                    conversationId: action.payload.conversationId,
                    templateId: action.payload.templateId,
                    variables: action.payload.variables,
                });
                return;
            }
            case 'no_action':
                return;
            default:
                console.warn('[MessageDispatch] Unknown action type', (action as any)?.type);
        }
    }

    public init() {
        console.log('[MessageDispatch] Explicit initialization called');
    }
}

export const messageDispatchService = new MessageDispatchService();
