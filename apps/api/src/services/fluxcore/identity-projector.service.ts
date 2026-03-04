import { BaseProjector } from '../../core/kernel/base.projector';
import { db, fluxcoreSignals, fluxcoreActors, fluxcoreActorIdentityLinks, fluxcoreAddresses, fluxcoreActorAddressLinks, eq } from '@fluxcore/db';
import { actorResolutionService } from './actor-resolution.service';
import { coreEventBus } from '../../core/events';

const WEBCHAT_ADAPTER_ID = 'chatcore-webchat-gateway';
const CHATCORE_GATEWAY_ID = 'chatcore-gateway';
const WEBSOCKET_SUBJECT_NS = 'chatcore/internal';
const WEBCHAT_SUBJECT_NS = 'chatcore/webchat-visitor';

type TransactionClient = typeof db;

type IdentityEvidence = {
    accountPerspective?: string;
    accountId?: string;
    tenantId?: string;
    visitorToken?: string;
    displayName?: string;
};

interface ParsedIdentityEvidence {
    payload: IdentityEvidence;
}

/**
 * IdentityProjector — RFC-0001 §5.9
 *
 * DETERMINISTIC OFF-KERNEL PROJECTION
 *
 * Reads the Journal and resolves global Actors from physical provenance.
 * Uses only `provenance_driver_id` and `subject` (namespace/key)
 * to identify WHO acted — not business-level accountId.
 *
 * AccountActorContext binding happens in a separate step using
 * provenance_entry_point to determine tenant scope.
 */
export class IdentityProjector extends BaseProjector {
    protected projectorName = 'identity';

    /**
     * Resolves an Actor for the given physical journal entry.
     *
     * The Journal has:
     *   - subject_namespace / subject_key (physical identity hint)
     *   - provenance_driver_id (which channel)
     *   - provenance_entry_point (tenant scope hint for AccountActorContext)
     */
    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        console.log(`[IdentityProjector] ▶️ Processing signal #${signal.sequenceNumber} (${signal.factType})`);
        // ── ChatCore Gateway: authenticated users with @fluxcore/internal namespace ──
        if (signal.certifiedByAdapter === CHATCORE_GATEWAY_ID) {
            if (signal.factType === 'chatcore.message.received') {
                return this.projectAuthenticatedActor(signal, tx);
            }
            return; // Other fact types: not our concern
        }
        
        // ── Webchat widget: provisional identity routing ──
        if (signal.certifiedByAdapter === WEBCHAT_ADAPTER_ID) {
            if (signal.factType === 'EXTERNAL_INPUT_OBSERVED') {
                return this.projectProvisionalActor(signal, tx);
            }
            if (
                signal.factType === 'CONNECTION_EVENT_OBSERVED' &&
                signal.subjectNamespace === WEBCHAT_SUBJECT_NS
            ) {
                return this.projectIdentityLink(signal, tx);
            }
            return; // Other webchat fact types: not our concern
        }

        // ── Standard path: resolve actor for authenticated users ──
        if (!signal.subjectNamespace || !signal.subjectKey) {
            return;
        }

        const driverId = signal.provenanceDriverId;
        const externalId = signal.subjectKey;

        const evidence = this.parseEvidence(signal);
        const accountId = evidence.payload.accountPerspective ?? evidence.payload.accountId ?? null;

        if (!accountId) {
            const resolution = await actorResolutionService.resolveActor({
                accountId: '',
                driverId,
                externalId,
                hints: {
                    displayName: evidence.payload.displayName,
                }
            }, tx);

            console.log(`[IdentityProjector] Seq #${signal.sequenceNumber} -> Actor ${resolution.actorId} (no account context)`);
            return;
        }

        const resolution = await actorResolutionService.resolveFromSnapshot({
            accountId,
            snapshot: {
                driverId,
                externalId,
                displayName: evidence.payload.displayName,
            }
        }, tx);

        console.log(`[IdentityProjector] Seq #${signal.sequenceNumber} -> Actor: ${resolution.actorId}`);

        coreEventBus.emit('identity:resolved', {
            sequenceNumber: signal.sequenceNumber,
            actorId: resolution.actorId,
            contextId: resolution.contextId
        });
    }

    /**
     * B1 — EXTERNAL_INPUT_OBSERVED from chatcore-webchat-gateway.
     * Creates a provisional actor for the visitor_token if one doesn't exist.
     */
    private async projectProvisionalActor(
        signal: typeof fluxcoreSignals.$inferSelect,
        tx: TransactionClient
    ): Promise<void> {
        const evidence = this.parseEvidence(signal);
        const visitorToken: string | undefined = evidence.payload.visitorToken;
        const tenantId: string | undefined = evidence.payload.tenantId;

        if (!visitorToken || !tenantId) {
            console.warn(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — missing visitorToken or tenantId`);
            return;
        }

        const client = tx;

        // Idempotent: only create if not already present
        const existing = await client.query.fluxcoreActors.findFirst({
            where: eq(fluxcoreActors.externalKey, visitorToken),
        });

        if (existing) {
            console.log(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — provisional actor already exists (${existing.id})`);
            return;
        }

        const [actor] = await client
            .insert(fluxcoreActors)
            .values({
                type: 'provisional',
                externalKey: visitorToken,
                tenantId,
                createdFromSignal: signal.sequenceNumber,
                internalRef: `webchat:${visitorToken}`,
            })
            .returning();

        // 3. Create Physical Address (entry point)
        const [address] = await client
            .insert(fluxcoreAddresses)
            .values({
                driverId: signal.provenanceDriverId, // 'chatcore/webchat'
                externalId: visitorToken,
            })
            .onConflictDoNothing() // Should not happen if actor didn't exist, but safe
            .returning();
            
        // If address already existed (race condition?), fetch it
        let addressId = address?.id;
        if (!addressId) {
             const existingAddr = await client.query.fluxcoreAddresses.findFirst({
                 where: eq(fluxcoreAddresses.externalId, visitorToken) // assuming driverId matches too or unique enough
             });
             addressId = existingAddr?.id;
        }

        if (addressId) {
             // 4. Link Actor -> Address
             await client.insert(fluxcoreActorAddressLinks).values({
                 actorId: actor.id,
                 addressId: addressId,
                 confidence: 1.0,
                 version: 1
             });
        }

        console.log(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — provisional actor created: ${actor.id} (visitor: ${visitorToken})`);
    }

    /**
     * B2 — CONNECTION_EVENT_OBSERVED from chatcore-webchat-gateway.
     * Links the provisional actor to a real account.
     */
    private async projectIdentityLink(
        signal: typeof fluxcoreSignals.$inferSelect,
        tx: TransactionClient
    ): Promise<void> {
        const visitorToken = signal.subjectKey; // provisional actor key
        const realAccountId = signal.objectKey; // real account after auth

        if (!visitorToken || !realAccountId) {
            console.warn(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — missing subjectKey or objectKey`);
            return;
        }

        const evidence = this.parseEvidence(signal);
        const tenantId: string = evidence.payload.tenantId ?? '';
        const client = tx;

        // Find the provisional actor
        const provisionalActor = await client.query.fluxcoreActors.findFirst({
            where: eq(fluxcoreActors.externalKey, visitorToken),
        });

        if (!provisionalActor) {
            console.warn(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — provisional actor not found for visitor ${visitorToken}`);
            return;
        }

        // Idempotent: insert only if link doesn't exist yet
        await client
            .insert(fluxcoreActorIdentityLinks)
            .values({
                provisionalActorId: provisionalActor.id,
                realAccountId,
                tenantId,
                linkingSignalSeq: signal.sequenceNumber,
            })
            .onConflictDoNothing();

        console.log(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — identity linked: ${provisionalActor.id} → account ${realAccountId}`);
    }

    /**
     * Handle authenticated users from ChatCore Gateway
     * Creates or links Actor for @fluxcore/internal namespace
     */
    private async projectAuthenticatedActor(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        // Extract account ID from subject key (should be a valid UUID)
        const accountId = signal.subjectKey;
        
        if (!accountId) {
            console.warn(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — missing accountId in subjectKey`);
            return;
        }

        const client = tx;

        // Create or find Actor for this account
        let actor = await client.query.fluxcoreActors.findFirst({
            where: eq(fluxcoreActors.displayName, `Account ${accountId.slice(0, 8)}`)
        });

        if (!actor) {
            // Create new actor
            const [newActor] = await client.insert(fluxcoreActors).values({
                actorType: 'account',
                displayName: `Account ${accountId.slice(0, 8)}`,
                metadata: JSON.stringify({ source: 'chatcore-gateway', accountId }),
                isActive: 'true'
            }).returning();
            actor = newActor;
            console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — created actor ${actor.id} for account ${accountId}`);
        }

        // Create Address for the driver
        const driverId = signal.provenanceDriverId;
        let address = await client.query.fluxcoreAddresses.findFirst({
            where: and(
                eq(fluxcoreAddresses.driverId, driverId),
                eq(fluxcoreAddresses.externalId, accountId)
            )
        });

        if (!address) {
            const [newAddress] = await client.insert(fluxcoreAddresses).values({
                driverId,
                externalId: accountId,
                actorId: actor.id
            }).returning();
            address = newAddress;
            console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — created address ${address.id} for driver ${driverId}`);
        }

        // Create Actor-Address Link
        let link = await client.query.fluxcoreActorAddressLinks.findFirst({
            where: eq(fluxcoreActorAddressLinks.addressId, address.id)
        });

        if (!link) {
            const [newLink] = await client.insert(fluxcoreActorAddressLinks).values({
                actorId: actor.id,
                addressId: address.id
            }).returning();
            link = newLink;
            console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — created actor-address link ${link.id}`);
        }

        console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — ✅ Authenticated actor resolved: actor=${actor.id}, address=${address.id}, link=${link.id}`);
    }

    private parseEvidence(signal: typeof fluxcoreSignals.$inferSelect): ParsedIdentityEvidence {
        let evidenceRoot: unknown = signal.evidenceRaw;

        if (typeof evidenceRoot === 'string') {
            try {
                evidenceRoot = JSON.parse(evidenceRoot);
            } catch (error) {
                console.error(`[IdentityProjector] ❌ Failed to parse evidenceRaw for seq ${signal.sequenceNumber}`, error);
                evidenceRoot = {};
            }
        }

        if (evidenceRoot && typeof evidenceRoot === 'object') {
            return { payload: evidenceRoot as IdentityEvidence };
        }

        return { payload: {} };
    }
}

export const identityProjector = new IdentityProjector();
