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

            // 2. Construir Evidence Struct
            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId(params),
                    entryPoint: 'api/messages', // Endpoint lógico
                },
                claimedOccurredAt: params.meta.clientTimestamp ? new Date(params.meta.clientTimestamp) : new Date(),
            };

            // 3. Definir Actores (Namespace @fluxcore/internal para usuarios del sistema)
            const actorRef = {
                namespace: '@fluxcore/internal',
                key: params.accountId // Identity is tied to the Account
            };

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

            // 5. Firmar Candidato
            candidate.certifiedBy.signature = this.signCandidate(candidate);

            // 6. Ingesta en Kernel (Soberanía)
            const seq = await kernel.ingestSignal(candidate);

            console.log(`[ChatCoreGateway] 👁️ Certified ingress from ${params.userId}. Signal #${seq}`);
            return { accepted: true, signalId: seq };

        } catch (error: any) {
            console.error(`[ChatCoreGateway] ❌ Certification failed:`, error.message);
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
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }
    
        if (Array.isArray(value)) {
            return '[' + value.map(v => this.canonicalize(v)).join(',') + ']';
        }
    
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    
        return '{' + entries
            .map(([key, val]) => JSON.stringify(key) + ':' + this.canonicalize(val))
            .join(',') + '}';
    }
}

export const chatCoreGateway = new ChatCoreGatewayService();
