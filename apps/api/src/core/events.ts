import { EventEmitter } from 'node:events';
import type { MessageEnvelope, ReceiveResult } from './types';
import { getRedisPub, getRedisSub, quitRedis } from './redis';

const REDIS_CHANNEL = 'fluxcore:events';
const PROCESS_ID = Math.random().toString(36).substring(7);

export interface CoreEventMap {
    'core:message_received': (payload: { envelope: MessageEnvelope; result: ReceiveResult }) => void;
    'core:message_updated': (payload: { 
        messageId: string; 
        conversationId: string; 
        accountId: string; 
        senderAccountId: string; 
        oldContent: any; 
        newContent: any; 
        transcription?: string; 
    }) => void;
    'media:enriched': (payload: { messageId: string; accountId: string; type: string; enrichment: any }) => void;
    'asset:ready': (payload: { assetId: string; accountId: string; mimeType?: string | null; sizeBytes?: number | null; checksum?: string | null; metadata?: Record<string, unknown> | null }) => void;
    'asset:linked': (payload: { assetId: string; messageId: string; accountId: string }) => void;
    'asset:transcription_completed': (payload: { assetId: string; accountId: string; transcription: string; language?: string; model: string; processedAt: Date }) => void;
    'asset:enrichment_failed': (payload: { assetId: string; reason: string; metadata?: Record<string, unknown> | null }) => void;
    'kernel:wakeup': (payload?: { source: string; timestamp: number }) => void;
    'kernel:cognition:wakeup': (payload: { conversationId: string; accountId: string }) => void;
    'identity:resolved': (payload: { sequenceNumber: number; actorId: string; contextId: string }) => void;
    'cognition:turn_processed': (payload: { conversationId: string; accountId: string; runtimeUsed: string; actionCount: number }) => void;
    'cognition:turn_failed': (payload: { conversationId: string; accountId: string; error: string; attempt: number }) => void;
    'account.profile.updated': (payload: { accountId: string; allowAutomatedUse: boolean }) => void;
    'template.authorization.changed': (payload: { templateId: string; accountId: string; allowAutomatedUse: boolean }) => void;
    'fluxcore.template.settings.changed': (payload: { templateId: string; accountId: string; authorizeForAI: boolean }) => void;
    'fluxcore.work_proposed': (payload: { 
        proposedWorkId: string; 
        accountId: string; 
        conversationId: string; 
        intent: string; 
        typeId: string; 
        candidateSlots: any[] 
    }) => void;
    'relationship.context.updated': (payload: { relationshipId: string; accountId?: string }) => void;
    'knowledge.authorized': (payload: { accountId: string; allowAutomatedUse: boolean }) => void;
    'appointments.authorization.changed': (payload: { accountId: string }) => void;
    'assistant.config.updated': (payload: { accountId: string; assistantId: string; change: 'activated' | 'updated' }) => void;
    'policy.config.updated': (payload: { accountId: string }) => void;
    'telemetry:pipeline_step': (payload: any) => void;
    'telemetry:distributed_trace': (payload: any) => void;
    'core:activity': (payload: { conversationId: string; accountId: string; activity: string; metadata?: any }) => void;
}

export class CoreEventBus extends EventEmitter {
    private pub = getRedisPub();
    private sub = getRedisSub();

    constructor() {
        super();
        console.log(`🔌 CoreEventBus initialized (PID: ${PROCESS_ID})`);
        this.initRedis();
    }

    private async initRedis() {
        try {
            await this.sub.subscribe(REDIS_CHANNEL);
            this.sub.on('message', (channel, message) => {
                if (channel === REDIS_CHANNEL) {
                    const { event, args, originPid } = JSON.parse(message);
                    
                    // Solo re-emitimos si el evento no nació en este proceso
                    if (originPid !== PROCESS_ID) {
                        super.emit(event, ...args);
                    }
                }
            });
        } catch (err: any) {
            console.error('[CoreEventBus] Redis sub initialization failed:', err.message);
        }
    }

    emit<K extends keyof CoreEventMap>(event: K, ...args: Parameters<CoreEventMap[K]>): boolean {
        // 1. Emitir localmente (siempre, para velocidad y modo degradado)
        const result = super.emit(event, ...args);

        // 2. Publicar en Redis para otros procesos
        try {
            const payload = JSON.stringify({
                event,
                args,
                originPid: PROCESS_ID,
                timestamp: Date.now()
            });

            this.pub.publish(REDIS_CHANNEL, payload).catch(err => {
                // Logueamos pero no fallamos (modo degradado)
                if (process.env.NODE_ENV !== 'test') {
                    console.warn(`[CoreEventBus] Redis publish failed for event ${event}:`, err.message);
                }
            });
        } catch (err: any) {
            // Manejar error de serialización (ej: estructuras circulares)
            console.error(`[CoreEventBus] Failed to serialize event ${event} for Redis:`, err.message);
        }

        return result;
    }

    on<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.on(event, listener);
    }

    off<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.off(event, listener);
    }

    /**
     * Cierra las conexiones de Redis de forma limpia
     */
    async shutdown() {
        console.log('[CoreEventBus] Shutting down...');
        await quitRedis();
    }
}

export const coreEventBus = new CoreEventBus();

