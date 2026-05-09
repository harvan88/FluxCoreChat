import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';
import crypto from 'node:crypto';


/**
 * ChatCore Reality Adapter (GATEWAY)
 * 
 * Este servicio actúa como la frontera causal entre el usuario y el Kernel.
 * Certifica que un humano intentó comunicarse a través de la interfaz de ChatCore.
 * 
 * NO depende de la base de datos de mensajes.
 * NO contiene lógica de negocio.
 * SOLO observa y certifica.
 */
export class ChatCoreGatewayService {
    // Identidad del observador
    private readonly ADAPTER_ID = 'chatcore-gateway';
    private readonly ADAPTER_VERSION = '1.0.0';
    private readonly DRIVER_ID = 'chatcore/internal';
    private readonly SIGNING_SECRET = process.env.CHATCORE_SIGNING_SECRET || 'chatcore-dev-secret-local';

    /**
     * Certifica una intención de comunicación humana.
     * Debe llamarse DESPUÉS de validar el token de usuario pero ANTES de cualquier efecto.
     */
    async certifyIngress(params: {
        accountId: string; 
        userId?: string;   
        payload: any;
        meta: {
            ip?: string;
            userAgent?: string;
            clientTimestamp?: string;
            conversationId?: string;
            requestId?: string; 
        }
    }): Promise<{ accepted: boolean; signalId?: number; reason?: string }> {
        try {
            // 1. Construir Evidencia Cruda
            const evidenceRaw = {
                accountId: params.accountId, 
                content: params.payload,
                context: {
                    conversationId: params.meta.conversationId,
                    userId: params.userId || params.accountId, 
                },
                metadata: {
                    ...params.meta, 
                    ip: params.meta.ip,
                    userAgent: params.meta.userAgent,
                    clientTimestamp: params.meta.clientTimestamp,
                    requestId: params.meta.requestId,
                },
                security: {
                    authMethod: 'bearer_token',
                    scope: 'user' 
                }
            };

            // 2. Construir Evidence Struct
            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId({
                    userId: params.userId || params.accountId,
                    payload: params.payload,
                    meta: params.meta
                }),
                    entryPoint: 'api/messages', 
                },
                claimedOccurredAt: params.meta.clientTimestamp ? new Date(params.meta.clientTimestamp).toISOString() : new Date().toISOString(),
            };
            
            // 3. Definir Actores
            const actorRef = {
                namespace: '@fluxcore/internal',
                key: params.accountId 
            };

            // 4. Construir Candidato a Señal
            const candidate: KernelCandidateSignal = {
                factType: 'EXTERNAL_INPUT_OBSERVED',
                source: actorRef,   
                subject: actorRef,  
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '' 
                }
            };

            // 5. Firmar Candidato
            candidate.certifiedBy.signature = this.signCandidate(candidate);

            const seq = await kernel.ingestSignal(candidate);

            // 🎯 TELEMETRÍA (Fase 1): Ingreso Certificado
            try {
                const { coreEventBus } = await import('../../core/events');
                coreEventBus.emit('telemetry:pipeline_step', {
                    messageId: seq.toString(),
                    conversationId: params.meta.conversationId || 'unknown',
                    accountId: params.accountId,
                    step: 'ingreso',
                    status: 'success',
                    timestamp: new Date().toISOString()
                });
            } catch (e) {}

            return { accepted: true, signalId: seq };

        } catch (error: any) {
            console.error(`[ChatCoreGateway] ❌ Certification failed:`, error.message);
            console.error(`[ChatCoreGateway] 🔍 FULL ERROR STACK:`, error.stack);
            console.error(`[ChatCoreGateway] 🔍 ERROR TYPE:`, typeof error);
            console.error(`[ChatCoreGateway] 🔍 ERROR NAME:`, error.name);
            console.error(`[ChatCoreGateway] 🔍 ERROR CODE:`, error.code);
            // El Gateway NUNCA debe bloquear el tráfico si el Kernel falla (Graceful degradation? No, sovereignty first).
            // PERO: Si el Kernel rechaza, es que la realidad no fue aceptada.
            // En este diseño estricto, si el Kernel falla, el mensaje NO DEBE procesarse.
            // Sin embargo, para H2/H3 y legacy compatibility, loggeamos y retornamos false.
            return { accepted: false, reason: error.message };
        }
    }

    /**
     * Genera un ID determinista si el cliente no envió uno.
     * HMAC(userId + contentHash + timestampBucket)
     */
    private generateFallbackId(params: { userId: string; payload: any; meta: any }): string {
        const contentHash = crypto.createHash('sha256')
            .update(JSON.stringify(params.payload))
            .digest('hex');
        
        // Bucket de 1 segundo para evitar colisiones en ráfagas muy rápidas
        // pero permitir reintentos en segundos distintos
        const timeBucket = Math.floor(Date.now() / 1000); 

        return crypto.createHash('sha256')
            .update(`${params.userId}:${contentHash}:${timeBucket}`)
            .digest('hex');
    }

    private signCandidate(candidate: KernelCandidateSignal): string {
        // Implementación canónica de firma (copiada de Kernel.canonicalize para consistencia)
        // DEUDA: Mover canonicalize a shared/kernel-utils
        const canonical = this.canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject ?? null,
            object: candidate.object ?? null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });

        return crypto
            .createHmac('sha256', this.SIGNING_SECRET)
            .update(canonical)
            .digest('hex');
    }

    // Duplicado de Kernel.canonicalize para independencia (Adapter no debe importar internal Kernel logic si fuera remoto)
    private canonicalize(value: unknown): string {
        if (
            value === null ||
            typeof value !== 'object' ||
            value instanceof Date
        ) {
            return JSON.stringify(value);
        }
    
        if (Array.isArray(value)) {
            return '[' + value.map(v => this.canonicalize(v)).join(',') + ']';
        }
    
        const result = '{' +
            Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, val]) => JSON.stringify(key) + ':' + this.canonicalize(val))
                .join(',') +
            '}';

        return result;
    }

    /**
     * Certifica cambios de estado de ChatCore (sobrescritura, edición, destrucción)
     * 
     * Ontológicamente: Declara que "el sistema observó un cambio de estado estructural"
     */
    async certifyStateChange(params: {
        stateChange: 'message_content_overwritten' | 'message_content_edited' | 'conversation_destroyed';
        messageId?: string;
        overwrittenBy?: string;
        editedBy?: string;
        conversationId?: string;
        originalContentHash?: string;
        newContentHash?: string;
        destructionReason?: string;
        messageCount?: number;
        lastMessageAt?: string;
    }): Promise<{ accepted: boolean; signalId?: number; reason?: string }> {
        // 🚨 VALIDACIÓN CRÍTICA - El messageId es obligatorio para certificar
        if (!params.messageId) {
            const error = 'certifyStateChange: messageId is required for state change certification';
            console.error(`[ChatCoreGateway] ❌ ${error}`);
            return { accepted: false, reason: error };
        }
        
        try {
            const evidenceRaw = {
                stateChange: params.stateChange,
                messageId: params.messageId,
                overwrittenBy: params.overwrittenBy,
                editedBy: params.editedBy,
                conversationId: params.conversationId,
                originalContentHash: params.originalContentHash,
                newContentHash: params.newContentHash,
                mutatedAt: new Date().toISOString(),
                semantics: 'structural_mutation_certified'
            };

            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID, 
                    externalId: `${params.stateChange}-${params.messageId}-${Date.now()}`,
                    entryPoint: 'message-deletion.service'
                }
            };

            const sourceRef = { namespace: '@chatcore/internal', key: 'message-service' };
            const subjectRef = { namespace: '@chatcore/messages', key: params.messageId };

            const candidate: KernelCandidateSignal = {
                factType: 'EXTERNAL_STATE_OBSERVED', 
                source: sourceRef,
                subject: subjectRef,
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: ''
                }
            };

            // 5. Firmar Candidato
            candidate.certifiedBy.signature = this.signCandidate(candidate);

            const seq = await kernel.ingestSignal(candidate);

            return { accepted: true, signalId: seq };

        } catch (error: any) {
            console.error(`[ChatCoreGateway] ❌ State change certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }
}

export const chatCoreGateway = new ChatCoreGatewayService();
