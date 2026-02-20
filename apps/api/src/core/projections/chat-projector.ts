import { BaseProjector } from '../kernel/base.projector';
import { conversationService } from '../../services/conversation.service';
import { db, relationships, and, eq, fluxcoreSignals, fluxcoreAddresses, fluxcoreActorAddressLinks, messages, fluxcoreCognitionQueue, conversations } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

/**
 * ChatProjector — RFC-0001 §5.9
 *
 * DETERMINISTIC BUSINESS PROJECTION
 * 
 * Materializes Journal facts into conversation memory.
 * Ensures physical idempotency via signal_id UNIQUE constraint.
 */
export class ChatProjector extends BaseProjector {
    protected projectorName = 'chat';

    // Turn-window constants (ms)
    private readonly TURN_WINDOW_MS = 3000;          // Default window after a message
    private readonly TYPING_EXTENSION_MS = 5000;     // Extension when user is typing

    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // Dispatch based on fact type
        switch (signal.factType) {
            case 'EXTERNAL_INPUT_OBSERVED':
                return this.projectMessage(signal, tx);
            case 'EXTERNAL_STATE_OBSERVED':
                return this.projectStateChange(signal, tx);
            case 'CONNECTION_EVENT_OBSERVED':
                return this.projectConnectionEvent(signal, tx);
            default:
                // Not our concern — other projectors handle other fact types
                return;
        }
    }

    /**
     * Handle identity-link events from the webchat widget.
     * Updates the conversation's linked_account_id.
     * Does NOT create a visible message. Does NOT enqueue cognition.
     */
    private async projectConnectionEvent(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // Only handle webchat identity-link events
        if (signal.subjectNamespace !== 'chatcore/webchat-visitor') {
            return;
        }

        const visitorToken = signal.subjectKey;
        const realAccountId = signal.objectKey;

        if (!visitorToken || !realAccountId) {
            return;
        }

        const client = tx || db;

        // Find the conversation linked to this visitor_token
        const conversation = await client.query.conversations.findFirst({
            where: eq(conversations.visitorToken, visitorToken),
        });

        if (!conversation) {
            console.log(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — no conversation found for visitor ${visitorToken}`);
            return;
        }

        await client
            .update(conversations)
            .set({
                linkedAccountId: realAccountId,
                identityLinkedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));

        console.log(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — conversation ${conversation.id} linked to account ${realAccountId}`);
    }

    /**
     * Handle user state changes (typing, recording, idle).
     * Extends the turn window WITHOUT creating a message.
     */
    private async projectStateChange(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        let evidence = signal.evidenceRaw as any;
        
        // ROBUSTNESS: Handle stringified JSON
        if (typeof evidence === 'string') {
            try {
                evidence = JSON.parse(evidence);
            } catch (e) {
                console.warn(`[ChatProjector] Failed to parse evidenceRaw for seq ${signal.sequenceNumber}`, e);
                evidence = {};
            }
        }

        const raw = evidence?.raw || evidence;

        // Only extend window for "typing" or "recording" activities
        const activity = raw?.activity || raw?.status;
        if (activity !== 'typing' && activity !== 'recording') {
            return;
        }

        const accountId = evidence?.accountPerspective ?? evidence?.accountId ?? raw?.accountId;
        if (!accountId) return;

        // We need a conversation to extend the window for.
        // Use the account + subject to find a pending cognition entry.
        const client = tx || db;

        // Find any pending cognition entry for this account
        const pending = await client.query.fluxcoreCognitionQueue.findFirst({
            where: and(
                eq(fluxcoreCognitionQueue.accountId, accountId),
                sql`processed_at IS NULL`
            )
        });

        if (!pending) {
            // No pending turn — user is typing but no message has arrived yet. Safe to ignore.
            console.log(`[ChatProjector] Typing signal Seq #${signal.sequenceNumber} — no pending turn, skipping`);
            return;
        }

        // Extend the turn window: the user is still composing
        await client.update(fluxcoreCognitionQueue)
            .set({
                turnWindowExpiresAt: new Date(Date.now() + this.TYPING_EXTENSION_MS),
                lastSignalSeq: signal.sequenceNumber,
            })
            .where(and(
                eq(fluxcoreCognitionQueue.id, pending.id),
                sql`processed_at IS NULL`
            ));

        console.log(`[ChatProjector] Typing Seq #${signal.sequenceNumber} — extended turn window by ${this.TYPING_EXTENSION_MS}ms for conversation ${pending.conversationId}`);
    }

    /**
     * Handle incoming messages (text, media, etc).
     * Creates a message in ChatCore and enqueues cognition.
     */
    private async projectMessage(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // Need a subject to resolve identity
        if (!signal.subjectNamespace || !signal.subjectKey) {
            return;
        }

        const client = tx || db;

        // Resolve ActorId from the IdentityProjector's tables
        const address = await client.query.fluxcoreAddresses.findFirst({
            where: and(
                eq(fluxcoreAddresses.driverId, signal.provenanceDriverId),
                eq(fluxcoreAddresses.externalId, signal.subjectKey)
            )
        });

        if (!address) {
            throw new Error(`[ChatProjector] Identity not yet resolved for Seq #${signal.sequenceNumber}`);
        }

        const link = await client.query.fluxcoreActorAddressLinks.findFirst({
            where: eq(fluxcoreActorAddressLinks.addressId, address.id)
        });

        if (!link) {
            throw new Error(`[ChatProjector] Actor link not found for Seq #${signal.sequenceNumber}`);
        }

        // Extract business context from evidence
        const evidence = signal.evidenceRaw as any;
        const accountId = evidence?.accountPerspective ?? evidence?.accountId;

        if (!accountId) {
            console.log(`[ChatProjector] Seq #${signal.sequenceNumber} — no account perspective, skipping`);
            return;
        }

        // Project communication to business chat
        await this.projectCommunication(signal, link.actorId, accountId, evidence, tx);
    }

    private async projectCommunication(
        signal: typeof fluxcoreSignals.$inferSelect,
        actorId: string,
        accountId: string,
        evidence: any,
        tx: any
    ) {
        const client = tx || db;

        // 1. Resolve Relationship (Commercial Link)
        let rel = await client.query.relationships.findFirst({
            where: and(
                eq(relationships.accountAId, accountId),
                eq(relationships.actorId, actorId)
            )
        });

        if (!rel) {
            const displayName = evidence?.displayName || 'External Actor';
            const [newRel] = await client.insert(relationships).values({
                accountAId: accountId,
                accountBId: accountId,
                actorId: actorId as any,
                perspectiveB: {
                    saved_name: displayName,
                    tags: [],
                    status: 'active'
                }
            }).returning();
            rel = newRel;
        }

        // 2. Resolve Conversation Channel
        const channel = (signal.provenanceDriverId.split('/').pop() || 'web') as 'web' | 'whatsapp' | 'telegram';
        const conversation = await conversationService.createConversation(rel.id, channel, tx);

        // 3. Extract content and project DIRECTLY to messages table
        const text = evidence?.content?.text ?? evidence?.text ?? evidence?.body;
        if (text) {
            // PHYSICAL IDEMPOTENCY: ON CONFLICT (signal_id) DO NOTHING
            await client.insert(messages).values({
                conversationId: conversation.id,
                senderAccountId: accountId,
                content: { text },
                type: 'incoming',
                generatedBy: 'human',
                status: 'synced',
                signalId: signal.sequenceNumber,
                fromActorId: actorId as any,
                createdAt: signal.claimedOccurredAt ?? signal.observedAt,
            }).onConflictDoNothing({ target: [messages.signalId] });

            // 4. COGNITION ENQUEUE (Turn-Window)
            await client.insert(fluxcoreCognitionQueue).values({
                conversationId: conversation.id,
                accountId: accountId,
                lastSignalSeq: signal.sequenceNumber,
                turnWindowExpiresAt: new Date(Date.now() + this.TURN_WINDOW_MS),
            }).onConflictDoUpdate({
                target: [fluxcoreCognitionQueue.conversationId],
                set: {
                    lastSignalSeq: signal.sequenceNumber,
                    turnWindowExpiresAt: new Date(Date.now() + this.TURN_WINDOW_MS),
                    processedAt: null, // Re-open if it was being processed
                },
                where: sql`processed_at IS NULL`
            });
        }

        console.log(`[ChatProjector] Projected Seq #${signal.sequenceNumber} -> conversation ${conversation.id}`);
    }
}

export const chatProjector = new ChatProjector();
