import { db } from '@fluxcore/db';
import { fluxcoreActors, fluxcoreAddresses, fluxcoreActorAddressLinks, fluxcoreAccountActorContexts } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export interface ActorResolutionResult {
    actorId: string;
    contextId: string;
    snapshot: {
        resolverVersion: string;
        matchedBy: 'external_id_exact' | 'email_heuristic' | 'new_actor';
        confidence: number;
        driverId: string;
        externalId: string;
    };
}

/**
 * ActorResolutionService (Kernel Space)
 * Responsibilities:
 * 1. Resolve global Actor ID from physical Address hints.
 * 2. Maintain behavioral continuity across channels.
 * 3. Scope business context per Account.
 */
export class ActorResolutionService {
    private readonly VERSION = '1.0';

    /**
     * Resolves an Actor for the given communication hints.
     * Following the Actor-Address-Relation map.
     */
    async resolveActor(params: {
        accountId: string;
        driverId: string;
        externalId: string;
        hints?: {
            displayName?: string;
            email?: string;
        };
    }, tx?: any): Promise<ActorResolutionResult> {
        const client = tx || db;
        const { accountId, driverId, externalId, hints } = params;
        let matchedBy: 'external_id_exact' | 'email_heuristic' | 'new_actor' = 'new_actor';
        let confidence = 1.0;

        // 1. Find or create Address (Physical Layer)
        let address = await client.query.fluxcoreAddresses.findFirst({
            where: and(
                eq(fluxcoreAddresses.driverId, driverId),
                eq(fluxcoreAddresses.externalId, externalId)
            )
        });

        if (!address) {
            const [newAddress] = await client.insert(fluxcoreAddresses).values({
                driverId,
                externalId,
            }).returning();
            address = newAddress;
        }

        // 2. Find Link to Actor (Ontological Layer)
        let link = await client.query.fluxcoreActorAddressLinks.findFirst({
            where: eq(fluxcoreActorAddressLinks.addressId, address.id)
        });

        let actorId: string;

        if (link) {
            actorId = link.actorId;
            matchedBy = 'external_id_exact';
        } else {
            // 2.1. Heuristic: Check if another address (email) already points to an actor
            let matchedActorId: string | null = null;
            if (hints?.email) {
                const emailAddress = await client.query.fluxcoreAddresses.findFirst({
                    where: eq(fluxcoreAddresses.externalId, hints.email)
                });
                if (emailAddress) {
                    const emailLink = await client.query.fluxcoreActorAddressLinks.findFirst({
                        where: eq(fluxcoreActorAddressLinks.addressId, emailAddress.id)
                    });
                    if (emailLink) {
                        matchedActorId = emailLink.actorId;
                        matchedBy = 'email_heuristic';
                        confidence = 0.9; // Heuristic is high but not 1.0
                    }
                }
            }

            if (matchedActorId) {
                actorId = matchedActorId;
            } else {
                // 2.2. Create new Actor (Empty shell)
                const [newActor] = await client.insert(fluxcoreActors).values({}).returning();
                actorId = newActor.id;
                matchedBy = 'new_actor';
                confidence = 1.0;
            }

            // 2.3. Create the Link
            await client.insert(fluxcoreActorAddressLinks).values({
                actorId,
                addressId: address.id,
                confidence: confidence === 1.0 ? 1.0 : confidence,
            });
        }

        // 3. Resolve AccountActorContext (Commercial Layer)
        let context = await client.query.fluxcoreAccountActorContexts.findFirst({
            where: and(
                eq(fluxcoreAccountActorContexts.accountId, accountId),
                eq(fluxcoreAccountActorContexts.actorId, actorId)
            )
        });

        if (!context) {
            const [newContext] = await client.insert(fluxcoreAccountActorContexts).values({
                accountId,
                actorId,
                displayName: hints?.displayName || null,
                status: 'active'
            }).returning();
            context = newContext;
        } else if (hints?.displayName && !context.displayName) {
            await client.update(fluxcoreAccountActorContexts)
                .set({ displayName: hints.displayName })
                .where(eq(fluxcoreAccountActorContexts.id, context.id));
        }

        return {
            actorId,
            contextId: context.id,
            snapshot: {
                resolverVersion: this.VERSION,
                matchedBy,
                confidence,
                driverId,
                externalId
            }
        };
    }

    /**
     * Helper to resolve an Actor directly from a Journal snapshot.
     */
    async resolveFromSnapshot(params: {
        accountId: string;
        snapshot: any;
    }, tx?: any): Promise<ActorResolutionResult> {
        const { accountId, snapshot } = params;
        return this.resolveActor({
            accountId,
            driverId: snapshot.driverId,
            externalId: snapshot.externalId,
            hints: snapshot.hints || {
                displayName: snapshot.displayName
            }
        }, tx);
    }

    /**
     * Merges two Actors when they are proven to be the same subject.
     */
    async linkActors(winnerId: string, loserId: string, tx?: any): Promise<void> {
        const client = tx || db;
        if (winnerId === loserId) return;

        // 1. Re-map all addresses from loser to winner
        await client.update(fluxcoreActorAddressLinks)
            .set({ actorId: winnerId })
            .where(eq(fluxcoreActorAddressLinks.actorId, loserId));

        // 2. Merge Account Contexts (Relationships)
        const loserContexts = await client.query.fluxcoreAccountActorContexts.findMany({
            where: eq(fluxcoreAccountActorContexts.actorId, loserId)
        });

        for (const lCtx of loserContexts) {
            const existingInWinner = await client.query.fluxcoreAccountActorContexts.findFirst({
                where: and(
                    eq(fluxcoreAccountActorContexts.accountId, lCtx.accountId),
                    eq(fluxcoreAccountActorContexts.actorId, winnerId)
                )
            });

            if (!existingInWinner) {
                // Transfer relationship to winner
                await client.update(fluxcoreAccountActorContexts)
                    .set({ actorId: winnerId })
                    .where(eq(fluxcoreAccountActorContexts.id, lCtx.id));
            } else {
                // TODO: Merge metadata? Delete loser context for this account?
                // For now, just mark loser context as merged/inactive
                await client.update(fluxcoreAccountActorContexts)
                    .set({ status: 'merged' })
                    .where(eq(fluxcoreAccountActorContexts.id, lCtx.id));
            }
        }

        // 3. Delete loser actor shell
        await client.delete(fluxcoreActors).where(eq(fluxcoreActors.id, loserId));
    }
}

export const actorResolutionService = new ActorResolutionService();
