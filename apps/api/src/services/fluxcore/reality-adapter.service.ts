import crypto from 'node:crypto';
import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, PhysicalFactType } from '../../core/types';
import { messageCore } from '../../core/message-core';
import type { NormalizedMessage, NormalizedStatusEvent } from '../../../../../packages/adapters/src';

// Constants matching the bootstrapped adapter in DB
const ADAPTER_ID = 'fluxcore/whatsapp-gateway';
const ADAPTER_VERSION = '1.0.0-rfc0001';
const SIGNING_SECRET = 'development_signing_secret_wa'; // Matches bootstrap-wa-adapter.sql

/**
 * RealityAdapterService
 *
 * The Gateway between the dirty external world (Drivers)
 * and the sovereign internal world (Kernel).
 *
 * Responsibilities:
 * 1. Receive NormalizedMessage from drivers
 * 2. Translate to Physical Fact (Ontology)
 * 3. Sign with authorized secret
 * 4. Submit to Kernel for certification
 */
export class RealityAdapterService {

    /**
     * Process an external observation (driver message) into a certified Fact.
     */
    async processExternalObservation(message: NormalizedMessage): Promise<number> {

        console.log(`[Diag][Adapter] message=${message.externalId || message.id || 'unknown'} runtime=- decision=respond stage=received channel=${message.channel}`);
        // 1. Ontology Mapping
        const factType = this.resolveFactType(message);

        // 2. Construct Candidate Signal
        const signal: KernelCandidateSignal = {
            factType,

            // Source: Causal origin (Technical channel)
            source: {
                namespace: 'channel',
                key: `${message.channel}/${message.externalId}`
            },

            // Subject: The external actor (if identified by driver)
            subject: message.from?.id ? {
                namespace: `${message.channel}/user`,
                key: message.from.id
            } : undefined,

            // Object: The target system/resource (if applicable)
            object: message.to?.id ? {
                namespace: `${message.channel}/system`,
                key: message.to.id
            } : undefined,

            // Evidence: THE RAW TRUTH
            evidence: {
                raw: message,
                format: 'normalized_message_v1',
                provenance: {
                    driverId: `@fluxcore/${message.channel}`, // Must match DB driver_id
                    externalId: message.externalId,
                    entryPoint: message.to?.id // Hint for tenant resolution
                },
                claimedOccurredAt: message.timestamp
            },

            // Certification
            certifiedBy: {
                adapterId: ADAPTER_ID,
                adapterVersion: ADAPTER_VERSION,
                signature: '' // Signed below
            }
        };

        // 3. Sign the Signal
        signal.certifiedBy.signature = this.signSignal(signal);

        // 🔑 DELEGAR A CHATCORE: Usar messageCore para procesamiento correcto
        console.log(`[Diag][Adapter->Kernel] message=${message.externalId || message.id || 'unknown'} runtime=- decision=respond fact=${factType} stage=certify`);
        console.log(`[RealityAdapter] 📡 Delegating ${factType} from ${message.from.id} to ChatCore...`);
        
        // Delegar a ChatCore para persistencia → outbox → certificación
        try {
            await messageCore.receiveFromAdapter(message, message.channel);
            console.log(`[RealityAdapter] ✅ Message delegated to ChatCore for processing`);
            return 0; // Placeholder - ChatCore maneja la certificación
        } catch (error) {
            console.error(`[RealityAdapter] ❌ Failed to delegate to ChatCore:`, error);
            throw error;
        }
    }

    /**
     * Process a status update (delivery/read receipt) into a certified Fact.
     */
    async processStatusObservation(event: NormalizedStatusEvent): Promise<number> {
        // 1. Resolve Fact Type
        const factType: PhysicalFactType = (['sent', 'delivered', 'read', 'failed'].includes(event.status))
            ? 'DELIVERY_SIGNAL_OBSERVED'
            : 'EXTERNAL_STATE_OBSERVED';

        console.log(`[Diag][Adapter] message=${event.messageId} runtime=- decision=respond stage=status_received channel=${event.channel}`);
        // 2. Construct Candidate Signal
        const signal: KernelCandidateSignal = {
            factType,
            source: {
                namespace: event.channel,
                key: event.externalId || `status/${event.messageId}/${event.status}/${event.timestamp.getTime()}`
            },
            subject: event.recipientId ? {
                namespace: `${event.channel}/user`,
                key: event.recipientId
            } : undefined,
            object: {
                namespace: `${event.channel}/message`,
                key: event.messageId
            },
            evidence: {
                raw: event,
                format: 'normalized_status_v1',
                provenance: {
                    driverId: `@fluxcore/${event.channel}`,
                    externalId: event.externalId,
                },
                claimedOccurredAt: event.timestamp
            },
            certifiedBy: {
                adapterId: ADAPTER_ID,
                adapterVersion: ADAPTER_VERSION,
                signature: ''
            }
        };

        signal.certifiedBy.signature = this.signSignal(signal);

        console.log(`[Diag][Adapter->Kernel] message=${event.messageId} runtime=- decision=respond fact=${factType} stage=status_certify`);
        console.log(`[RealityAdapter] 📡 Delegating STATUS ${event.status} for msg ${event.messageId}...`);
        
        // 🔑 DELEGAR A CHATCORE: Para eventos de status, usar certificación directa (no hay mensaje)
        try {
            const sequence = await kernel.ingestSignal(signal);
            console.log(`[RealityAdapter] ✅ Status certified as Sequence #${sequence}`);
            return sequence;
        } catch (error) {
            console.error(`[RealityAdapter] ❌ Failed to certify status:`, error);
            throw error;
        }
    }

    private resolveFactType(message: NormalizedMessage): PhysicalFactType {
        // Simple mapping based on message content type
        switch (message.content.type) {
            case 'text':
            case 'image':
            case 'audio':
            case 'video':
            case 'document':
            case 'location':
            case 'contact':
            case 'template':
                return 'EXTERNAL_INPUT_OBSERVED';
            default:
                return 'EXTERNAL_STATE_OBSERVED';
        }
    }

    private signSignal(signal: KernelCandidateSignal): string {
        const content = this.canonicalize({
            factType: signal.factType,
            source: signal.source,
            subject: signal.subject ?? null,
            object: signal.object ?? null,
            evidence: signal.evidence,
            adapterId: signal.certifiedBy.adapterId,
            adapterVersion: signal.certifiedBy.adapterVersion,
        });

        return crypto
            .createHmac('sha256', SIGNING_SECRET)
            .update(content)
            .digest('hex');
    }

    /**
     * Canonical JSON serialization.
     * MUST match Kernel.canonicalize() exactly to ensure signature verification passes.
     */
    private canonicalize(value: unknown): string {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return '[' + value.map((v) => this.canonicalize(v)).join(',') + ']';
        }

        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

        return '{' + entries
            .map(([key, val]) => JSON.stringify(key) + ':' + this.canonicalize(val))
            .join(',') + '}';
    }
}

export const realityAdapterService = new RealityAdapterService();
