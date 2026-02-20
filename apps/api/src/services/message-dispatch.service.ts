
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

        if (!result.success || !result.messageId) {
            return; // AI-generated or typing — no re-dispatch
        }

        envelope.id = result.messageId;

        const targetAccountId = envelope.targetAccountId;
        if (!targetAccountId) {
            return; // No target (AI emission without target) — skip
        }

        const { conversationService } = await import('./conversation.service');
        const conversation = await conversationService.getConversationById(envelope.conversationId);
        if (!conversation) {
            console.log(`❌ [MessageDispatch] ABORT: Conversation ${envelope.conversationId} not found.`);
            return;
        }

        // ── NEW ARCHITECTURE GATE ────────────────────────────────────────────────
        // When FLUX_NEW_ARCHITECTURE=true, hand off to CognitionWorker via queue.
        // The message is already persisted in the messages table by messageCore.
        // CognitionWorker will pick it up after the turn window expires.
        if (featureFlags.fluxNewArchitecture) {
            const TURN_WINDOW_MS = 3000;
            const expiresAt = new Date(Date.now() + TURN_WINDOW_MS);
            await db.execute(sql`
                INSERT INTO fluxcore_cognition_queue
                    (conversation_id, account_id, last_signal_seq, turn_window_expires_at)
                VALUES
                    (${envelope.conversationId}, ${targetAccountId}, NULL, ${expiresAt})
                ON CONFLICT (conversation_id) WHERE processed_at IS NULL
                DO UPDATE SET
                    turn_window_expires_at = ${expiresAt},
                    last_signal_seq        = NULL,
                    processed_at           = NULL
            `);
            console.log(`[FluxPipeline] 🚦 GATE  conv=${envelope.conversationId.slice(0,7)} type=${envelope.type} target=${targetAccountId.slice(0,7)} → ENQUEUE`);
            return;
        }
        // ── END NEW ARCHITECTURE GATE ────────────────────────────────────────────

        const policyContext = await fluxPolicyContextService.resolve({
            accountId: targetAccountId,
            relationshipId: conversation.relationshipId ?? undefined,
        });

        logTrace('[MessageDispatch] PolicyContext resolved.');

        // 1. Extension Host Processing (Interceptors/Middleware)
        logTrace('[MessageDispatch] Invoking Extension Host...');
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

        // 2. Runtime Gateway (Final Handler)
        logTrace('[MessageDispatch] Delegating to Runtime Gateway.');
        const executionResult = await runtimeGateway.handleMessage({
            envelope,
            policyContext,
        });

        await this.executeActions(executionResult.actions || []);
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
                await messageCore.broadcastToConversation(
                    action.payload.conversationId,
                    action.payload.event,
                );
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
