import { BaseProjector } from '../core/kernel/base.projector';
import { db, fluxcoreSessionProjection, fluxcoreSignals, eq, sql } from '@fluxcore/db';

type IdentityEvent = 'Identity.LoginRequested' | 'Identity.LoginSucceeded' | 'Identity.SessionInvalidated';

type LoginRequestedEvidence = {
    sessionId?: string;
    actorId?: string;
    accountPerspective?: string;
    accountId?: string;
    identifier?: string;
    method?: string;
    deviceHash?: string;
    scopes?: string[];
    eventType?: IdentityEvent;
    identityEvent?: IdentityEvent;
};

type LoginSucceededEvidence = LoginRequestedEvidence & {
    accountId?: string;
};

type SessionInvalidatedEvidence = {
    sessionId?: string;
    reason?: string;
    actorId?: string;
    accountId?: string;
    eventType?: IdentityEvent;
    identityEvent?: IdentityEvent;
};

const STATUS_PENDING = 'pending';
const STATUS_ACTIVE = 'active';
const STATUS_INVALIDATED = 'invalidated';

class SessionProjector extends BaseProjector {
    protected projectorName = 'session_projector';

    protected async project(signal: typeof fluxcoreSignals.$inferSelect): Promise<void> {
        const event = this.resolveEventType(signal);
        if (!event) {
            return;
        }

        switch (event) {
            case 'Identity.LoginRequested':
                await this.handleLoginRequested(signal);
                break;
            case 'Identity.LoginSucceeded':
                await this.handleLoginSucceeded(signal);
                break;
            case 'Identity.SessionInvalidated':
                await this.handleSessionInvalidated(signal);
                break;
            default:
                break;
        }
    }

    private resolveEventType(signal: typeof fluxcoreSignals.$inferSelect): IdentityEvent | undefined {
        const evidence = (signal.evidenceRaw as LoginRequestedEvidence) ?? {};
        const candidate = evidence.identityEvent || evidence.eventType || signal.objectKey || signal.sourceKey;
        if (
            candidate === 'Identity.LoginRequested' ||
            candidate === 'Identity.LoginSucceeded' ||
            candidate === 'Identity.SessionInvalidated'
        ) {
            return candidate;
        }
        return undefined;
    }

    private async handleLoginRequested(signal: typeof fluxcoreSignals.$inferSelect) {
        const evidence = (signal.evidenceRaw as LoginRequestedEvidence) ?? {};
        const sessionId = evidence.sessionId ?? signal.provenanceExternalId ?? signal.sourceKey;
        const accountId = evidence.accountPerspective ?? evidence.accountId ?? signal.provenanceEntryPoint;
        const actorId = evidence.actorId ?? evidence.identifier ?? accountId;

        if (!sessionId || !accountId || !actorId) {
            console.warn('[SessionProjector] Skipping LoginRequested due to missing identifiers', {
                sessionId,
                accountId,
                actorId,
            });
            return;
        }

        await db
            .insert(fluxcoreSessionProjection)
            .values({
                sessionId,
                actorId,
                accountId,
                entryPoint: signal.provenanceEntryPoint ?? null,
                deviceHash: evidence.deviceHash ?? null,
                method: evidence.method ?? null,
                scopes: evidence.scopes ?? [],
                status: STATUS_PENDING,
                lastSequenceNumber: signal.sequenceNumber,
            })
            .onConflictDoUpdate({
                target: fluxcoreSessionProjection.sessionId,
                set: {
                    actorId,
                    accountId,
                    deviceHash: evidence.deviceHash ?? sql`EXCLUDED.device_hash`,
                    method: evidence.method ?? sql`EXCLUDED.method`,
                    entryPoint: signal.provenanceEntryPoint ?? sql`EXCLUDED.entry_point`,
                    status: STATUS_PENDING,
                    updatedAt: new Date(),
                    lastSequenceNumber: signal.sequenceNumber,
                },
            });
    }

    private async handleLoginSucceeded(signal: typeof fluxcoreSignals.$inferSelect) {
        const evidence = (signal.evidenceRaw as LoginSucceededEvidence) ?? {};
        const sessionId = evidence.sessionId ?? signal.provenanceExternalId ?? signal.sourceKey;
        const accountId = evidence.accountId ?? evidence.accountPerspective ?? signal.provenanceEntryPoint;
        const actorId = evidence.actorId ?? evidence.identifier ?? accountId;

        if (!sessionId || !accountId || !actorId) {
            console.warn('[SessionProjector] Skipping LoginSucceeded due to missing identifiers', {
                sessionId,
                accountId,
                actorId,
            });
            return;
        }

        await db
            .insert(fluxcoreSessionProjection)
            .values({
                sessionId,
                actorId,
                accountId,
                entryPoint: signal.provenanceEntryPoint ?? null,
                deviceHash: evidence.deviceHash ?? null,
                method: evidence.method ?? null,
                scopes: evidence.scopes ?? [],
                status: STATUS_ACTIVE,
                lastSequenceNumber: signal.sequenceNumber,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: fluxcoreSessionProjection.sessionId,
                set: {
                    actorId,
                    accountId,
                    deviceHash: evidence.deviceHash ?? sql`EXCLUDED.device_hash`,
                    method: evidence.method ?? sql`EXCLUDED.method`,
                    entryPoint: signal.provenanceEntryPoint ?? sql`EXCLUDED.entry_point`,
                    scopes: evidence.scopes ?? sql`EXCLUDED.scopes`,
                    status: STATUS_ACTIVE,
                    updatedAt: new Date(),
                    lastSequenceNumber: signal.sequenceNumber,
                },
            });
    }

    private async handleSessionInvalidated(signal: typeof fluxcoreSignals.$inferSelect) {
        const evidence = (signal.evidenceRaw as SessionInvalidatedEvidence) ?? {};
        const sessionId = evidence.sessionId ?? signal.provenanceExternalId ?? signal.sourceKey;
        if (!sessionId) {
            console.warn('[SessionProjector] Skipping SessionInvalidated without sessionId');
            return;
        }

        await db
            .update(fluxcoreSessionProjection)
            .set({
                status: STATUS_INVALIDATED,
                updatedAt: new Date(),
                lastSequenceNumber: signal.sequenceNumber,
            })
            .where(eq(fluxcoreSessionProjection.sessionId, sessionId));
    }
}

export const sessionProjector = new SessionProjector();
