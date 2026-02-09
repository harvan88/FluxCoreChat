
import { coreEventBus } from '../core/events';
import { messageCore } from '../core/message-core';
import { extensionHost } from './extension-host.service';
import type { MessageEnvelope, ReceiveResult } from '../core/types';
import { logTrace } from '../utils/file-logger';

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
        const { envelope, result } = payload;

        logTrace(`📨 AIOrchestrator Evaluating Event: ${envelope.conversationId}`, {
            success: result.success,
            mode: result.automation?.mode,
            hasText: !!envelope.content?.text,
            hasMedia: !!(envelope.content?.media && envelope.content.media.length > 0)
        });

        // 1. Validaciones básicas: éxito y automatización activa
        if (
            !result.success ||
            !result.automation ||
            result.automation.mode !== 'automatic'
        ) {
            logTrace(`⏹️ AIOrchestrator: Ignoring (Not automatic or not success).`);
            return;
        }

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

        // 3. Obtener Account ID Objetivo
        const targetAccountId = envelope.targetAccountId;
        if (!targetAccountId) {
            logTrace(`❌ AIOrchestrator ABORT: Missing targetAccountId.`);
            return;
        }

        // 4. Programar respuesta
        logTrace(`✅ AIOrchestrator: Scheduling Auto-Reply for Account ${targetAccountId}`);
        this.scheduleAutoReply(envelope, messageText, targetAccountId, result.automation.mode, result.messageId);
    }

    private async scheduleAutoReply(
        envelope: MessageEnvelope,
        messageText: string,
        targetAccountId: string,
        automationMode: 'automatic' | 'supervised' | 'disabled',
        triggerMessageId?: string
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
                    }
                );

                // ── Blocked: notify account owner via WebSocket only (not persisted) ──
                if (!result.ok) {
                    logTrace(`[AIOrchestrator] 🚫 BLOCKED: ${result.block.reason} — ${result.block.message}`);
                    const payload = {
                        type: 'ai:execution_blocked',
                        data: {
                            conversationId: envelope.conversationId,
                            accountId: targetAccountId,
                            block: result.block,
                        },
                    };
                    logTrace(`[AIOrchestrator] 📡 Broadcasting ai:execution_blocked to conversation ${envelope.conversationId}`);
                    await messageCore.broadcastToConversation(envelope.conversationId, payload);
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
                        content,
                        type: 'outgoing',
                        generatedBy: 'ai',
                        targetAccountId: envelope.senderAccountId
                    });
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

    public init() {
        console.log('[AIOrchestrator] Explicit initialization called');
    }
}

export const aiOrchestrator = new AIOrchestratorService();
