import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';
import crypto from 'node:crypto';

/**
 * FluxCore Cognition Gateway
 * 
 * Reality Adapter de clase GATEWAY que certifica que el sistema cognitivo
 * de FluxCore produjo una respuesta. Es el puente entre FluxCore (cerebro)
 * y el Kernel (certificador de realidad).
 * 
 * ChatCore observará la señal AI_RESPONSE_GENERATED a través de su
 * proyector y se encargará de entregar el mensaje al mundo exterior.
 * 
 * FluxCore NO escribe directamente en la DB de ChatCore.
 * FluxCore NO hace broadcast WebSocket.
 * FluxCore SOLO certifica hechos en el Kernel.
 */
export class CognitionGatewayService {
    private readonly ADAPTER_ID = 'fluxcore-cognition-gateway';
    private readonly ADAPTER_VERSION = '1.0.0';
    private readonly DRIVER_ID = 'fluxcore/cognition';
    private readonly SIGNING_SECRET = process.env.FLUXCORE_SIGNING_SECRET || 'fluxcore-cognition-dev-secret-local';

    /**
     * Certifica que FluxCore generó una respuesta AI.
     * El Kernel la registra como señal y ChatProjector la entrega.
     */
    async certifyAiResponse(params: {
        conversationId: string;
        accountId: string;       // Cuenta que responde (el asistente/negocio)
        targetAccountId: string; // Cuenta que recibe la respuesta (el usuario)
        content: { text: string; media?: any[] };
        turnId: number;
        triggerSignalId?: number; // ✅ Nuevo: Para trazabilidad unificada
        runtimeId?: string;
        model?: string;
        provider?: string;      // ✅ Nuevo
        policyContext?: any;    // ✅ Nuevo
    }): Promise<{ accepted: boolean; signalId?: number; reason?: string }> {
        try {
            console.log(`[CognitionGateway] 🧠 CERTIFY_AI_RESPONSE START`);
            console.log(`  - conversationId: ${params.conversationId.slice(0, 8)}`);
            console.log(`  - accountId (responder): ${params.accountId.slice(0, 8)}`);
            console.log(`  - targetAccountId (receiver): ${params.targetAccountId.slice(0, 8)}`);
            console.log(`  - content: "${params.content.text.substring(0, 100)}..."`);
            console.log(`  - turnId: ${params.turnId}`);

            // 1. Construir Evidencia Cruda
            const evidenceRaw = {
                accountId: params.accountId,
                targetAccountId: params.targetAccountId,
                content: params.content,
                context: {
                    conversationId: params.conversationId,
                    turnId: params.turnId,
                    runtimeId: params.runtimeId || 'unknown',
                    model: params.model || 'unknown',
                    provider: params.provider || 'unknown',
                    triggerSignalId: params.triggerSignalId, // ✅ Para correlación
                    // ✅ PolicyContext completo para trazabilidad
                    policyContext: params.policyContext ? {
                        accountId: params.policyContext.accountId,
                        mode: params.policyContext.mode,
                        authorizedTemplates: params.policyContext.authorizedTemplates?.length || 0,
                    } : undefined,
                },
                generatedBy: 'ai',
                generatedAt: new Date().toISOString(),
            };

            // 2. Construir Evidence Struct
            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: `ai-response-${params.turnId}-${Date.now()}`,
                    entryPoint: 'fluxcore/cognition-worker',
                },
                claimedOccurredAt: new Date().toISOString(),
            };

            // 3. Actor refs
            const sourceRef = {
                namespace: '@fluxcore/cognition',
                key: params.accountId,
            };

            // 4. Construir Candidato
            const candidate: KernelCandidateSignal = {
                factType: 'AI_RESPONSE_GENERATED',
                source: sourceRef,
                subject: sourceRef,
                object: {
                    namespace: '@fluxcore/internal',
                    key: params.targetAccountId,
                },
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '',
                },
            };

            // 5. Firmar
            candidate.certifiedBy.signature = this.signCandidate(candidate);

            // 6. Ingesta en Kernel
            const seq = await kernel.ingestSignal(candidate);
            console.log(`[CognitionGateway] ✅ AI response certified as signal #${seq}`);

            // 🎯 TELEMETRÍA (Fase 1): Respuesta certificada
            try {
                const { coreEventBus } = await import('../../core/events');
                coreEventBus.emit('telemetry:pipeline_step', {
                    messageId: String(params.triggerSignalId || seq),
                    conversationId: params.conversationId,
                    accountId: params.accountId,
                    step: 'certificacion',
                    status: 'success',
                    metadata: { 
                        newSignalId: seq,
                        triggerSignalId: params.triggerSignalId 
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (e) {}

            return { accepted: true, signalId: seq };
        } catch (error: any) {
            console.error(`[CognitionGateway] ❌ Certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }

    private signCandidate(candidate: KernelCandidateSignal): string {
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

export const cognitionGateway = new CognitionGatewayService();
