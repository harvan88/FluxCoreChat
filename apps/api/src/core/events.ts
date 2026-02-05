
import { EventEmitter } from 'node:events';
import type { MessageEnvelope, ReceiveResult } from './types';

export interface CoreEventMap {
    // Evento emitido cuando un mensaje ha sido persistido y procesado inicialmente
    'core:message_received': (payload: { envelope: MessageEnvelope; result: ReceiveResult }) => void;
    // Evento emitido cuando un medio (audio/imagen) ha sido procesado/enriquecido
    'media:enriched': (payload: { messageId: string; accountId: string; type: string; enrichment: any }) => void;
}

export class CoreEventBus extends EventEmitter {
    constructor() {
        super();
        console.log('🔌 CoreEventBus initialized (Singleton Check)');
    }

    emit<K extends keyof CoreEventMap>(event: K, payload: Parameters<CoreEventMap[K]>[0]): boolean {
        return super.emit(event, payload);
    }

    on<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.on(event, listener);
    }

    off<K extends keyof CoreEventMap>(event: K, listener: CoreEventMap[K]): this {
        return super.off(event, listener);
    }
}

export const coreEventBus = new CoreEventBus();
