
import type { MessageContent } from '@fluxcore/db';
import type { ProcessMessageResult } from '../services/extension-host.service';
import type { TriggerEvaluation } from '../services/automation-controller.service';

export interface MessageEnvelope {
    id?: string;
    conversationId: string;
    senderAccountId: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    timestamp?: Date;
    // Contexto adicional para extensiones
    targetAccountId?: string;  // La cuenta que recibe el mensaje
}

export interface ReceiveResult {
    success: boolean;
    messageId?: string;
    error?: string;
    // Resultados del procesamiento de extensiones
    extensionResults?: ProcessMessageResult[];
    // COR-007: Información de automatización
    automation?: TriggerEvaluation;
}
