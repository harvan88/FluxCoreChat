import { and, desc, eq, inArray } from 'drizzle-orm';
import {
    db,
    fluxcoreSessionProjection,
} from '@fluxcore/db';

export type ListSessionsParams = {
    accountId?: string;
    actorId?: string;
    statuses?: Array<'pending' | 'active' | 'invalidated'>;
};

class SessionProjectionService {
    async listSessions(params: ListSessionsParams = {}) {
        const { accountId, actorId, statuses } = params;
        const conditions = [] as any[];

        if (accountId) {
            conditions.push(eq(fluxcoreSessionProjection.accountId, accountId));
        }

        if (actorId) {
            conditions.push(eq(fluxcoreSessionProjection.actorId, actorId));
        }

        if (statuses && statuses.length > 0) {
            conditions.push(inArray(fluxcoreSessionProjection.status, statuses));
        }

        const query = db
            .select({
                sessionId: fluxcoreSessionProjection.sessionId,
                actorId: fluxcoreSessionProjection.actorId,
                accountId: fluxcoreSessionProjection.accountId,
                status: fluxcoreSessionProjection.status,
                deviceHash: fluxcoreSessionProjection.deviceHash,
                scopes: fluxcoreSessionProjection.scopes,
                updatedAt: fluxcoreSessionProjection.updatedAt,
                method: fluxcoreSessionProjection.method,
                entryPoint: fluxcoreSessionProjection.entryPoint,
                lastSequenceNumber: fluxcoreSessionProjection.lastSequenceNumber,
            })
            .from(fluxcoreSessionProjection)
            .orderBy(desc(fluxcoreSessionProjection.updatedAt));

        if (conditions.length > 0) {
            query.where(and(...conditions));
        }

        return await query;
    }
}

export const sessionProjectionService = new SessionProjectionService();
