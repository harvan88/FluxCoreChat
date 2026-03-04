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

import { db, messages, conversations, relationships, fluxcoreCognitionQueue, fluxcoreActionAudit } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import type { ExecutionAction, ProposeWorkAction, OpenWorkAction, AdvanceWorkStateAction, RequestSlotAction, CloseWorkAction } from '../../core/fluxcore-types';
import type { FluxPolicyContext } from '@fluxcore/db';
import { coreEventBus } from '../../core/events';
import { workEngineService } from '../work-engine.service';
import { messageCore } from '../../core/message-core';

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
        const results: ActionExecutionResult[] = [];
        const { turnId, conversationId, accountId, targetAccountId, runtimeId, policyContext } = params;

        for (const action of actions) {
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
        await this.closeTurn(turnId, accountId);

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[ActionExecutor] Batch complete for turn ${turnId}: ${succeeded} succeeded, ${failed} failed`);

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
     * Send a message through ChatCore.
     * 
     * Canon: "ChatCore persists the message (generated_by: 'ai'),
     *         sends it to the adapter, and emits the WebSocket event."
     */
    private async executeSendMessage(
        action: { type: 'send_message'; content: string; conversationId: string },
        context: { accountId: string; targetAccountId?: string }
    ): Promise<ActionExecutionResult> {
        try {
            // SEMÁNTICA CORRECTA POST-FIX:
            // context.accountId = quien RESPONDE (Patricia - tiene la IA activa)
            // context.targetAccountId = a quien responder (Harold - recibe la respuesta)
            
            // 1. Persist via ChatCore (Body writes to its own table)
            console.log(`[ActionExecutor] 🤖 IA GENERANDO RESPUESTA:`);
            console.log(`📋 CONTEXTO DE RESPUESTA:`);
            console.log(`  - Account ID (quien responde): ${context.accountId}`);
            console.log(`  - Target Account (para quien): ${context.targetAccountId}`);
            console.log(`  - Conversation ID: ${action.conversationId}`);
            console.log(`  - Content: "${action.content}"`);
            
            const [msg] = await db.insert(messages).values({
                conversationId: action.conversationId,
                senderAccountId: context.accountId, // ✅ AI envía DESDE quien responde (Patricia)
                content: { text: action.content },
                type: 'outgoing',
                generatedBy: 'ai',
                status: 'pending',
                metadata: {
                    // 🔑 AGREGAR METADATA DE LA VERDAD DEL MUNDO
                    originalChannel: 'unknown', // 🔴 DEBERÍA SER EL CANAL ORIGINAL
                    originalMessageId: 'unknown', // 🔴 DEBERÍA SER EL MENSAJE ORIGINAL
                    responseTimestamp: new Date().toISOString(),
                    aiModel: 'unknown', // 🔴 DEBERÍA SER EL MODELO DE IA
                    mode: 'unknown' // 🔴 DEBERÍA SER EL MODO DE IA
                }
            }).returning();

            // 2. Update conversation metadata
            await db.update(conversations).set({
                lastMessageAt: new Date(),
                lastMessageText: action.content.substring(0, 200),
                updatedAt: new Date(),
            }).where(eq(conversations.id, action.conversationId));

            // 2. Emit event for WebSocket distribution (ChatCore responsibility)
            console.log(`[ActionExecutor] 📤 EMITIENDO EVENTO A MessageDispatch:`);
            console.log(`📋 ENVELOPE PARA MessageDispatch:`);
            console.log(`  - Conversation ID: ${action.conversationId}`);
            console.log(`  - Sender Account (quien envía): ${context.accountId}`);
            console.log(`  - Target Account (para quien): ${context.targetAccountId}`);
            console.log(`  - Content: "${action.content}"`);
            console.log(`  - Generated By: ai`);
            
            coreEventBus.emit('core:message_received', {
                envelope: {
                    conversationId: action.conversationId,
                    senderAccountId: context.accountId,
                    targetAccountId: context.targetAccountId, // 🔑 Usar targetAccountId para el receptor
                    content: { text: action.content },
                    type: 'outgoing',
                    generatedBy: 'ai',
                    meta: {
                        // ✅ META para MessageDispatch
                        targetAccountId: context.targetAccountId, // 🔑 Para quien va el mensaje
                        // 🔑 AGREGAR MÁS META DE LA VERDAD DEL MUNDO
                        originalChannel: 'unknown', // 🔴 DEBERÍA SER EL CANAL ORIGINAL
                        originalMessageId: 'unknown', // 🔴 DEBERÍA SER EL MENSAJE ORIGINAL
                        responseTimestamp: new Date().toISOString(),
                        aiModel: 'unknown', // 🔴 DEBERÍA SER EL MODELO DE IA
                        mode: 'unknown' // 🔴 DEBERÍA SER EL MODO DE IA
                    }
                },
                result: { success: true, messageId: msg.id }
            });

            // 3. ✅ NO MÁS BROADCAST DUPLICADO
            // El broadcast ahora se maneja automáticamente por MessageCore.receive()
            // Este código era un remanente del refactor anterior
            console.log(`[ActionExecutor] ✅ Message persisted - broadcast handled by MessageCore`);
            console.log(`📋 MENSAJE GUARDADO:`);
            console.log(`  - Message ID: ${msg.id}`);
            console.log(`  - Conversation ID: ${action.conversationId}`);
            console.log(`  - Content: "${action.content}"`);
            console.log(`  - Sender: ${context.accountId}`);
            console.log(`  - Target: ${context.targetAccountId}`);

            console.log(`[FluxPipeline] ✅ SENT  conv=${action.conversationId.slice(0, 7)} msgId=${msg.id.slice(0, 7)} by=ai`);

            return {
                action,
                success: true,
                messageId: msg.id,
            };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ Failed to send message:`, error.message);
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
