// CONVERSATION GARBAGE COLLECTION SERVICE — Modelo canónico v2.0
//
// Responsabilidad:
// Detectar y eliminar físicamente conversaciones donde ningún actor
// permanece suscrito. Esta es una operación interna del sistema,
// no iniciada por actores.
//
// Principios:
// 1. Una conversación solo se elimina cuando no quedan suscriptores.
// 2. Los mensajes se eliminan en cascada (FK onDelete: cascade).
// 3. Toda eliminación física debe registrarse para auditoría.

import { db, conversations, conversationParticipants } from '@fluxcore/db';
import { eq, sql } from 'drizzle-orm';

export type GCResult = {
  conversationsRemoved: number;
  conversationIds: string[];
  timestamp: Date;
};

class ConversationGCService {

  /**
   * Detecta conversaciones donde todos los participantes se han desuscrito.
   * Retorna los IDs de conversaciones candidatas a eliminación física.
   */
  async findAbandonedConversations(): Promise<string[]> {
    // Buscar conversaciones que tienen participantes pero TODOS están desuscritos
    const abandoned = await db.execute(sql`
      SELECT c.id
      FROM conversations c
      WHERE EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id
        AND cp.unsubscribed_at IS NULL
      )
    `);

    return (abandoned as unknown as Array<{ id: string }>).map(row => row.id);
  }

  /**
   * Elimina físicamente las conversaciones abandonadas.
   * Los mensajes se eliminan en cascada por la FK.
   *
   * Retorna el resultado de la operación de limpieza.
   */
  async collectAbandonedConversations(): Promise<GCResult> {
    const timestamp = new Date();
    const abandonedIds = await this.findAbandonedConversations();

    if (abandonedIds.length === 0) {
      console.log('[ConversationGC] No abandoned conversations found');
      return { conversationsRemoved: 0, conversationIds: [], timestamp };
    }

    console.log(`[ConversationGC] Found ${abandonedIds.length} abandoned conversations: ${abandonedIds.join(', ')}`);

    let removed = 0;
    for (const conversationId of abandonedIds) {
      try {
        await db
          .delete(conversations)
          .where(eq(conversations.id, conversationId));
        removed++;
        console.log(`[ConversationGC] Removed conversation ${conversationId}`);
      } catch (error) {
        console.error(`[ConversationGC] Error removing conversation ${conversationId}:`, error);
      }
    }

    console.log(`[ConversationGC] GC complete: ${removed}/${abandonedIds.length} conversations removed`);

    return {
      conversationsRemoved: removed,
      conversationIds: abandonedIds.slice(0, removed),
      timestamp,
    };
  }

  /**
   * Verifica si una conversación específica está abandonada
   * (todos los participantes se han desuscrito).
   */
  async isConversationAbandoned(conversationId: string): Promise<boolean> {
    const activeParticipants = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        eq(conversationParticipants.conversationId, conversationId),
      )
      .limit(1);

    // Si no tiene participantes, considerarla abandonada
    if (activeParticipants.length === 0) {
      return true;
    }

    // Verificar si hay al menos un participante activo (no desuscrito)
    const active = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(
        sql`${conversationParticipants.conversationId} = ${conversationId}
            AND ${conversationParticipants.unsubscribedAt} IS NULL`
      )
      .limit(1);

    return active.length === 0;
  }
}

export const conversationGCService = new ConversationGCService();
