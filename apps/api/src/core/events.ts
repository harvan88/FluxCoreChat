
import { EventEmitter } from 'node:events';
import type { MessageEnvelope, ReceiveResult } from './types';

export interface CoreEventMap {
    // Evento emitido cuando un mensaje ha sido persistido y procesado inicialmente
    'core:message_received': (payload: { envelope: MessageEnvelope; result: ReceiveResult }) => void;
    // Evento emitido cuando un medio (audio/imagen) ha sido procesado/enriquecido
    'media:enriched': (payload: { messageId: string; accountId: string; type: string; enrichment: any }) => void;
    // Evento emitido cuando un asset llega a estado ready y está listo para orquestación
    'asset:ready': (payload: { assetId: string; accountId: string; mimeType?: string | null; sizeBytes?: number | null; checksum?: string | null; metadata?: Record<string, unknown> | null }) => void;
    // Evento emitido cuando el pipeline de enriquecimiento falla para un asset
    'asset:enrichment_failed': (payload: { assetId: string; reason: string; metadata?: Record<string, unknown> | null }) => void;


    // SOVEREIGN KERNEL INTERRUPTS
    'kernel:wakeup': () => void;
    'kernel:cognition:wakeup': (payload: { conversationId: string; accountId: string }) => void;

    // PROJECTOR EVENTS (secondary triggers, not source of truth)
    'identity:resolved': (payload: { sequenceNumber: number; actorId: string; contextId: string }) => void;

    // COGNITION PIPELINE EVENTS (v8.2)
    'cognition:turn_processed': (payload: { conversationId: string; accountId: string; runtimeUsed: string; actionCount: number }) => void;
    'cognition:turn_failed': (payload: { conversationId: string; accountId: string; error: string; attempt: number }) => void;

    // POLICY CONTEXT AUTHORIZATION EVENTS
    'account.profile.updated': (payload: { accountId: string; allowAutomatedUse: boolean }) => void;
    'template.authorization.changed': (payload: { templateId: string; accountId: string; allowAutomatedUse: boolean }) => void;
    'relationship.context.updated': (payload: { relationshipId: string; accountId?: string }) => void;
    'knowledge.authorized': (payload: { accountId: string; allowAutomatedUse: boolean }) => void;
    'appointments.authorization.changed': (payload: { accountId: string }) => void;

    // ASSISTANT CONFIGURATION EVENTS (invalidate PolicyContext cache)
    'assistant.config.updated': (payload: { accountId: string; assistantId: string; change: 'activated' | 'updated' }) => void;
    'policy.config.updated': (payload: { accountId: string }) => void;
}

export class CoreEventBus extends EventEmitter {
    constructor() {
        super();
        console.log('🔌 CoreEventBus initialized (Singleton Check)');
    }

    emit<K extends keyof CoreEventMap>(event: K, ...args: Parameters<CoreEventMap[K]>): boolean {
        return super.emit(event, ...args);
    }

    on<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.on(event, listener);
    }

    off<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.off(event, listener);
    }
}

export const coreEventBus = new CoreEventBus();
