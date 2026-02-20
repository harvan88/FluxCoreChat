import { BaseProjector } from '../../core/kernel/base.projector';
import { db, fluxcoreSignals, fluxcoreActors, fluxcoreActorIdentityLinks, eq } from '@fluxcore/db';
import { actorResolutionService } from './actor-resolution.service';
import { coreEventBus } from '../../core/events';

const WEBCHAT_ADAPTER_ID = 'chatcore-webchat-gateway';
const WEBCHAT_SUBJECT_NS = 'chatcore/webchat-visitor';

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
    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
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

        let evidence = signal.evidenceRaw as any;
        
        // ROBUSTNESS: Handle stringified JSON (Drizzle/Postgres edge case)
        if (typeof evidence === 'string') {
            try {
                evidence = JSON.parse(evidence);
            } catch (e) {
                console.warn(`[IdentityProjector] Failed to parse evidenceRaw for seq ${signal.sequenceNumber}`, e);
                evidence = {};
            }
        }

        const accountId = evidence?.accountPerspective ?? evidence?.accountId ?? null;

        if (!accountId) {
            const resolution = await actorResolutionService.resolveActor({
                accountId: '',
                driverId,
                externalId,
                hints: {
                    displayName: evidence?.displayName,
                }
            }, tx);

            console.log(`[IdentityProjector] Seq #${signal.sequenceNumber} -> Actor: ${resolution.actorId} (no account context)`);
            return;
        }

        const resolution = await actorResolutionService.resolveFromSnapshot({
            accountId,
            snapshot: {
                driverId,
                externalId,
                displayName: evidence?.displayName,
            }
        }, tx);

        console.log(`[IdentityProjector] Seq #${signal.sequenceNumber} -> Actor: ${resolution.actorId}`);

        coreEventBus.emit('identity:resolved' as any, {
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
        tx: any
    ): Promise<void> {
        let evidence = signal.evidenceRaw as any;
        if (typeof evidence === 'string') {
            try { evidence = JSON.parse(evidence); } catch { evidence = {}; }
        }

        const visitorToken: string | undefined = evidence?.visitorToken;
        const tenantId: string | undefined = evidence?.tenantId;

        if (!visitorToken || !tenantId) {
            console.warn(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — missing visitorToken or tenantId`);
            return;
        }

        const client = tx || db;

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

        console.log(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — provisional actor created: ${actor.id} (visitor: ${visitorToken})`);
    }

    /**
     * B2 — CONNECTION_EVENT_OBSERVED from chatcore-webchat-gateway.
     * Links the provisional actor to a real account.
     */
    private async projectIdentityLink(
        signal: typeof fluxcoreSignals.$inferSelect,
        tx: any
    ): Promise<void> {
        const visitorToken = signal.subjectKey; // provisional actor key
        const realAccountId = signal.objectKey; // real account after auth

        if (!visitorToken || !realAccountId) {
            console.warn(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — missing subjectKey or objectKey`);
            return;
        }

        let evidence = signal.evidenceRaw as any;
        if (typeof evidence === 'string') {
            try { evidence = JSON.parse(evidence); } catch { evidence = {}; }
        }

        const tenantId: string = evidence?.tenantId ?? '';
        const client = tx || db;

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
}

export const identityProjector = new IdentityProjector();
