import { db, conversationParticipants, conversations, relationships, actors } from '@fluxcore/db';
import { and, eq, isNull } from 'drizzle-orm';
import { resolveAccountId, resolveActorId } from '../utils/actor-resolver';

type DbClient = typeof db;

export type ParticipantRole = 'initiator' | 'recipient' | 'observer';
export type ParticipantIdentity = 'registered' | 'anonymous' | 'system';

export interface ConversationParticipantView {
    conversationId: string;
    accountId: string | null;
    role: ParticipantRole;
    identityType: ParticipantIdentity;
    visitorToken?: string | null;
}

class ConversationParticipantService {
    async ensureParticipantsForConversation(conversationId: string, tx?: DbClient): Promise<void> {
        const client = tx || db;
        const conversation = await client.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
        });

        if (!conversation) {
            console.log(`[Participants] ❌ Conversación ${conversationId} no encontrada`);
            return;
        }

        console.log(`[Participants] 🔍 Procesando conversación ${conversationId} (relationship: ${conversation.relationshipId}, visitor: ${conversation.visitorToken})`);

        const desiredParticipants: Array<{ accountId: string; actorId?: string; role: ParticipantRole; identityType: ParticipantIdentity }> = [];

        if (conversation.relationshipId) {
            const relationship = await client.query.relationships.findFirst({
                where: eq(relationships.id, conversation.relationshipId),
            });

            if (relationship) {
                const accountAId = await resolveAccountId(relationship.actorAId);
                const accountBId = await resolveAccountId(relationship.actorBId);

                if (accountAId) {
                    desiredParticipants.push({
                        accountId: accountAId,
                        actorId: relationship.actorAId,
                        role: 'initiator',
                        identityType: 'registered',
                    });
                }

                if (accountBId && accountBId !== accountAId) {
                    desiredParticipants.push({
                        accountId: accountBId,
                        actorId: relationship.actorBId,
                        role: 'recipient',
                        identityType: 'registered',
                    });
                }
            }
        }

        // Manejar conversaciones visitor (widget)
        if (conversation.visitorToken && !conversation.relationshipId) {
            console.log(`[Participants] 🎯 Creando participant observer para visitor ${conversation.visitorToken}`);

            // Find or create visitor actor
            const [visitorActor] = await db
                .select({ id: actors.id })
                .from(actors)
                .where(eq(actors.externalKey, conversation.visitorToken))
                .limit(1);

            desiredParticipants.push({
                accountId: 'visitor',
                actorId: visitorActor?.id,
                role: 'observer',
                identityType: 'anonymous',
            });

            // Add owner account (tenant) as recipient so they see the conversation
            if (conversation.ownerAccountId) {
                const ownerActorId = await resolveActorId(conversation.ownerAccountId);
                desiredParticipants.push({
                    accountId: conversation.ownerAccountId,
                    actorId: ownerActorId || undefined,
                    role: 'recipient',
                    identityType: 'registered',
                });
            }
        }

        const seenAccounts = new Set<string>();
        for (const participant of desiredParticipants) {
            if (seenAccounts.has(participant.accountId || 'visitor')) continue;
            seenAccounts.add(participant.accountId || 'visitor');
            
            await this.upsertParticipant({
                conversationId,
                ...participant,
                visitorToken: conversation.visitorToken, // 🔥 Pasar visitorToken
            }, client);
        }
        
        console.log(`[Participants] ✅ Procesados ${desiredParticipants.length} participants para ${conversationId}`);
    }

    async getActiveParticipants(conversationId: string): Promise<ConversationParticipantView[]> {
        const participantRows = await db
            .select({
                conversationId: conversationParticipants.conversationId,
                accountId: conversationParticipants.accountId,
                role: conversationParticipants.role,
                identityType: conversationParticipants.identityType,
            })
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    isNull(conversationParticipants.unsubscribedAt)
                )
            );

        const participants: ConversationParticipantView[] = participantRows.map((row) => ({
            conversationId: row.conversationId,
            accountId: row.accountId,
            role: row.role as ParticipantRole,
            identityType: row.identityType as ParticipantIdentity,
            visitorToken: null,
        }));

        const conversation = await db
            .select({ visitorToken: conversations.visitorToken })
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

        const visitorToken = conversation[0]?.visitorToken ?? null;
        if (visitorToken) {
            participants.push({
                conversationId,
                accountId: null,
                role: 'observer',
                identityType: 'anonymous',
                visitorToken,
            });
        }

        return participants;
    }

    /**
     * 🔑 CRÍTICO PARA FASE 2: Obtener el recipient (cuenta del negocio) de una conversación
     */
    async getRecipient(conversationId: string): Promise<{ accountId: string } | null> {
        const recipient = await db
            .select({ accountId: conversationParticipants.accountId })
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.role, 'recipient'),
                    isNull(conversationParticipants.unsubscribedAt)
                )
            )
            .limit(1);

        return recipient[0] || null;
    }

    async ensureActiveParticipant(conversationId: string, accountId: string, tx?: DbClient): Promise<void> {
        const client = tx || db;
        
        await client
            .update(conversationParticipants)
            .set({ unsubscribedAt: null })
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.accountId, accountId)
                )
            );
    }

    private async upsertParticipant(
        params: {
            conversationId: string;
            accountId: string;
            actorId?: string;
            role: ParticipantRole;
            identityType: ParticipantIdentity;
            visitorToken?: string;
        },
        tx?: DbClient
    ): Promise<void> {
        const client = tx || db;
        await client
            .insert(conversationParticipants)
            .values({
                conversationId: params.conversationId,
                accountId: params.accountId,
                actorId: params.actorId || null,
                role: params.role,
                identityType: params.identityType,
                visitorToken: params.visitorToken,
                unsubscribedAt: null,
            })
            .onConflictDoUpdate({
                target: [conversationParticipants.conversationId, conversationParticipants.accountId],
                set: {
                    actorId: params.actorId || null,
                    role: params.role,
                    identityType: params.identityType,
                    visitorToken: params.visitorToken,
                    unsubscribedAt: null,
                },
            });
    }
}

export const conversationParticipantService = new ConversationParticipantService();
