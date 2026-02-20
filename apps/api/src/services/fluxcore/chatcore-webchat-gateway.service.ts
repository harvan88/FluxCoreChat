import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';
import crypto from 'node:crypto';

/**
 * ChatCore Webchat Reality Adapter (GATEWAY)
 *
 * Certifica observaciones desde el widget embebible.
 * La identidad del visitante puede ser provisional (visitor_token)
 * o real (autenticado).
 *
 * NO depende de la base de datos de mensajes.
 * NO contiene lógica de negocio.
 * SOLO observa y certifica.
 */
export class ChatCoreWebchatGatewayService {
    private readonly ADAPTER_ID = 'chatcore-webchat-gateway';
    private readonly ADAPTER_VERSION = '1.0.0';
    private readonly DRIVER_ID = 'chatcore/webchat';
    private readonly SIGNING_SECRET =
        process.env.WEBCHAT_SIGNING_SECRET || 'webchat-dev-secret-local';

    /**
     * B1 — Certifica un mensaje entrante desde el widget.
     * El visitante es identificado por su visitor_token (provisional).
     */
    async certifyIngress(params: {
        visitorToken: string;   // Provisional identity
        tenantId: string;       // Account that owns the widget
        payload: any;
        meta: {
            ip?: string;
            userAgent?: string;
            clientTimestamp?: string;
            conversationId?: string;
            requestId?: string;
        };
    }): Promise<{ accepted: boolean; signalId?: number; reason?: string }> {
        try {
            const evidenceRaw = {
                visitorToken: params.visitorToken,
                tenantId: params.tenantId,
                content: params.payload,
                context: {
                    conversationId: params.meta.conversationId,
                },
                metadata: {
                    ip: params.meta.ip,
                    userAgent: params.meta.userAgent,
                    clientTimestamp: params.meta.clientTimestamp,
                    requestId: params.meta.requestId,
                },
                security: {
                    authMethod: 'visitor_token',
                    scope: 'anonymous',
                },
            };

            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId(params.visitorToken, params.payload),
                    entryPoint: 'widget/message',
                },
                claimedOccurredAt: params.meta.clientTimestamp
                    ? new Date(params.meta.clientTimestamp)
                    : new Date(),
            };

            const sourceRef = {
                namespace: 'chatcore/webchat-visitor',
                key: params.visitorToken,
            };

            const candidate: KernelCandidateSignal = {
                factType: 'EXTERNAL_INPUT_OBSERVED',
                source: sourceRef,
                subject: sourceRef,
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '',
                },
            };

            candidate.certifiedBy.signature = this.signCandidate(candidate);

            const seq = await kernel.ingestSignal(candidate);
            console.log(`[WebchatGateway] 👁️ Certified widget ingress from visitor ${params.visitorToken}. Signal #${seq}`);
            return { accepted: true, signalId: seq };

        } catch (error: any) {
            console.error(`[WebchatGateway] ❌ Certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }

    /**
     * B2 — Certifica un evento de vinculación de identidad.
     * El visitante provisional se autentica y vincula a una cuenta real.
     */
    async certifyConnectionEvent(params: {
        visitorToken: string;   // Provisional actor (subject)
        realAccountId: string;  // Real account after authentication (object)
        tenantId: string;
        meta: {
            ip?: string;
            userAgent?: string;
            requestId?: string;
        };
    }): Promise<{ accepted: boolean; signalId?: number; reason?: string }> {
        try {
            const evidenceRaw = {
                visitorToken: params.visitorToken,
                realAccountId: params.realAccountId,
                tenantId: params.tenantId,
                event: 'visitor_authenticated',
                metadata: {
                    ip: params.meta.ip,
                    userAgent: params.meta.userAgent,
                    requestId: params.meta.requestId,
                },
            };

            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId(params.visitorToken, params.realAccountId),
                    entryPoint: 'widget/identity-link',
                },
                claimedOccurredAt: new Date(),
            };

            const candidate: KernelCandidateSignal = {
                factType: 'CONNECTION_EVENT_OBSERVED',
                source: {
                    namespace: 'chatcore/webchat-gateway',
                    key: params.tenantId,
                },
                subject: {
                    namespace: 'chatcore/webchat-visitor',
                    key: params.visitorToken,
                },
                object: {
                    namespace: 'chatcore/account',
                    key: params.realAccountId,
                },
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '',
                },
            };

            candidate.certifiedBy.signature = this.signCandidate(candidate);

            const seq = await kernel.ingestSignal(candidate);
            console.log(`[WebchatGateway] 🔗 Identity link certified: visitor ${params.visitorToken} → account ${params.realAccountId}. Signal #${seq}`);
            return { accepted: true, signalId: seq };

        } catch (error: any) {
            console.error(`[WebchatGateway] ❌ Connection event certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }

    private generateFallbackId(key: string, payload: any): string {
        const contentHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
        const timeBucket = Math.floor(Date.now() / 1000);
        return crypto
            .createHash('sha256')
            .update(`${key}:${contentHash}:${timeBucket}`)
            .digest('hex');
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

export const chatCoreWebchatGateway = new ChatCoreWebchatGatewayService();
