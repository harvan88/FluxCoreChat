
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

        logTrace(`📨 1. Event Received. Conversation: ${envelope.conversationId}`, {
            success: result.success,
            mode: result.automation?.mode,
            targetAccount: envelope.targetAccountId
        });

        // 1. Validaciones básicas: éxito y automatización activa
        if (
            !result.success ||
            !result.automation ||
            result.automation.mode !== 'automatic'
        ) {
            logTrace(`⏹️ Ignoring: Not automatic or not success.`);
            return;
        }

        // 2. Validar contenido
        const messageText = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
        if (!messageText || messageText.trim().length === 0) {
            logTrace(`⏹️ Ignoring: Empty text.`);
            return;
        }

        // 3. Obtener Account ID Objetivo (quien debe responder)
        // El envelope DEBE tener targetAccountId poblado por MessageCore antes de emitir
        const targetAccountId = envelope.targetAccountId;
        if (!targetAccountId) {
            logTrace(`❌ ABORT: Missing targetAccountId. MessageCore did not populate it.`);
            return;
        }

        // 4. Programar respuesta
        logTrace(`✅ Scheduling Auto-Reply for Account ${targetAccountId}`);
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
                const suggestion = await extensionHost.generateAIResponse(
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

                if (suggestion?.content) {
                    // Procesar branding
                    const stripped = extensionHost.stripFluxCorePromoMarker(suggestion.content);
                    const finalText = stripped.promo
                        ? extensionHost.appendFluxCoreBrandingFooter(stripped.text)
                        : stripped.text;

                    const content: any = stripped.promo
                        ? { text: finalText, __fluxcore: { branding: true } }
                        : { text: finalText };

                    // Enviar respuesta
                    await messageCore.send({
                        conversationId: envelope.conversationId,
                        senderAccountId: targetAccountId, // La IA responde como la cuenta target
                        content,
                        type: 'outgoing',
                        generatedBy: 'ai',
                        targetAccountId: envelope.senderAccountId // Opcional, contexto
                    });
                }
            } catch (err: any) {
                console.error('[AIOrchestrator] Error generating/sending reply:', err);
                logTrace(`❌ Error generating reply: ${err.message}`);
            } finally {
                this.autoReplyQueue.delete(debounceKey);
            }
        }, delayMs);

        this.autoReplyQueue.set(debounceKey, timeout);
    }
    public init() {
        // Simplemente referenciar la instancia dispara el constructor si no se ha hecho
        console.log('[AIOrchestrator] Explicit initialization called');
    }
}

export const aiOrchestrator = new AIOrchestratorService();
