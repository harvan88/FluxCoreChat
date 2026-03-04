import { coreEventBus, type CoreEventMap } from '../core/events';
import { audioEnrichmentService } from './audio-enrichment.service';
import { logTrace } from '../utils/file-logger';
import { db, messageAssets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { messageService } from './message.service';

/**
 * Media Orchestrator Service
 * Responsable de detectar contenido multimedia en mensajes y disparar procesos de enriquecimiento.
 */
class MediaOrchestratorService {
    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        coreEventBus.on('asset:ready', (payload) => {
            this.handleAssetReady(payload).catch(err =>
                console.error('[MediaOrchestrator] Error handling asset:', err)
            );
        });
        console.log('[MediaOrchestrator] Listening for asset:ready events');
    }

    private async handleAssetReady(payload: Parameters<CoreEventMap['asset:ready']>[0]) {
        const { assetId, accountId, mimeType } = payload;

        const logContext = {
            assetId,
            accountId,
            mimeType,
        };

        logTrace(`[MediaOrchestrator] 🔔 asset:ready recibido`, logContext);

        if (!mimeType || !this.isAudioMime(mimeType)) {
            logTrace(`[MediaOrchestrator] ⏭️ Asset ${assetId} ignored (mimeType ${mimeType ?? 'unknown'})`);
            return;
        }

        const linkedMessages = await db
            .select({ messageId: messageAssets.messageId })
            .from(messageAssets)
            .where(eq(messageAssets.assetId, assetId));

        if (linkedMessages.length === 0) {
            logTrace(`[MediaOrchestrator] ⚠️ Asset ${assetId} ready but no message links found`);
            return;
        }

        for (const link of linkedMessages) {
            const message = await messageService.getMessageById(link.messageId);
            if (!message) {
                logTrace(`[MediaOrchestrator] ⚠️ Message ${link.messageId} not found for asset ${assetId}`);
                continue;
            }

            if ((message.content as any)?.__fluxcore?.transcribed) {
                logTrace(`[MediaOrchestrator] ⏭️ Message ${link.messageId} already transcribed, skipping`);
                continue;
            }

            try {
                await audioEnrichmentService.enrichAudioMessage({
                    messageId: link.messageId,
                    accountId: accountId ?? message.senderAccountId,
                    assetId,
                    mimeType,
                });
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                logTrace(`[MediaOrchestrator] ❌ Failed to enrich asset ${assetId} for message ${link.messageId}: ${errMsg}`);
                coreEventBus.emit('asset:enrichment_failed', {
                    assetId,
                    reason: errMsg,
                    metadata: { messageId: link.messageId },
                });
            }
        }
    }

    private isAudioMime(mimeType: string): boolean {
        return mimeType.startsWith('audio/') || mimeType === 'video/webm';
    }

    public init() {
        console.log('[MediaOrchestrator] Explicit initialization called');
    }
}

export const mediaOrchestrator = new MediaOrchestratorService();
