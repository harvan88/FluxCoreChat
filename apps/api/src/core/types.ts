
import type { MessageContent } from '@fluxcore/db';
import type { ProcessMessageResult } from '../services/extension-host.service';
import type { TriggerEvaluation } from '../services/automation-controller.service';

export interface MessageEnvelope {
    id?: string;
    conversationId: string;
    senderAccountId: string;
    fromActorId?: string; // Real actor who sent the message (visitor, account, bot)
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    timestamp?: Date;
    // Contexto adicional para extensiones
    targetAccountId?: string;  // La cuenta que recibe el mensaje
    userId?: string; // Usuario autenticado (para outbox)
    meta?: { // Metadatos para outbox
        ip?: string;
        userAgent?: string;
        clientTimestamp?: string;
        requestId?: string;
    };
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

// ═══════════════════════════════════════════════════════════
// RFC-0001 — Kernel Public Types
// The ONLY types the Kernel recognizes.
// ═══════════════════════════════════════════════════════════

/**
 * ActorRef: minimal identity hint for subject/object.
 * Contains ONLY namespace + key. Display names live in projectors.
 */
export type ActorRef = {
    namespace: string;
    key: string;
};

/**
 * SourceRef: causal origin of the observation.
 * Required on every signal — even if no actor is discernible.
 */
export type SourceRef = {
    namespace: string;
    key: string;
};

/**
 * Evidence: the raw physical observation.
 * Contains the original payload, format, and provenance.
 */
export interface Evidence {
    raw: unknown;
    format: string;
    provenance: {
        driverId: string;
        externalId?: string;
        entryPoint?: string;
    };
    claimedOccurredAt?: string; // 🔑 ESTANDARIZADO: ISO string en lugar de Date
}

/**
 * ExternalObservation: what a driver reports before interpretation.
 * A Reality Adapter transforms this into a KernelCandidateSignal.
 */
export interface ExternalObservation {
    driverId: string;
    payload: unknown;
    receivedAt: Date;
}

/**
 * PhysicalFactType: the 6 immutable classes of physical observation.
 * The Kernel ONLY accepts these. Business semantics live in projectors.
 */
export type PhysicalFactType =
    | 'EXTERNAL_INPUT_OBSERVED'
    | 'EXTERNAL_STATE_OBSERVED'
    | 'DELIVERY_SIGNAL_OBSERVED'
    | 'MEDIA_CAPTURED'
    | 'SYSTEM_TIMER_ELAPSED'
    | 'CONNECTION_EVENT_OBSERVED'
    | 'chatcore.message.received'
    | 'AI_RESPONSE_GENERATED';

/**
 * KernelCandidateSignal: the ONLY input the Kernel accepts.
 * Produced exclusively by registered Reality Adapters (SENSOR/GATEWAY).
 * INTERPRETER adapters cannot produce these.
 */
export interface KernelCandidateSignal {
    factType: PhysicalFactType;
    source: SourceRef;
    subject?: ActorRef;
    object?: ActorRef;
    evidence: Evidence;
    certifiedBy: {
        adapterId: string;
        adapterVersion: string;
        signature: string;
    };
}
