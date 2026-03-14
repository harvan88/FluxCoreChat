import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';

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
        accountId: string; // The Business Account ID (must exist in accounts table)
        userId?: string;   // The Authenticated User ID (optional, for audit)
        payload: any;
        meta: {
            ip?: string;
            userAgent?: string;
            clientTimestamp?: string;
            conversationId?: string;
            requestId?: string; // Client-provided ID for idempotency
        }
    }): Promise<{ accepted: boolean; signalId?: number; reason?: string }> {
        try {
            console.log(`[ChatCoreGateway] 🔍 CERTIFY_INGRESS START ==================`);
            console.log(`[ChatCoreGateway] 📥 INPUT PARAMS:`);
            console.log(`  - accountId: ${params.accountId}`);
            console.log(`  - userId: ${params.userId || '(not provided)'}`);
            console.log(`  - payload: ${JSON.stringify(params.payload).substring(0, 200)}...`);
            console.log(`  - meta: ${JSON.stringify(params.meta, null, 2)}`);

            // 1. Construir Evidencia Cruda (lo que el sistema VIÓ)
            const evidenceRaw = {
                accountId: params.accountId, // Required for IdentityProjector context
                content: params.payload,
                context: {
                    conversationId: params.meta.conversationId,
                    userId: params.userId || params.accountId, // Fallback to account if no user
                },
                metadata: {
                    ip: params.meta.ip,
                    userAgent: params.meta.userAgent,
                    clientTimestamp: params.meta.clientTimestamp,
                    requestId: params.meta.requestId,
                },
                security: {
                    authMethod: 'bearer_token',
                    scope: 'user' // TODO: Refine scope if needed
                }
            };
            console.log(`[ChatCoreGateway] 📋 evidenceRaw constructed: ${JSON.stringify(evidenceRaw, null, 2).substring(0, 300)}...`);

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
                    entryPoint: 'api/messages', // Endpoint lógico
                },
                claimedOccurredAt: params.meta.clientTimestamp ? new Date(params.meta.clientTimestamp).toISOString() : new Date().toISOString(),
            };
            
            // 🔍 DIAGNÓSTICO: Verificar tipos de evidence
            console.log(`[ChatCoreGateway] � EVIDENCE TYPE CHECK:`);
            console.log(`  - evidence.raw type:`, typeof evidence.raw);
            console.log(`  - evidence.format type:`, typeof evidence.format, '=', evidence.format);
            console.log(`  - evidence.provenance type:`, typeof evidence.provenance);
            console.log(`  - evidence.provenance.driverId type:`, typeof evidence.provenance.driverId);
            console.log(`  - evidence.provenance.externalId type:`, typeof evidence.provenance.externalId);
            console.log(`  - evidence.claimedOccurredAt type:`, typeof evidence.claimedOccurredAt, '=', evidence.claimedOccurredAt);
            console.log(`  - format: ${evidence.format}`);
            console.log(`  - driverId: ${evidence.provenance.driverId}`);
            console.log(`  - externalId: ${evidence.provenance.externalId}`);
            console.log(`  - entryPoint: ${evidence.provenance.entryPoint}`);
            console.log(`  - claimedOccurredAt: ${evidence.claimedOccurredAt}`);

            // 3. Definir Actores (Namespace @fluxcore/internal para usuarios del sistema)
            const actorRef = {
                namespace: '@fluxcore/internal',
                key: params.accountId // Identity is tied to the Account
            };
            console.log(`[ChatCoreGateway] 👤 Actor defined: namespace=${actorRef.namespace}, key=${actorRef.key}`);

            // 4. Construir Candidato a Señal
            const candidate: KernelCandidateSignal = {
                factType: 'EXTERNAL_INPUT_OBSERVED',
                source: actorRef,   // El origen es el usuario
                subject: actorRef,  // El sujeto también es el usuario (auto-representado)
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '' // Se firma abajo
                }
            };
            console.log(`[ChatCoreGateway] 📤 KernelCandidateSignal constructed:`);
            console.log(`  - factType: ${candidate.factType}`);
            console.log(`  - source: ${JSON.stringify(candidate.source)}`);
            console.log(`  - subject: ${JSON.stringify(candidate.subject)}`);
            console.log(`  - adapterId: ${candidate.certifiedBy.adapterId}`);
            console.log(`  - adapterVersion: ${candidate.certifiedBy.adapterVersion}`);

            // 5. Firmar Candidato
            candidate.certifiedBy.signature = this.signCandidate(candidate);
            console.log(`[ChatCoreGateway] ✍️  Candidate signed: signature=${candidate.certifiedBy.signature.substring(0, 16)}...`);

            // 6. Ingesta en Kernel (Soberanía)
            console.log(`[ChatCoreGateway] ➡️  Calling kernel.ingestSignal()...`);
            const seq = await kernel.ingestSignal(candidate);

            console.log(`[ChatCoreGateway] ✅ CERTIFY_INGRESS SUCCESS ==================`);
            console.log(`[ChatCoreGateway] 👁️ Certified ingress from ${params.userId || params.accountId}. Signal #${seq}`);
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
        console.log(`[ChatCoreGateway] 🔍 CANONICALIZE INPUT TYPE:`, typeof value);
        console.log(`[ChatCoreGateway] 🔍 CANONICALIZE INPUT:`, value);
        
        if (value === null || typeof value !== 'object') {
            const result = JSON.stringify(value);
            console.log(`[ChatCoreGateway] 🔍 CANONICALIZE PRIMITIVE RESULT:`, result);
            return result;
        }
    
        if (Array.isArray(value)) {
            const result = '[' + value.map(v => this.canonicalize(v)).join(',') + ']';
            console.log(`[ChatCoreGateway] 🔍 CANONICALIZE ARRAY RESULT:`, result);
            return result;
        }
    
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    
        const result = '{' + entries
            .map(([key, val]) => JSON.stringify(key) + ':' + this.canonicalize(val))
            .join(',') + '}';
        console.log(`[ChatCoreGateway] 🔍 CANONICALIZE OBJECT RESULT:`, result);
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
            console.log(`[ChatCoreGateway] 🔍 CERTIFY_STATE_CHANGE START ==================`);
            console.log(`[ChatCoreGateway] 📥 INPUT PARAMS:`);
            console.log(`  - stateChange: ${params.stateChange}`);
            console.log(`  - messageId: ${params.messageId}`);
            console.log(`  - conversationId: ${params.conversationId}`);
            console.log(`  - mutatedBy: ${params.overwrittenBy || params.editedBy}`);
            
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
                    driverId: this.DRIVER_ID, // ✅ Usar el driver_id del adapter
                    externalId: `${params.stateChange}-${params.messageId}-${Date.now()}`,
                    entryPoint: 'message-deletion.service'
                }
            };

            const sourceRef = { namespace: '@chatcore/internal', key: 'message-service' };
            const subjectRef = { namespace: '@chatcore/messages', key: params.messageId };

            const candidate: KernelCandidateSignal = {
                factType: 'EXTERNAL_STATE_OBSERVED', // ✅ USAR TIPO EXISTENTE
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
            console.log(`[ChatCoreGateway] ✍️  Candidate signed: signature=${candidate.certifiedBy.signature.substring(0, 16)}...`);

            // 6. Ingesta en Kernel (Soberanía)
            console.log(`[ChatCoreGateway] ➡️  Calling kernel.ingestSignal()...`);
            const seq = await kernel.ingestSignal(candidate);

            console.log(`[ChatCoreGateway] ✅ STATE_CHANGE CERTIFIED ==================`);
            console.log(`[ChatCoreGateway] 👁️ State change certified: ${params.stateChange} Signal #${seq}`);
            return { accepted: true, signalId: seq };

        } catch (error: any) {
            console.error(`[ChatCoreGateway] ❌ State change certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }
}

export const chatCoreGateway = new ChatCoreGatewayService();
