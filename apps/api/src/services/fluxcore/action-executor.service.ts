/**
 * ActionExecutor — FluxCore v8.2
 * 
 * Canon §4.4: Mediated Effect Execution
 * 
 * THE BRIDGE BETWEEN BRAIN AND BODY.
 * 
 * FluxCore (Brain) decides what to do → returns ExecutionAction[]
 * ActionExecutor translates those into ChatCore (Body) operations.
 * 
 * Responsibilities:
 * 1. Receive ExecutionAction[] from the CognitiveDispatcher
 * 2. Validate each action against PolicyContext authorization
 * 3. Call ChatCore services (messageCore, templateService) to execute effects
 * 4. Handle errors per-action (one failure doesn't block others)
 * 5. Emit WebSocket events via ChatCore's event system
 * 
 * Canon Invariant: "If a message goes out, it MUST be in ChatCore's `messages` table."
 */

import { db, fluxcoreCognitionQueue, fluxcoreActionAudit } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import type { ExecutionAction, ProposeWorkAction, OpenWorkAction, AdvanceWorkStateAction, RequestSlotAction, CloseWorkAction } from '../../core/fluxcore-types';
import type { FluxPolicyContext } from '@fluxcore/db';
import { coreEventBus } from '../../core/events';
import { workEngineService } from '../work-engine.service';

export interface ActionExecutionResult {
    action: ExecutionAction;
    success: boolean;
    messageId?: string;
    error?: string;
}

class ActionExecutorService {

    /**
     * Execute a batch of actions from a runtime invocation.
     * Marks the turn as processed in cognition_queue upon completion.
     */
    async execute(
        actions: ExecutionAction[],
        params: {
            turnId: number;
            conversationId: string;
            accountId: string;
            targetAccountId?: string;
            runtimeId: string;
            policyContext?: FluxPolicyContext;
        }
    ): Promise<ActionExecutionResult[]> {
        console.log(`[ActionExecutor] 🎬 EXECUTE START: ${actions.length} actions for turn ${params.turnId}`);
        console.log(`[ActionExecutor] 📋 PARAMS:`);
        console.log(`  - turnId: ${params.turnId}`);
        console.log(`  - conversationId: ${params.conversationId}`);
        console.log(`  - accountId (responder): ${params.accountId}`);
        console.log(`  - targetAccountId: ${params.targetAccountId || 'undefined'}`);
        console.log(`  - runtimeId: ${params.runtimeId}`);
        console.log(`  - policyContext.mode: ${params.policyContext?.mode || 'undefined'}`);
        console.log(`[ActionExecutor] 📋 ACTIONS TO EXECUTE: ${actions.map(a => a.type).join(', ')}`);
        
        const results: ActionExecutionResult[] = [];
        const { turnId, conversationId, accountId, targetAccountId, runtimeId, policyContext } = params;

        for (const action of actions) {
            console.log(`[ActionExecutor] ⏳ Executing action: ${action.type}`);
            let status: 'executed' | 'rejected' | 'failed' = 'executed';
            let rejectionReason: string | undefined;

            try {
                // 1. Authorization Check (PRINCIPLE: Sovereignty via PolicyContext)
                if (action.type === 'send_template' && policyContext) {
                    const isAuth = policyContext.authorizedTemplates.includes(action.templateId);
                    if (!isAuth) {
                        status = 'rejected';
                        rejectionReason = `Template ${action.templateId} is not authorized for this account`;
                        throw new Error(rejectionReason);
                    }
                }

                // H8: Tool authorization check
                // if (action.type === 'call_tool' && policyContext) { ... }

                const result = await this.executeOne(action, { conversationId, accountId, targetAccountId });
                console.log(`[ActionExecutor] ✓ Action ${action.type} result: success=${result.success}${result.messageId ? ` messageId=${result.messageId.slice(0,8)}` : ''}${result.error ? ` error="${result.error}"` : ''}`);
                results.push(result);

                if (!result.success) {
                    status = 'failed';
                    rejectionReason = result.error;
                }
            } catch (error: any) {
                console.error(`[ActionExecutor] 🔥 Unhandled error executing ${action.type}:`, error.message);
                status = status === 'rejected' ? 'rejected' : 'failed';
                rejectionReason = rejectionReason || error.message;
                results.push({
                    action,
                    success: false,
                    error: error.message,
                });
            } finally {
                // PASO 4: Registrar auditoría
                await db.insert(fluxcoreActionAudit).values({
                    conversationId,
                    accountId,
                    runtimeId,
                    actionType: action.type,
                    actionPayload: action as any,
                    status,
                    rejectionReason,
                }).catch((e) => console.error('[ActionExecutor] Audit failed:', e.message));
            }
        }

        // 2. MARK AS PROCESSED (PRINCIPLE: Mediated Execution closes the loop)
        console.log(`[ActionExecutor] ⏳ Marking turn ${turnId} as processed...`);
        await this.closeTurn(turnId, accountId);

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[ActionExecutor] ✅ EXECUTE COMPLETE for turn ${turnId}: ${succeeded} succeeded, ${failed} failed`);
        console.log(`[ActionExecutor]   Results: ${results.map(r => `${r.action.type}=${r.success?'OK':'FAIL'}`).join(', ')}`);

        return results;
    }

    /**
     * Mark a turn as processed in the cognition queue.
     * Prevents the CognitionWorker from picking it up again.
     */
    async closeTurn(turnId: number, accountId: string): Promise<void> {
        await db.update(fluxcoreCognitionQueue)
            .set({ processedAt: new Date() })
            .where(and(
                eq(fluxcoreCognitionQueue.id, turnId),
                eq(fluxcoreCognitionQueue.accountId, accountId)
            ));

        console.log(`[ActionExecutor] Turn ${turnId} marked as PROCESSED`);
    }

    /**
     * Execute a single action.
     */
    private async executeOne(
        action: ExecutionAction,
        context: { conversationId: string; accountId: string; targetAccountId?: string }
    ): Promise<ActionExecutionResult> {
        switch (action.type) {
            case 'send_message':
                return this.executeSendMessage(action, context);

            case 'send_template':
                return this.executeSendTemplate(action, context);

            case 'start_typing':
                return this.executeStartTyping(action);

            case 'no_action':
                console.log(`[ActionExecutor] 🔇 No action: ${action.reason}`);
                return { action, success: true };

            // ── Fluxi/WES actions (H4) ────────────────────────────────────
            case 'propose_work':
                return this.executeProposeWork(action, context);

            case 'open_work':
                return this.executeOpenWork(action, context);

            case 'advance_work_state':
                return this.executeAdvanceWorkState(action, context);

            case 'request_slot':
                return this.executeRequestSlot(action, context);

            case 'close_work':
                return this.executeCloseWork(action, context);

            default:
                console.warn(`[ActionExecutor] ⚠️ Unknown action type: ${(action as any).type}`);
                return { action, success: false, error: `Unknown action type: ${(action as any).type}` };
        }
    }


    /**
     * Send a message through the Kernel → ChatCore pipeline.
     * 
     * Architecture v4.0:
     * FluxCore (Brain) certifies its response as a Kernel signal (AI_RESPONSE_GENERATED).
     * ChatProjector observes the signal and delivers via messageCore.receive().
     * ChatCore (Body) handles: persistence, WebSocket broadcast, conversation update.
     * 
     * FluxCore NEVER writes directly to ChatCore's messages table.
     */
    private async executeSendMessage(
        action: { type: 'send_message'; content: string; conversationId: string },
        context: { conversationId: string; accountId: string; targetAccountId?: string }
    ): Promise<ActionExecutionResult> {
        try {
            console.log(`[ActionExecutor] �→🔑 CERTIFYING AI RESPONSE VIA KERNEL:`);
            console.log(`  - Account ID (responder): ${context.accountId}`);
            console.log(`  - Target Account (receiver): ${context.targetAccountId}`);
            console.log(`  - Conversation ID: ${action.conversationId}`);
            console.log(`  - Content: "${action.content.substring(0, 100)}..."`);

            const { cognitionGateway } = await import('./cognition-gateway.service');

            const certResult = await cognitionGateway.certifyAiResponse({
                conversationId: action.conversationId,
                accountId: context.accountId,
                targetAccountId: context.targetAccountId || 'unknown',
                content: { text: action.content },
                turnId: 0, // Will be enriched by caller if needed
            });

            if (!certResult.accepted) {
                console.error(`[ActionExecutor] ❌ Kernel rejected AI response: ${certResult.reason}`);
                return { action, success: false, error: `Kernel rejected: ${certResult.reason}` };
            }

            console.log(`[ActionExecutor] ✅ AI response certified as signal #${certResult.signalId}`);
            console.log(`[FluxPipeline] ✅ CERTIFIED  conv=${action.conversationId.slice(0, 7)} signal=#${certResult.signalId} by=ai`);

            return {
                action,
                success: true,
            };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ Failed to certify AI response:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * Send a template through ChatCore.
     * DEUDA: Integrate with templateService for proper rendering.
     */
    private async executeSendTemplate(
        action: { type: 'send_template'; templateId: string; conversationId: string; variables?: Record<string, string> },
        _context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            // TODO H3: Call templateService.render(templateId, variables) and then send
            console.log(`[ActionExecutor] 📋 Template "${action.templateId}" would be sent to conversation ${action.conversationId}`);

            return {
                action,
                success: true,
            };
        } catch (error: any) {
            return { action, success: false, error: error.message };
        }
    }

    /**
     * Send typing indicator through ChatCore.
     * 
     * Canon: "Typing de la IA: FluxCore decide que va a responder →
     *         Envía acción start_typing a ChatCore →
     *         ChatCore se lo comunica al adaptador externo."
     */
    private async executeStartTyping(
        action: { type: 'start_typing'; conversationId: string }
    ): Promise<ActionExecutionResult> {
        try {
            // Emit via event bus — ChatCore's WebSocket handler picks this up
            // and forwards to the appropriate adapter (Web/WA/Telegram).
            coreEventBus.emit('core:message_received', {
                envelope: {
                    conversationId: action.conversationId,
                    type: 'typing',
                    status: 'typing',
                } as any,
                result: {
                    conversationId: action.conversationId,
                } as any,
            });

            console.log(`[ActionExecutor] ⌨️ Typing indicator sent for conversation ${action.conversationId}`);

            return { action, success: true };
        } catch (error: any) {
            return { action, success: false, error: error.message };
        }
    }
    // ── Fluxi/WES action executors ────────────────────────────────────────────

    /**
     * H4: Persist a ProposedWork and optionally send a confirmation message.
     * Gate evaluation and Work opening happen in subsequent turns.
     */
    private async executeProposeWork(
        action: ProposeWorkAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const traceId = `propose-${Date.now()}`;
            const proposed = await workEngineService.proposeWork({
                accountId: context.accountId,
                conversationId: action.conversationId,
                traceId,
                workDefinitionId: action.workDefinitionId,
                intent: action.intent,
                candidateSlots: action.candidateSlots,
                confidence: action.confidence,
            });

            console.log(`[ActionExecutor] ✅ ProposedWork created: ${proposed.id}`);

            // Immediately try to open the work (gate evaluation)
            try {
                const work = await workEngineService.openWork(context.accountId, proposed.id);
                console.log(`[ActionExecutor] ✅ Work opened: ${work.id} (state: ${work.state})`);

                if (action.replyMessage) {
                    await this.executeSendMessage(
                        { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                        context
                    );
                }
            } catch (gateError: any) {
                console.warn(`[ActionExecutor] Gate rejected ProposedWork ${proposed.id}:`, gateError.message);
                await workEngineService.discardWork(context.accountId, proposed.id);
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ propose_work failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Open a Work from an existing ProposedWork (explicit gate pass).
     */
    private async executeOpenWork(
        action: OpenWorkAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const work = await workEngineService.openWork(context.accountId, action.proposedWorkId);
            console.log(`[ActionExecutor] ✅ Work opened: ${work.id}`);

            if (action.replyMessage) {
                await this.executeSendMessage(
                    { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                    context
                );
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ open_work failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Commit new slot values to an active Work (delta commit).
     */
    private async executeAdvanceWorkState(
        action: AdvanceWorkStateAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            if (action.slots.length > 0) {
                const delta = action.slots.map(s => ({ op: 'set' as const, path: s.path, value: s.value }));
                await workEngineService.commitDelta(action.workId, delta, 'ai', `advance-${Date.now()}`);
                console.log(`[ActionExecutor] ✅ Work ${action.workId} advanced with ${action.slots.length} slots`);
            }

            if (action.replyMessage) {
                await this.executeSendMessage(
                    { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                    context
                );
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ advance_work_state failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Request semantic slot confirmation from the user.
     */
    private async executeRequestSlot(
        action: RequestSlotAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const traceId = `semantic-${Date.now()}`;
            const contextId = await workEngineService.requestSemanticConfirmation(
                action.workId,
                action.slotPath,
                action.proposedValue,
                traceId
            );
            console.log(`[ActionExecutor] ✅ SemanticContext created: ${contextId}`);

            // Send the question to the user
            await this.executeSendMessage(
                { type: 'send_message', content: action.questionMessage, conversationId: action.conversationId },
                context
            );

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ request_slot failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Close a Work (complete, cancel, or fail) and send final message.
     */
    private async executeCloseWork(
        action: CloseWorkAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const terminalState = action.resolution === 'completed' ? 'COMPLETED'
                : action.resolution === 'cancelled' ? 'CANCELLED'
                    : 'FAILED';

            const delta = [{ op: 'transition' as const, toState: terminalState }];
            await workEngineService.commitDelta(action.workId, delta, 'system', `close-${Date.now()}`);
            console.log(`[ActionExecutor] ✅ Work ${action.workId} → ${terminalState}`);

            if (action.replyMessage) {
                await this.executeSendMessage(
                    { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                    context
                );
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ close_work failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }
}

export const actionExecutor = new ActionExecutorService();
