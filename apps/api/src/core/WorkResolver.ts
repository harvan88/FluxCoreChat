import { db, fluxcoreProposedWorks, fluxcoreDecisionEvents, fluxcoreWorks } from '@fluxcore/db';
import { sql, eq, and, desc, notInArray } from 'drizzle-orm';

export interface MessageContext {
    accountId: string;
    relationshipId: string;
    conversationId: string;
}

export type ResolutionResult =
    | { type: 'RESUME_WORK', workId: string }
    | { type: 'EVALUATE_PROPOSAL' } // No active work, check for proposal via AI
    | { type: 'CONVERSATIONAL' };   // Explicit conversational mode (e.g. forced via UI)

const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'];

export class WorkResolver {
    /**
     * Resolves the canonical context for a message.
     * WOS-100/WES-130: Canonical Routing Logic
     * 1. Check for Active Work in conversation.
     * 2. If yes -> RESUME_WORK.
     * 3. If no -> EVALUATE_PROPOSAL (AI will decide if ProposedWork or Conversational).
     */
    async resolve(context: MessageContext): Promise<ResolutionResult> {
        // 1. Check for Active Work (Non-terminal state)
        const activeWork = await db.query.fluxcoreWorks.findFirst({
            where: and(
                eq(fluxcoreWorks.accountId, context.accountId),
                eq(fluxcoreWorks.relationshipId, context.relationshipId),
                eq(fluxcoreWorks.conversationId, context.conversationId),
                notInArray(fluxcoreWorks.state, TERMINAL_STATES)
            ),
            orderBy: [desc(fluxcoreWorks.updatedAt)]
        });

        if (activeWork) {
            return { type: 'RESUME_WORK', workId: activeWork.id };
        }

        // 2. No Active Work -> Default to Proposal Evaluation (AI Layer)
        return { type: 'EVALUATE_PROPOSAL' };
    }

    /**
     * Persists a Cognitive Decision Event + Proposed Work (if any).
     * Note: This is called AFTER the AI evaluation step.
     */
    async recordDecision(
        context: MessageContext,
        traceId: string,
        messageId: string | undefined, // Incoming message ID
        inputData: any,
        proposedWorkData: any | null, // The ProposedWork structure from AI
        modelInfo: any
    ) {
        const [decisionEvent] = await db.insert(fluxcoreDecisionEvents).values({
            accountId: context.accountId,
            traceId,
            messageId,
            input: inputData,
            proposedWork: proposedWorkData, // Can be null if conversational
            modelInfo,
        }).returning();

        if (proposedWorkData) {
            await db.insert(fluxcoreProposedWorks).values({
                accountId: context.accountId,
                conversationId: context.conversationId,
                decisionEventId: decisionEvent.id,
                workDefinitionId: proposedWorkData.workDefinitionId,
                intent: proposedWorkData.intent,
                candidateSlots: proposedWorkData.candidateSlots,
                confidence: proposedWorkData.confidence,
                traceId,
                resolution: 'pending',
            });
        }

        return decisionEvent;
    }
}

export const workResolver = new WorkResolver();
