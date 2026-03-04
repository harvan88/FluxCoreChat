import { BaseProjector } from '../kernel/base.projector';
import { conversationService } from '../../services/conversation.service';
import {
    db,
    relationships,
    and,
    eq,
    fluxcoreSignals,
    fluxcoreAddresses,
    fluxcoreActorAddressLinks,
    messages,
    fluxcoreCognitionQueue,
    conversations,
    fluxcoreActors,
} from '@fluxcore/db';
import { sql, isNull } from 'drizzle-orm';
import { coreEventBus } from '../events';

type TransactionClient = typeof db;

type EvidencePayload = {
    accountPerspective?: string;
    accountId?: string;
    tenantId?: string;
    visitorToken?: string;
    meta?: { humanSenderId?: string };
    content?: { text?: string };
    text?: string;
    body?: string;
    context?: { conversationId?: string };
};

interface ParsedEvidence {
    payload: EvidencePayload;
    raw: Record<string, unknown>;
}

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

    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        console.log(`[ChatProjector] ▶️ Processing signal #${signal.sequenceNumber} (${signal.factType})`);
        switch (signal.factType) {
            case 'chatcore.message.received':
                return this.projectMessage(signal, tx);
            case 'EXTERNAL_INPUT_OBSERVED':
                return this.projectMessage(signal, tx);
            case 'EXTERNAL_STATE_OBSERVED':
                return this.projectStateChange(signal, tx);
            case 'CONNECTION_EVENT_OBSERVED':
                return this.projectConnectionEvent(signal, tx);
            default:
                console.log(`[ChatProjector] ℹ️ Signal #${signal.sequenceNumber} ignored (fact type ${signal.factType}).`);
                return;
        }
    }

    /**
     * Handle identity-link events from the webchat widget.
     * Updates the conversation's linked_account_id.
     * AND NOW: Materializes the relationship and links the conversation.
     */
    private async projectConnectionEvent(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        // Only handle webchat identity-link events
        if (signal.subjectNamespace !== 'chatcore/webchat-visitor') {
            return;
        }

        const visitorToken = signal.subjectKey;
        const realAccountId = signal.objectKey;

        // Extract tenantId from evidence to create the relationship
        const evidence = this.parseEvidence(signal);
        const tenantId = evidence.payload.tenantId;

        if (!visitorToken || !realAccountId || !tenantId) {
            console.warn(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — missing required data`, { visitorToken, realAccountId, tenantId });
            return;
        }

        const client = tx;

        // Find the conversation linked to this visitor_token
        const [conversation] = await client.select().from(conversations)
            .where(eq(conversations.visitorToken, visitorToken))
            .limit(1);

        if (!conversation) {
            console.log(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — no conversation found for visitor ${visitorToken}`);
            return;
        }

        // 1. Create/Find Real Relationship (Tenant <-> Real Account)
        let [rel] = await client.select().from(relationships)
            .where(and(
                eq(relationships.accountAId, tenantId),
                eq(relationships.accountBId, realAccountId)
            ))
            .limit(1);

        if (!rel) {
            // Find actor for the real account to link properly
            const [actor] = await client.select().from(fluxcoreActors)
                .where(eq(fluxcoreActors.externalKey, visitorToken))
                .limit(1);
            
            const [newRel] = await client.insert(relationships).values({
                accountAId: tenantId,
                accountBId: realAccountId,
                actorId: actor?.id,
                perspectiveB: {
                    saved_name: 'Identified Visitor',
                    tags: ['visitor-converted'],
                    status: 'active'
                }
            }).returning();
            rel = newRel;
            console.log(`[ChatProjector] Created real relationship ${rel.id} for connection event (actor: ${actor?.id})`);
        }

        // 2. Link Conversation to Relationship
        await client
            .update(conversations)
            .set({
                relationshipId: rel.id, // Now we have a relationship!
                linkedAccountId: realAccountId,
                identityLinkedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));

        console.log(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — conversation ${conversation.id} linked to account ${realAccountId} and relationship ${rel.id}`);
    }

    /**
     * Handle user state changes (typing, recording, idle).
     * Extends the turn window WITHOUT creating a message.
     */
    private async projectStateChange(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // ... (unchanged)
        const evidence = this.parseEvidence(signal);
        const raw = evidence.raw;

        // Only extend window for "typing" or "recording" activities
        const activity = (raw.activity as string | undefined) ?? (raw.status as string | undefined);
        if (activity !== 'typing' && activity !== 'recording') {
            return;
        }

        const accountId = evidence.payload.accountPerspective ?? evidence.payload.accountId ?? (raw.accountId as string | undefined);
        if (!accountId) return;

        const client = tx;

        // Find any pending cognition entry for this account
        const pending = await client.query.fluxcoreCognitionQueue.findFirst({
            where: and(
                eq(fluxcoreCognitionQueue.accountId, accountId),
                sql`fluxcore_cognition_queue.processed_at IS NULL`
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
                sql`fluxcore_cognition_queue.processed_at IS NULL`
            ));

        console.log(`[ChatProjector] Typing Seq #${signal.sequenceNumber} — extended turn window by ${this.TYPING_EXTENSION_MS}ms for conversation ${pending.conversationId}`);
    }

    /**
     * Handle incoming messages (text, media, etc).
     * SOLO correlaciona con mensaje existente, no crea nuevos.
     */
    private async projectMessage(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        console.log(`[ChatProjector] 🔍 Starting message projection for signal #${signal.sequenceNumber}`);
        
        // Need a subject to resolve identity
        if (!signal.subjectNamespace || !signal.subjectKey) {
            console.log(`[ChatProjector] ⚠️ Signal #${signal.sequenceNumber} missing subject, skipping`);
            return;
        }

        const client = tx;

        // RETRY LOGIC: IdentityProjector might be slightly behind or parallel
        let address;
        let link;
        let attempts = 0;
        const maxAttempts = 3;

        console.log(`[ChatProjector] 🔍 Resolving identity for signal #${signal.sequenceNumber} (driver: ${signal.provenanceDriverId}, subject: ${signal.subjectKey})`);

        while (attempts < maxAttempts) {
            // Resolve ActorId from the IdentityProjector's tables
            address = await client.query.fluxcoreAddresses.findFirst({
                where: and(
                    eq(fluxcoreAddresses.driverId, signal.provenanceDriverId),
                    eq(fluxcoreAddresses.externalId, signal.subjectKey)
                )
            });

            if (address) {
                link = await client.query.fluxcoreActorAddressLinks.findFirst({
                    where: eq(fluxcoreActorAddressLinks.addressId, address.id)
                });
            }

            if (address && link) break;

            // Wait before retry
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`[ChatProjector] 🔄 Retry ${attempts}/${maxAttempts} for signal #${signal.sequenceNumber}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (!address) {
            console.error(`[ChatProjector] ❌ Identity (Address) not yet resolved for Seq #${signal.sequenceNumber} after ${maxAttempts} attempts. Driver=${signal.provenanceDriverId} Key=${signal.subjectKey}`);
            throw new Error(`[ChatProjector] Identity (Address) not yet resolved for Seq #${signal.sequenceNumber} after ${maxAttempts} attempts. Driver=${signal.provenanceDriverId} Key=${signal.subjectKey}`);
        }

        if (!link) {
             console.error(`[ChatProjector] ❌ Identity (Link) not found for Seq #${signal.sequenceNumber} (Address: ${address.id})`);
             throw new Error(`[ChatProjector] Identity (Link) not found for Seq #${signal.sequenceNumber} (Address: ${address.id})`);
        }

        console.log(`[ChatProjector] ✅ Identity resolved for signal #${signal.sequenceNumber} (address: ${address.id}, link: ${link.id})`);

        // Extract business context from evidence
        const evidence = this.parseEvidence(signal);
        // WES-180: WebchatGateway sends tenantId, others send accountId or accountPerspective
        const accountId = evidence.payload.accountPerspective ?? evidence.payload.accountId ?? evidence.payload.tenantId;
        const visitorToken = evidence.payload.visitorToken;

        if (!accountId) {
            console.log(`[ChatProjector] Seq #${signal.sequenceNumber} — no account perspective (or tenantId), skipping`);
            return;
        }

        // 🔥 NUEVO: Solo correlacionar, no crear mensaje
        // Buscar mensaje existente por conversation + sender + timestamp
        const signalTime = signal.claimedOccurredAt || signal.observedAt;
        const timeWindow = new Date(signalTime.getTime() - 10 * 60 * 1000); // 10 minutos antes (aumentado de 5)
        
        console.log(`[ChatProjector] 🔍 Searching for message to correlate with signal #${signal.sequenceNumber}`);
        console.log(`[ChatProjector] 📊 Search criteria: accountId=${accountId}, timeWindow=${timeWindow.toISOString()}`);
        
        // Obtener conversationId desde evidence para evitar cruces entre conversaciones
        const conversationId = evidence.payload.context?.conversationId;
        
        let query = client.select()
            .from(messages)
            .where(eq(messages.senderAccountId, accountId))
            .where(sql`${messages.createdAt} >= ${timeWindow}`)
            .where(isNull(messages.signalId));
            
        // Agregar filtro por conversationId si está disponible
        if (conversationId) {
            query = query.where(eq(messages.conversationId, conversationId));
        }
        
        const [existingMessage] = await query.limit(1);

        if (existingMessage) {
            // Correlacionar con signal
            await client.update(messages)
                .set({ signalId: signal.sequenceNumber })
                .where(eq(messages.id, existingMessage.id));
                
            console.log(`[ChatProjector] ✅ Correlated message ${existingMessage.id} with signal #${signal.sequenceNumber}`);
            
            // Encolar en cognition_queue para procesamiento de FluxCore
            await this.enqueueForCognition(existingMessage.conversationId, accountId, signal.sequenceNumber, tx);
        } else {
            // No hay mensaje para correlacionar - esto es normal si el mensaje aún no fue persistido
            console.log(`[ChatProjector] ℹ️ No message found for signal #${signal.sequenceNumber} - will retry on next processing`);
            console.log(`[ChatProjector] 📊 Signal time: ${signalTime.toISOString()}, Search window: ${timeWindow.toISOString()}`);
            return;
        }
    }

    private async projectCommunication(
        signal: typeof fluxcoreSignals.$inferSelect,
        actorId: string,
        accountId: string,
        evidence: ParsedEvidence,
        tx: TransactionClient,
        visitorToken?: string
    ) {
        const client = tx;

        // 1. Usar mundo definido por ChatCoreGateway (autoridad centralizada)
        const worldContext = signal.evidenceRaw?.meta;
        const channel = worldContext?.channel || 'unknown';
        const source = worldContext?.source || 'unknown';
        const priority = worldContext?.priority || 'normal';
        const routing = worldContext?.routing || { requiresAi: true, skipProcessing: false };
        
        console.log(`[ChatProjector] 🌍 Using world from Gateway: channel=${channel}, source=${source}, priority=${priority} for signal #${signal.sequenceNumber}`);
        
        // 2. Aplicar routing definido por Gateway
        if (routing.skipProcessing) {
            console.log(`[ChatProjector] ⏭️  SKIP PROCESSING: routing.skipProcessing=true for signal #${signal.sequenceNumber}`);
            return;
        }
        
        // 3. Validación de contexto
        if (channel === 'unknown') {
            console.warn(`[ChatProjector] ⚠️ Unknown channel for signal #${signal.sequenceNumber} - worldContext: ${JSON.stringify(worldContext)}`);
        }

        // 2. Resolve Conversation
        const conversationId = evidence.payload.context?.conversationId;
        let conversation;

        if (conversationId) {
            // CONVERSATION EXISTS: Use it (flujo interno continuo)
            const [existing] = await client.select().from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);
            
            if (existing) {
                conversation = existing;
                
                // Check if relationship exists for this conversation
                const [rel] = await client.select().from(relationships)
                    .where(eq(relationships.id, existing.relationshipId))
                    .limit(1);
                
                if (rel) {
                    // Relationship exists (Internal chat or previously linked visitor)
                    conversation = await conversationService.ensureConversation({
                        relationshipId: rel.id,
                        channel
                    }, client);
                } else {
                    // No relationship found
                    if (visitorToken) {
                        // VISITOR FLOW: Create conversation bound to Owner + VisitorToken
                        conversation = await conversationService.ensureConversation({
                            visitorToken,
                            channel
                        }, client);
                    } else {
                        // INTERNAL FLOW WITHOUT RELATIONSHIP: Skip projection
                        console.warn(`[ChatProjector] Seq #${signal.sequenceNumber} — No relationship found for internal flow (actor=${actorId}, account=${accountId}). Skipping.`);
                        return;
                    }
                }
            } else {
                console.warn(`[ChatProjector] Seq #${signal.sequenceNumber} — conversationId in evidence but not found in DB. Creating new.`);
                return;
            }
        }
    }

    /**
     * Enqueue for cognition processing
     */
    private async enqueueForCognition(conversationId: string, accountId: string, signalSequence: bigint, tx: TransactionClient): Promise<void> {
        const expiresAt = new Date(Date.now() + this.TURN_WINDOW_MS);
        
        await tx.execute(sql`
            INSERT INTO fluxcore_cognition_queue (
                conversation_id, 
                account_id, 
                last_signal_seq, 
                turn_started_at, 
                turn_window_expires_at
            )
            VALUES
                (${conversationId}, ${accountId}, ${signalSequence}, NOW(), ${expiresAt})
            ON CONFLICT (conversation_id) WHERE fluxcore_cognition_queue.processed_at IS NULL
            DO UPDATE SET
                last_signal_seq = EXCLUDED.last_signal_seq,
                turn_window_expires_at = EXCLUDED.turn_window_expires_at,
                processed_at = NULL
        `);

        // Wake up cognition worker immediately (event-driven)
        setImmediate(() => {
            coreEventBus.emit('kernel:cognition:wakeup', {
                conversationId,
                accountId,
            });
        });
    }

    private parseEvidence(signal: typeof fluxcoreSignals.$inferSelect): ParsedEvidence {
        let evidenceRoot: unknown = signal.evidenceRaw;

        if (typeof evidenceRoot === 'string') {
            try {
                evidenceRoot = JSON.parse(evidenceRoot);
            } catch (error) {
                console.error(`[ChatProjector] ❌ Failed to parse evidenceRaw for seq ${signal.sequenceNumber}`, error);
                evidenceRoot = {};
            }
        }

        if (evidenceRoot && typeof evidenceRoot === 'object' && 'raw' in evidenceRoot && typeof evidenceRoot.raw === 'object' && evidenceRoot.raw !== null) {
            return {
                payload: evidenceRoot as EvidencePayload,
                raw: evidenceRoot.raw as Record<string, unknown>,
            };
        }

        const payload = (evidenceRoot && typeof evidenceRoot === 'object') ? (evidenceRoot as EvidencePayload) : {};

        return {
            payload,
            raw: (evidenceRoot && typeof evidenceRoot === 'object') ? (evidenceRoot as Record<string, unknown>) : {},
        };
    }
}

export const chatProjector = new ChatProjector();
