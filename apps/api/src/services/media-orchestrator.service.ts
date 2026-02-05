import { coreEventBus } from '../core/events';
import { audioEnrichmentService } from './audio-enrichment.service';
import type { MessageEnvelope, ReceiveResult } from '../core/types';
import { logTrace } from '../utils/file-logger';

/**
 * Media Orchestrator Service
 * Responsable de detectar contenido multimedia en mensajes y disparar procesos de enriquecimiento.
 */
class MediaOrchestratorService {
    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        coreEventBus.on('core:message_received', (payload) => {
            this.handleMessageReceived(payload).catch(err =>
                console.error('[MediaOrchestrator] Error handling message:', err)
            );
        });
        console.log('[MediaOrchestrator] Service initialized and listening');
    }

    private async handleMessageReceived(payload: { envelope: MessageEnvelope; result: ReceiveResult }) {
        const { envelope, result } = payload;

        // TRAZA DE DIAGNÓSTICO: Registrar cada mensaje que pasa por el orquestador
        const debugMsg = `[MediaOrchestrator] 🔍 Evaluating message ${result.messageId}`;
        console.log(debugMsg);
        logTrace(debugMsg, {
            hasMedia: !!envelope.content?.media,
            mediaCount: envelope.content?.media?.length || 0,
            textLength: typeof envelope.content?.text === 'string' ? envelope.content.text.length : 0,
            type: envelope.type
        });

        if (!result.success || !result.messageId) return;

        // 1. Detectar si el mensaje tiene audio
        // El frontend suele enviar assetId. El backend/adapters antiguos suelen enviar url.
        // NOTA: Algunos navegadores graban audio como 'video/webm'
        const audioMedia = (envelope.content?.media || []).find((m: any) =>
            m.type === 'audio' ||
            (m.mimeType && (m.mimeType.startsWith('audio/') || m.mimeType === 'video/webm'))
        );

        if (!audioMedia && envelope.content?.media?.length) {
            console.log(`[MediaOrchestrator] ℹ️ Media found but none matched audio criteria:`, JSON.stringify(envelope.content.media));
        }

        if (audioMedia) {
            const media = audioMedia as any;
            const assetId = media.assetId;
            const url = media.url;

            logTrace(`[MediaOrchestrator] 🎵 AUDIO DETECTED in message ${result.messageId}. AssetId: ${assetId}, URL: ${url}`);

            // Disparar enriquecimiento de audio
            try {
                // LLAMADA AL SERVICIO DE ENRIQUECIMIENTO
                await audioEnrichmentService.enrichAudioMessage({
                    messageId: result.messageId,
                    accountId: envelope.targetAccountId || '',
                    audioUrl: url,
                    assetId: assetId,
                    mimeType: media.mimeType || 'audio/webm'
                });
            } catch (err: any) {
                logTrace(`[MediaOrchestrator] ❌ Failed to enrich audio: ${err.message}`);
                console.error(`[MediaOrchestrator] Enrichment Error:`, err);
            }
        }
        else {
            // Si hay media pero no es audio, logueamos para debugging
            if (envelope.content?.media && envelope.content.media.length > 0) {
                logTrace(`[MediaOrchestrator] 📁 Other media detected (not audio)`, {
                    mediaTypes: envelope.content.media.map((m: any) => m.type || m.mimeType)
                });
            }
        }
    }

    public init() {
        console.log('[MediaOrchestrator] Explicit initialization called');
    }
}

export const mediaOrchestrator = new MediaOrchestratorService();
