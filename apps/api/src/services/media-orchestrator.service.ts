import { coreEventBus, type CoreEventMap } from '../core/events';
import { audioEnrichmentService } from './audio-enrichment.service';
import { logTrace } from '../utils/file-logger';
import { db, messageAssets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { messageService } from './message.service';
import { assetRegistryService } from './asset-registry.service';

/**
 * Media Orchestrator Service
 * Responsable de detectar contenido multimedia en mensajes y disparar procesos de enriquecimiento.
 */
class MediaOrchestratorService {
    private listenersSetup = false;
    
    constructor() {
        // No setup listeners in constructor
    }

    private setupListeners() {
        if (this.listenersSetup) {
            console.log('[MediaOrchestrator] ⚠️ Listeners already setup, skipping');
            return;
        }
        
        this.listenersSetup = true;
        coreEventBus.on('asset:ready', (payload) => {
            // 🔥 DEBUG LOG: Verificar que el evento se recibe
            console.log('[MediaOrchestrator] 🔔 RECEIVED asset:ready event:', {
                assetId: payload.assetId,
                accountId: payload.accountId,
                mimeType: payload.mimeType,
                isAudio: payload.mimeType?.includes('audio') || payload.mimeType?.includes('webm')
            });
            
            this.handleAssetReady(payload).catch(err =>
                console.error('[MediaOrchestrator] Error handling asset:', err)
            );
        });
        
        // 🎯 NUEVO: Escuchar cuando se vincula un asset a un mensaje
        coreEventBus.on('asset:linked', (payload) => {
            console.log('[MediaOrchestrator] 🔔 RECEIVED asset:linked event:', {
                assetId: payload.assetId,
                messageId: payload.messageId,
                accountId: payload.accountId
            });
            
            this.handleAssetLinked(payload).catch(err =>
                console.error('[MediaOrchestrator] Error handling linked asset:', err)
            );
        });
        
        console.log('[MediaOrchestrator] Listening for asset:ready and asset:linked events');
    }

    private async handleAssetLinked(payload: { assetId: string; messageId: string; accountId: string }) {
        const { assetId, messageId, accountId } = payload;

        console.log(`[MediaOrchestrator] 🔍 Processing asset:linked for ${assetId}`);

        // Obtener el asset para verificar si es audio
        const asset = await assetRegistryService.getById(assetId);
        if (!asset) {
            console.log(`[MediaOrchestrator] ⚠️ Asset ${assetId} not found`);
            return;
        }

        if (!asset.mimeType || !this.isAudioMime(asset.mimeType)) {
            console.log(`[MediaOrchestrator] ⏭️ Asset ${assetId} ignored (mimeType ${asset.mimeType}) - NOT AUDIO`);
            return;
        }

        console.log(`[MediaOrchestrator] 🎧 Asset ${assetId} is AUDIO - starting enrichment (linked to message ${messageId})`);

        try {
            // Obtener el mensaje para verificar si ya está transcrito
            const message = await messageService.getMessageById(messageId);
            if (!message) {
                console.log(`[MediaOrchestrator] ⚠️ Message ${messageId} not found`);
                return;
            }

            // Verificar si ya está transcrito
            if (message.content && typeof message.content === 'object' && '__fluxcore' in message.content && (message.content as any).__fluxcore?.transcribed) {
                console.log(`[MediaOrchestrator] Message ${messageId} already transcribed, skipping`);
                return;
            }

            console.log(`[MediaOrchestrator] 🎵 ENRICHING AUDIO: assetId=${assetId}, messageId=${messageId}`);
            
            // Llamar a AudioEnrichmentService
            await audioEnrichmentService.enrichAudioMessage({
                messageId,
                accountId,
                assetId,
                mimeType: asset.mimeType || 'audio/webm',
            });

            console.log(`[MediaOrchestrator] ✅ Transcription completed for message ${messageId}, asset ${assetId}`);
            
        } catch (error) {
            console.error(`[MediaOrchestrator] ❌ Failed to enrich asset ${assetId} for message ${messageId}: ${error}`);
        }
    }

    private async handleAssetReady(payload: Parameters<CoreEventMap['asset:ready']>[0]) {
        const { assetId, accountId, mimeType } = payload;

        console.log(`[MediaOrchestrator] 🔍 Processing asset:ready for ${assetId}`);

        const logContext = {
            assetId,
            accountId,
            mimeType,
        };

        logTrace(`[MediaOrchestrator] 🔔 asset:ready recibido`, logContext);

        if (!mimeType || !this.isAudioMime(mimeType)) {
            console.log(`[MediaOrchestrator] ⏭️ Asset ${assetId} ignored (mimeType ${mimeType ?? 'unknown'}) - NOT AUDIO`);
            return;
        }

        console.log(`[MediaOrchestrator] 🎧 Asset ${assetId} is AUDIO - starting enrichment`);

        const linkedMessages = await db
            .select({ messageId: messageAssets.messageId })
            .from(messageAssets)
            .where(eq(messageAssets.assetId, assetId));

        console.log(`[MediaOrchestrator] 📋 Found ${linkedMessages.length} linked messages for asset ${assetId}`);

        if (linkedMessages.length === 0) {
            console.log(`[MediaOrchestrator] ⚠️ Asset ${assetId} ready but no message links found - CANNOT TRANSCRIBE`);
            return;
        }

        for (const link of linkedMessages) {
            const message = await messageService.getMessageById(link.messageId);
            if (!message) {
                console.log(`[MediaOrchestrator] ⚠️ Message ${link.messageId} not found for asset ${assetId}`);
                continue;
            }

            if ((message.content as any)?.__fluxcore?.transcribed) {
                console.log(`[MediaOrchestrator] ⏭️ Message ${link.messageId} already transcribed, skipping`);
                continue;
            }

            console.log(`[MediaOrchestrator] 🎬 Starting transcription for message ${link.messageId}, asset ${assetId}`);

            try {
                await audioEnrichmentService.enrichAudioMessage({
                    messageId: link.messageId,
                    accountId: accountId ?? message.senderAccountId,
                    assetId,
                    mimeType,
                });
                
                console.log(`[MediaOrchestrator] ✅ Transcription completed for message ${link.messageId}, asset ${assetId}`);
                
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error(`[MediaOrchestrator] ❌ Failed to enrich asset ${assetId} for message ${link.messageId}: ${errMsg}`);
                coreEventBus.emit('asset:enrichment_failed', {
                    assetId,
                    reason: errMsg,
                    metadata: logContext
                });
            }
        }
    }

    private isAudioMime(mimeType: string): boolean {
        return mimeType.startsWith('audio/') || mimeType === 'video/webm';
    }

    public init() {
        console.log('[MediaOrchestrator] Explicit initialization called');
        this.setupListeners();
    }
}

export const mediaOrchestrator = new MediaOrchestratorService();
