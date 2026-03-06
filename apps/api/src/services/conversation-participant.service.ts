import { db, conversationParticipants, conversations, relationships } from '@fluxcore/db';
import { and, eq, isNull } from 'drizzle-orm';

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

        const desiredParticipants: Array<{ accountId: string; role: ParticipantRole; identityType: ParticipantIdentity }> = [];

        if (conversation.relationshipId) {
            const relationship = await client.query.relationships.findFirst({
                where: eq(relationships.id, conversation.relationshipId),
            });

            if (relationship) {
                if (relationship.accountAId) {
                    desiredParticipants.push({
                        accountId: relationship.accountAId,
                        role: 'initiator',
                        identityType: 'registered',
                    });
                }

                if (relationship.accountBId && relationship.accountBId !== relationship.accountAId) {
                    desiredParticipants.push({
                        accountId: relationship.accountBId,
                        role: 'recipient',
                        identityType: 'registered',
                    });
                }
            }
        }

        // Manejar conversaciones visitor (widget)
        if (conversation.visitorToken && !conversation.relationshipId) {
            console.log(`[Participants] 🎯 Creando participant observer para visitor ${conversation.visitorToken}`);
            desiredParticipants.push({
                accountId: 'visitor',
                role: 'observer',
                identityType: 'anonymous',
            });

            // Add owner account (tenant) as recipient so they see the conversation
            if (conversation.ownerAccountId) {
                desiredParticipants.push({
                    accountId: conversation.ownerAccountId,
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

    private async upsertParticipant(
        params: {
            conversationId: string;
            accountId: string;
            role: ParticipantRole;
            identityType: ParticipantIdentity;
            visitorToken?: string; // 🔥 NUEVO: Agregar visitorToken opcional
        },
        tx?: DbClient
    ): Promise<void> {
        const client = tx || db;
        await client
            .insert(conversationParticipants)
            .values({
                conversationId: params.conversationId,
                accountId: params.accountId,
                role: params.role,
                identityType: params.identityType,
                visitorToken: params.visitorToken, // 🔥 NUEVO: Incluir visitorToken
                unsubscribedAt: null,
            })
            .onConflictDoUpdate({
                target: [conversationParticipants.conversationId, conversationParticipants.accountId],
                set: {
                    role: params.role,
                    identityType: params.identityType,
                    visitorToken: params.visitorToken, // 🔥 NUEVO: Actualizar visitorToken
                    unsubscribedAt: null,
                },
            });
    }
}

export const conversationParticipantService = new ConversationParticipantService();
