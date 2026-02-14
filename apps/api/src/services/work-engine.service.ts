import { db, fluxcoreWorks, fluxcoreWorkSlots, fluxcoreWorkEvents, fluxcoreProposedWorks, fluxcoreWorkDefinitions, fluxcoreSemanticContexts, fluxcoreExternalEffects, fluxcoreExternalEffectClaims, fluxcoreDecisionEvents } from '@fluxcore/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { validateDelta, type Delta } from '../core/wes-utils';
import { metricsService } from './metrics.service';
import { logTrace } from '../utils/file-logger';
import type { MessageEnvelope } from '../core/types';
import { messageCore } from '../core/message-core';

export class WorkEngineService {
    /**
     * WES-170: Persists an AI proposal as a ProposedWork
     */
    async proposeWork(params: {
        accountId: string;
        conversationId: string;
        traceId: string;
        workDefinitionId: string;
        intent: string;
        candidateSlots: any[];
        confidence: number;
        modelInfo?: any;
    }) {
        const { accountId, conversationId, traceId, workDefinitionId, intent, candidateSlots, confidence, modelInfo } = params;

        const result = await db.transaction(async (tx) => {
            // 1. Create DecisionEvent (Canon requirement)
            const [decision] = await tx.insert(fluxcoreDecisionEvents).values({
                id: randomUUID(),
                accountId,
                traceId,
                input: { conversationId, intent },
                modelInfo,
                createdAt: new Date(),
            }).returning();

            // 2. Create ProposedWork
            const [proposed] = await tx.insert(fluxcoreProposedWorks).values({
                id: randomUUID(),
                accountId,
                conversationId,
                decisionEventId: decision.id,
                workDefinitionId,
                intent,
                candidateSlots,
                confidence,
                traceId,
                resolution: 'pending',
                createdAt: new Date(),
            }).returning();

            return proposed;
        });

        metricsService.increment('wes.proposal.created', 1, { accountId, workDefinitionId });
        return result;
    }

    /**
     * WES-150: Opens a new Work based on a ProposedWork
     * MUST be called after Gate validation.
     */
    async openWork(accountId: string, proposedWorkId: string) {
        const result = await db.transaction(async (tx) => {
            // 1. Fetch ProposedWork
            const proposed = await tx.query.fluxcoreProposedWorks.findFirst({
                where: and(
                    eq(fluxcoreProposedWorks.accountId, accountId),
                    eq(fluxcoreProposedWorks.id, proposedWorkId)
                )
            });

            if (!proposed) throw new Error('ProposedWork not found');
            if (proposed.resolution !== 'pending') throw new Error('ProposedWork already resolved');
            if (!proposed.workDefinitionId) throw new Error('ProposedWork has no workDefinitionId');

            // 2. Fetch WorkDefinition
            const definition = await tx.query.fluxcoreWorkDefinitions.findFirst({
                where: eq(fluxcoreWorkDefinitions.id, proposed.workDefinitionId)
            });

            if (!definition) throw new Error('WorkDefinition not found');

            const workId = randomUUID();

            // 3. Create Work instance
            const [work] = await tx.insert(fluxcoreWorks).values({
                id: workId,
                accountId,
                workDefinitionId: proposed.workDefinitionId,
                workDefinitionVersion: definition.version,
                conversationId: proposed.conversationId,
                state: (definition.definitionJson as any).fsm?.initial || 'CREATED',
                revision: 1,
            }).returning();

            // 4. Update ProposedWork status
            await tx.update(fluxcoreProposedWorks)
                .set({
                    resolution: 'opened',
                    resultingWorkId: workId,
                    evaluatedAt: new Date()
                })
                .where(eq(fluxcoreProposedWorks.id, proposedWorkId));

            // 5. Initial Slots from candidates
            const candidates = proposed.candidateSlots as any[];
            if (candidates && Array.isArray(candidates)) {
                for (const candidate of candidates) {
                    await tx.insert(fluxcoreWorkSlots).values({
                        accountId,
                        workId,
                        path: candidate.path,
                        type: candidate.type || 'string',
                        value: candidate.value,
                        status: 'committed',
                        setBy: 'ai',
                        evidence: candidate.evidence,
                        setAt: new Date(),
                    });
                }
            }

            // 6. Record Event
            await tx.insert(fluxcoreWorkEvents).values({
                accountId,
                workId,
                eventType: 'work_opened',
                actor: 'system',
                traceId: proposed.traceId,
                workRevision: 1,
                createdAt: new Date(),
            });

            return work;
        });

        metricsService.increment('wes.work.opened', 1, { accountId, workDefinitionId: result.workDefinitionId });
        return result;
    }

    /**
     * WOS-100: Ingests a user message into an active Work.
     * Reconstructs state, solves for new slots, and commits deltas.
     */
    async ingestMessage(workId: string, messageText: string, envelope: MessageEnvelope): Promise<boolean> {
        try {
            const { wesInterpreterService } = await import('../../../../extensions/fluxcore-fluxi/src/interpreter');
            const { workDefinitionService } = await import('./work-definition.service');

            // 1. Fetch Work and Definition
            const work = await db.query.fluxcoreWorks.findFirst({
                where: eq(fluxcoreWorks.id, workId)
            });
            if (!work) return false;

            // Important: Use the specific version stored in the work instance
            const definition = await workDefinitionService.get(work.accountId, (work as any).typeId || '', work.workDefinitionVersion);
            // Fallback to internal ID if stored version lookup fails
            const def = definition || await db.query.fluxcoreWorkDefinitions.findFirst({
                where: eq(fluxcoreWorkDefinitions.id, work.workDefinitionId)
            }) as any;

            if (!def) {
                logTrace(`[WorkEngine] ABORT: WorkDefinition ${work.workDefinitionId} not found for work ${workId}`);
                return false;
            }
            const currentStateResult = await this.getWorkState(workId);
            if (!currentStateResult) {
                logTrace(`[WorkEngine] ❌ Could not reconstruct state for Work ${workId}`);
                return false;
            }

            // 2. Solve message using context
            const extractedSlots = await wesInterpreterService.solveActiveWork(
                work.accountId,
                workId,
                def,
                currentStateResult.state,
                messageText
            );

            if (extractedSlots && extractedSlots.length > 0) {
                logTrace(`[WorkEngine] Extracted ${extractedSlots.length} new slots for Work ${workId}`);

                const delta: Delta = extractedSlots.map(s => ({
                    op: 'set',
                    path: s.path,
                    value: s.value
                }));

                // 3. Commit Delta
                await this.commitDelta(workId, delta, 'user', envelope.id || `ingest-${Date.now()}`);

                // 4. Send Acknowledgment
                const slotsList = extractedSlots.map(s => s.path).join(', ');
                await messageCore.send({
                    conversationId: envelope.conversationId,
                    senderAccountId: work.accountId,
                    content: { text: `Entendido. He registrado la información para: ${slotsList}. Continuemos.` },
                    type: 'outgoing',
                    generatedBy: 'system',
                    targetAccountId: envelope.senderAccountId,
                });

                return true;
            }
        } catch (error: any) {
            console.error('[WorkEngine] IngestMessage failed:', error);
        }
        return false;
    }

    /**
     * WES-180: Discards a ProposedWork
     */
    async discardWork(accountId: string, proposedWorkId: string) {
        const [proposed] = await db.update(fluxcoreProposedWorks)
            .set({
                resolution: 'discarded',
                evaluatedAt: new Date()
            })
            .where(and(
                eq(fluxcoreProposedWorks.accountId, accountId),
                eq(fluxcoreProposedWorks.id, proposedWorkId),
                eq(fluxcoreProposedWorks.resolution, 'pending')
            ))
            .returning();

        if (!proposed) throw new Error('ProposedWork not found or already resolved');

        metricsService.increment('wes.work.discarded', 1, { accountId });
        return proposed;
    }

    /**
     * Reconstructs the current state of a work from its slots.
     */
    async getWorkState(workId: string) {
        const work = await db.query.fluxcoreWorks.findFirst({
            where: eq(fluxcoreWorks.id, workId)
        });
        if (!work) return null;

        const slots = await db.query.fluxcoreWorkSlots.findMany({
            where: eq(fluxcoreWorkSlots.workId, workId)
        });

        const slotsMap: Record<string, any> = {};
        for (const slot of slots) {
            slotsMap[slot.path] = slot.value;
        }

        return {
            work,
            state: {
                slots: slotsMap,
                state: work.state
            }
        };
    }

    /**
     * WES-145: Commits a delta with optimistic concurrency control
     */
    async commitDelta(workId: string, delta: Delta, actor: string, traceId: string) {
        return await db.transaction(async (tx) => {
            const current = await this.getWorkState(workId);
            if (!current) throw new Error('Work not found');

            const work = current.work;
            const definition = await tx.query.fluxcoreWorkDefinitions.findFirst({
                where: eq(fluxcoreWorkDefinitions.id, work.workDefinitionId)
            });

            // 1. Validate Delta
            const validation = validateDelta(current.state, delta, definition?.definitionJson as any);
            if (!validation.valid) throw new Error(`Delta validation failed: ${validation.error}`);

            // 2. Apply Delta to DB
            for (const op of delta) {
                if (op.op === 'set') {
                    await tx.insert(fluxcoreWorkSlots).values({
                        accountId: work.accountId,
                        workId,
                        path: op.path,
                        type: 'string',
                        value: op.value,
                        status: 'committed',
                        setBy: actor,
                        setAt: new Date(),
                    }).onConflictDoUpdate({
                        target: [fluxcoreWorkSlots.workId, fluxcoreWorkSlots.path],
                        set: { value: op.value, setBy: actor, setAt: new Date() }
                    });
                } else if (op.op === 'transition') {
                    await tx.update(fluxcoreWorks)
                        .set({ state: op.toState, updatedAt: new Date() })
                        .where(eq(fluxcoreWorks.id, workId));

                    // Metric for transition
                    metricsService.increment('wes.work.transitioned', 1, {
                        accountId: work.accountId,
                        from: work.state,
                        to: op.toState
                    });
                }
            }

            // 3. Increment Revision (Optimistic Lock)
            const [updatedWork] = await tx.update(fluxcoreWorks)
                .set({
                    revision: sql`${fluxcoreWorks.revision} + 1`,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(fluxcoreWorks.id, workId),
                    eq(fluxcoreWorks.revision, work.revision)
                ))
                .returning();

            if (!updatedWork) {
                throw new Error('Concurrency conflict: Work was updated by another process');
            }

            // 4. Record Event
            await tx.insert(fluxcoreWorkEvents).values({
                accountId: work.accountId,
                workId,
                eventType: 'delta_committed',
                actor,
                traceId,
                workRevision: updatedWork.revision,
                delta: delta as any,
                createdAt: new Date(),
            });

            return updatedWork;
        });
    }

    /**
     * WES-155: Requests a semantic confirmation from the user.
     */
    async requestSemanticConfirmation(
        workId: string,
        slotPath: string,
        proposedValue: any,
        traceId: string,
        expiresInSeconds = 3600 * 24
    ) {
        const work = await db.query.fluxcoreWorks.findFirst({ where: eq(fluxcoreWorks.id, workId) });
        if (!work) throw new Error('Work not found');

        const contextId = randomUUID();
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

        await db.insert(fluxcoreSemanticContexts).values({
            id: contextId,
            accountId: work.accountId,
            workId,
            conversationId: work.conversationId as string,
            slotPath,
            proposedValue,
            status: 'pending',
            expiresAt,
        });

        await db.insert(fluxcoreWorkEvents).values({
            accountId: work.accountId,
            workId,
            eventType: 'semantic_confirmation_requested',
            actor: 'system',
            traceId,
            workRevision: work.revision,
            semanticContextId: contextId,
            createdAt: new Date(),
        });

        metricsService.increment('wes.semantic.confirmation.requested', 1, { accountId: work.accountId });
        return contextId;
    }

    /**
     * WES-155: Strictly non-LLM resolution
     */
    async resolveSemanticMatch(accountId: string, conversationId: string, messageText: string) {
        const cleanText = messageText.toLowerCase().trim();
        const POSITIVE_KEYWORDS = ['sí', 'si', 'sí, por favor', 'ok', 'dale', 'afirmativo', 'confirmar', 'confirmado', 'está bien', 'estaba bien'];

        if (!POSITIVE_KEYWORDS.includes(cleanText)) return null;

        return await db.query.fluxcoreSemanticContexts.findFirst({
            where: and(
                eq(fluxcoreSemanticContexts.accountId, accountId),
                eq(fluxcoreSemanticContexts.conversationId, conversationId),
                eq(fluxcoreSemanticContexts.status, 'pending'),
                sql`expires_at > now()`
            ),
            orderBy: [desc(fluxcoreSemanticContexts.createdAt)]
        });
    }

    async commitSemanticConfirmation(contextId: string, messageId: string) {
        const result = await db.transaction(async (tx) => {
            const context = await tx.query.fluxcoreSemanticContexts.findFirst({
                where: eq(fluxcoreSemanticContexts.id, contextId)
            });
            if (!context || context.status !== 'pending') throw new Error('Invalid or expired context');

            await tx.update(fluxcoreSemanticContexts)
                .set({
                    status: 'consumed',
                    consumedAt: new Date(),
                    consumedByMessageId: messageId
                })
                .where(eq(fluxcoreSemanticContexts.id, contextId));

            if (context.workId) {
                const work = await tx.query.fluxcoreWorks.findFirst({ where: eq(fluxcoreWorks.id, context.workId) });
                if (work) {
                    const delta: Delta = [{ op: 'set', path: context.slotPath, value: context.proposedValue }];
                    await this.commitDelta(context.workId, delta, 'user', 'semantic-commit-trace');
                }
            }

            return context;
        });

        metricsService.increment('wes.semantic.confirmation.committed', 1, { accountId: result.accountId });
        return result;
    }

    /**
     * WES-160: Claims an external effect
     */
    async claimExternalEffect(workId: string, effectType: string, toolCallId: string | null = null) {
        const work = await db.query.fluxcoreWorks.findFirst({ where: eq(fluxcoreWorks.id, workId) });
        if (!work) throw new Error('Work not found');

        const claimId = randomUUID();
        await db.insert(fluxcoreExternalEffectClaims).values({
            id: claimId,
            accountId: work.accountId,
            semanticContextId: randomUUID(), // Should be real if linked to a confirmation
            workId,
            effectType,
            status: 'claimed',
            toolCallId,
            claimedAt: new Date(),
        });

        return claimId;
    }

    async recordExternalEffect(
        workId: string,
        claimId: string,
        toolName: string,
        request: any,
        response: any,
        status: 'success' | 'failed'
    ) {
        return await db.transaction(async (tx) => {
            const effectId = randomUUID();
            const work = await tx.query.fluxcoreWorks.findFirst({ where: eq(fluxcoreWorks.id, workId) });
            if (!work) throw new Error('Work not found');

            await tx.insert(fluxcoreExternalEffects).values({
                id: effectId,
                accountId: work.accountId,
                workId,
                toolName,
                toolCallId: claimId,
                idempotencyKey: claimId,
                request,
                response,
                status: status === 'success' ? 'finished' : 'failed',
                claimId,
                startedAt: new Date(),
                finishedAt: new Date(),
            });

            await tx.update(fluxcoreExternalEffectClaims)
                .set({ status: 'released', releasedAt: new Date(), externalEffectId: effectId })
                .where(eq(fluxcoreExternalEffectClaims.id, claimId));

            return effectId;
        });
    }

    /**
     * WES-165: Expiration Maintenance
     * Finds and expires stale Works and Semantic Contexts.
     */
    async expireMaintenance() {
        metricsService.increment('wes.maintenance.runs', 1);

        // 1. Expire Works
        const expiredWorks = await db.update(fluxcoreWorks)
            .set({ state: 'EXPIRED', updatedAt: new Date() })
            .where(and(
                sql`state != 'EXPIRED'`,
                sql`state != 'COMPLETED'`,
                sql`state != 'FAILED'`,
                sql`expires_at < now()`
            ))
            .returning();

        if (expiredWorks.length > 0) {
            console.log(`[WorkEngine] 📉 Expired ${expiredWorks.length} works`);
            metricsService.increment('wes.work.expired', expiredWorks.length);
            for (const work of expiredWorks) {
                await db.insert(fluxcoreWorkEvents).values({
                    accountId: work.accountId,
                    workId: work.id,
                    eventType: 'expired',
                    actor: 'system',
                    traceId: 'scheduler-expiration',
                    workRevision: work.revision,
                    createdAt: new Date(),
                });
            }
        }

        // 2. Expire Semantic Contexts
        const expiredContexts = await db.update(fluxcoreSemanticContexts)
            .set({ status: 'expired' })
            .where(and(
                eq(fluxcoreSemanticContexts.status, 'pending'),
                sql`expires_at < now()`
            ))
            .returning();

        if (expiredContexts.length > 0) {
            console.log(`[WorkEngine] 📉 Expired ${expiredContexts.length} semantic contexts`);
            metricsService.increment('wes.semantic.confirmation.expired', expiredContexts.length);
            for (const ctx of expiredContexts) {
                if (ctx.workId) {
                    await db.insert(fluxcoreWorkEvents).values({
                        accountId: ctx.accountId,
                        workId: ctx.workId,
                        eventType: 'semantic_confirmation_expired',
                        actor: 'system',
                        traceId: 'scheduler-expiration',
                        workRevision: 0, // Placeholder
                        semanticContextId: ctx.id,
                        createdAt: new Date(),
                    });
                }
            }
        }

        return { expiredWorks: expiredWorks.length, expiredContexts: expiredContexts.length };
    }
}

export const workEngineService = new WorkEngineService();
