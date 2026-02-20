import { aiService } from '../ai.service';
import { smartDelayService } from '../smart-delay.service';
import { messageCore } from '../../core/message-core';
import type { RuntimeAdapter, RuntimeHandleInput, ExecutionResult } from '../runtime-gateway.service';
import type { FluxPolicyContext } from '@fluxcore/db';

export class FluxCoreRuntimeAdapter implements RuntimeAdapter {
    async handleMessage(input: RuntimeHandleInput): Promise<ExecutionResult> {
        const { envelope, policyContext } = input;
        const targetAccountId = envelope.targetAccountId;

        if (!targetAccountId) {
            console.log(`[Diag][Runtime] message=${envelope.id} runtime=@fluxcore/asistentes decision=ignore stage=adapter_entry reason=no_target`);
            return { actions: [{ type: 'no_action' }] };
        }

        // Prevent loops: ignore AI/System messages
        if (envelope.generatedBy && envelope.generatedBy !== 'human') {
            console.log(`[Diag][Runtime] message=${envelope.id} runtime=@fluxcore/asistentes decision=ignore stage=adapter_entry reason=loop_prevention`);
            return { actions: [{ type: 'no_action' }] };
        }

        const textContent = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
        if (!textContent) {
            console.log(`[Diag][Runtime] message=${envelope.id} runtime=@fluxcore/asistentes decision=ignore stage=adapter_entry reason=no_text`);
            return { actions: [{ type: 'no_action' }] };
        }

        console.log(`[Diag][Runtime] message=${envelope.id} runtime=@fluxcore/asistentes decision=respond stage=adapter_entry target=${targetAccountId}`);
        const config = await aiService.getAccountConfig(targetAccountId);
        const mode = config.mode || 'suggest';

        // ─── Smart Delay Logic (Auto Mode Only) ──────────────────────────────
        // If mode is 'auto' and smart delay is enabled, we debounce the generation.
        if (mode === 'auto' && config.smartDelayEnabled) {
            console.log(`[Diag][Runtime] message=${envelope.id} runtime=@fluxcore/asistentes decision=respond stage=smart_delay scheduled=true`);
            smartDelayService.scheduleResponse({
                conversationId: envelope.conversationId,
                accountId: targetAccountId,
                lastMessageText: textContent,
                onTypingStart: () => {
                    // Send typing indicator
                    messageCore.broadcastActivity(envelope.conversationId, {
                        accountId: targetAccountId,
                        status: 'typing'
                    });
                },
                onProcess: async () => {
                    // Generate and Send
                    const result = await this.processAndSend({
                        conversationId: envelope.conversationId,
                        targetAccountId,
                        userAccountId: envelope.senderAccountId,
                        textContent: textContent, // Note: SmartDelay might have newer text in closure if we structured it differently, but here we use what's passed.
                        policyContext,
                        triggerMessageId: envelope.id,
                        triggerMessageCreatedAt: envelope.timestamp ? new Date(envelope.timestamp) : new Date(),
                        mode: 'auto'
                    });

                    // Manually execute actions since we are async (outside Gateway flow)
                    for (const action of result.actions) {
                        if (action.type === 'send_message') {
                            await messageCore.send({
                                conversationId: action.payload.conversationId,
                                senderAccountId: action.payload.senderAccountId,
                                content: action.payload.content,
                                type: 'outgoing',
                                generatedBy: action.payload.generatedBy,
                                targetAccountId: action.payload.targetAccountId,
                            });
                        }
                    }
                }
            });

            return { actions: [{ type: 'no_action' }] };
        }

        // ─── Immediate Execution ─────────────────────────────────────────────
        return this.processAndSend({
            conversationId: envelope.conversationId,
            targetAccountId,
            userAccountId: envelope.senderAccountId,
            textContent,
            policyContext,
            triggerMessageId: envelope.id,
            triggerMessageCreatedAt: envelope.timestamp ? new Date(envelope.timestamp) : new Date(),
            mode
        });
    }

    private async processAndSend(params: {
        conversationId: string;
        targetAccountId: string;
        userAccountId: string;
        textContent: string;
        policyContext: FluxPolicyContext;
        triggerMessageId?: string;
        triggerMessageCreatedAt?: Date;
        mode?: 'auto' | 'suggest';
    }): Promise<ExecutionResult> {
        console.log(`[Diag][Provider] message=${params.triggerMessageId || params.conversationId} runtime=@fluxcore/asistentes decision=respond stage=provider_call mode=${params.mode || 'suggest'}`);
        const response = await aiService.generateResponse(
            params.conversationId,
            params.targetAccountId,
            params.textContent,
            {
                policyContext: params.policyContext,
                triggerMessageId: params.triggerMessageId,
                triggerMessageCreatedAt: params.triggerMessageCreatedAt,
            }
        );
        console.log(`[Diag][Provider] message=${params.triggerMessageId || params.conversationId} runtime=@fluxcore/asistentes decision=${response.ok ? 'respond' : 'block'} stage=provider_response reason=${response.ok ? 'ok' : response.block?.reason}`);

        if (!response.ok || !response.suggestion) {
            return { actions: [{ type: 'no_action' }] };
        }

        const suggestion = response.suggestion;
        
        // Check mode again (if not passed, fetch or assume suggest)
        let mode = params.mode;
        if (!mode) {
             const config = await aiService.getAccountConfig(params.targetAccountId);
             mode = config.mode || 'suggest';
        }

        if (mode === 'auto') {
            // Auto-approve/send
            aiService.approveSuggestion(suggestion.id);

            // If called from SmartDelay (onProcess), we can't return actions to the gateway
            // because the gateway returned long ago.
            // So we must execute the send directly if we are in a callback.
            // But this method is called by handleMessage too.
            // To support both, we returns actions, AND if called from callback we handle them?
            // No, simpler: `handleMessage` returns actions.
            // `onProcess` (async) must call messageCore directly.
            
            // Let's refactor: handleMessage calls this.
            // If this is called from onProcess, we return ExecutionResult but we need to execute it.
            
            return {
                actions: [
                    {
                        type: 'send_message',
                        payload: {
                            conversationId: params.conversationId,
                            senderAccountId: params.targetAccountId,
                            targetAccountId: params.userAccountId, 
                            // Wait, send_message payload needs sender/target.
                            // In legacy, we just sent to conversation.
                            // runtime-gateway send_message action requires senderAccountId.
                            content: { text: suggestion.content },
                            generatedBy: 'ai',
                        },
                    },
                ],
            };
        }

        console.log(`[Diag][Runtime] message=${params.triggerMessageId || params.conversationId} runtime=@fluxcore/asistentes decision=respond stage=runtime_actions actions=0 mode=${mode}`);
        return { actions: [{ type: 'no_action' }] };
    }
}
