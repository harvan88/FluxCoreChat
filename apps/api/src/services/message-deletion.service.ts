// MESSAGE DELETION SERVICE — Modelo canónico de eliminación v2.0
//
// Principios:
// 1. Los mensajes nunca se eliminan físicamente por acción de un actor.
// 2. "Eliminar para todos" = redacción (sobrescritura del contenido).
// 3. "Eliminar para mí" = ocultamiento por actor (message_visibility).
// 4. Las conversaciones se desuscriben, no se eliminan.

import { db, messages, messageVisibility } from '@fluxcore/db';
import { eq, and, notInArray } from 'drizzle-orm';

export type DeletionScope = 'self' | 'all';

export type RedactionResult = {
  success: boolean;
  reason?: string;
  redactedAt?: Date;
};

export type HideResult = {
  success: boolean;
  reason?: string;
  hiddenAt?: Date;
};

/** Contenido canónico que reemplaza al original tras una redacción */
const REDACTED_CONTENT = Object.freeze({
  text: 'Este mensaje fue eliminado',
});

class MessageDeletionService {

  // ─── REDACCIÓN (eliminar para todos) ───────────────────────────

  /**
   * Redacta un mensaje: sobrescribe el contenido original.
   * El mensaje sigue existiendo en la conversación, pero su contenido
   * deja de existir en ChatCore.
   *
   * Reglas:
   * - Solo el emisor puede redactar su propio mensaje.
   * - Permitido dentro de 60 minutos desde created_at.
   * - Un mensaje ya redactado no puede redactarse de nuevo.
   */
  async redactMessage(
    messageId: string,
    requesterAccountId: string,
  ): Promise<RedactionResult> {
    try {
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return { success: false, reason: 'Message not found' };
      }

      if (message.senderAccountId !== requesterAccountId) {
        return { success: false, reason: 'Only message sender can redact their own messages' };
      }

      if (message.redactedAt) {
        return { success: false, reason: 'Message already redacted' };
      }

      // Ventana de tiempo: 60 minutos
      const now = new Date();
      const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
      if (now > deadline) {
        return { success: false, reason: 'Cannot redact message after 60 minutes window' };
      }

      // Sobrescribir contenido y marcar redacción
      const redactedAt = new Date();
      await db
        .update(messages)
        .set({
          content: REDACTED_CONTENT,
          redactedAt,
          redactedBy: requesterAccountId,
        })
        .where(eq(messages.id, messageId));

      console.log(`[MessageDeletion] Message ${messageId} redacted by ${requesterAccountId}`);

      return { success: true, redactedAt };
    } catch (error) {
      console.error('[MessageDeletion] Error redacting message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  // ─── OCULTAMIENTO POR ACTOR (eliminar para mí) ────────────────

  /**
   * Oculta un mensaje para un actor específico.
   * El mensaje sigue existiendo en ChatCore y visible para otros actores.
   * No tiene ventana de tiempo: se puede ocultar en cualquier momento.
   */
  async hideMessageForActor(
    messageId: string,
    actorId: string,
  ): Promise<HideResult> {
    try {
      const [message] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return { success: false, reason: 'Message not found' };
      }

      // Insertar en message_visibility (upsert para idempotencia)
      const hiddenAt = new Date();
      await db
        .insert(messageVisibility)
        .values({
          messageId,
          actorId,
          hiddenAt,
        })
        .onConflictDoNothing();

      console.log(`[MessageDeletion] Message ${messageId} hidden for actor ${actorId}`);

      return { success: true, hiddenAt };
    } catch (error) {
      console.error('[MessageDeletion] Error hiding message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  /**
   * Restaura la visibilidad de un mensaje para un actor.
   * Elimina la entrada de message_visibility.
   */
  async unhideMessageForActor(
    messageId: string,
    actorId: string,
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      await db
        .delete(messageVisibility)
        .where(
          and(
            eq(messageVisibility.messageId, messageId),
            eq(messageVisibility.actorId, actorId),
          )
        );

      return { success: true };
    } catch (error) {
      console.error('[MessageDeletion] Error unhiding message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  /**
   * Oculta TODOS los mensajes de una conversación para un actor.
   * Usado por "Vaciar chat" — el actor deja de ver los mensajes
   * pero la conversación sigue existiendo.
   */
  async hideAllMessagesForActor(
    conversationId: string,
    actorId: string,
  ): Promise<{ success: boolean; hiddenCount: number; reason?: string }> {
    try {
      // Get all message IDs in the conversation
      const allMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      if (allMessages.length === 0) {
        return { success: true, hiddenCount: 0 };
      }

      // Bulk insert into message_visibility (skip duplicates)
      const values = allMessages.map(m => ({
        messageId: m.id,
        actorId,
        hiddenAt: new Date(),
      }));

      await db
        .insert(messageVisibility)
        .values(values)
        .onConflictDoNothing();

      console.log(`[MessageDeletion] All ${allMessages.length} messages in conversation ${conversationId} hidden for actor ${actorId}`);

      return { success: true, hiddenCount: allMessages.length };
    } catch (error) {
      console.error('[MessageDeletion] Error hiding all messages:', error);
      return { success: false, hiddenCount: 0, reason: 'Internal server error' };
    }
  }

  // ─── CONSULTAS CON FILTRO DE VISIBILIDAD ───────────────────────

  /**
   * Obtiene los IDs de mensajes ocultos para un actor en una conversación.
   */
  async getHiddenMessageIds(
    conversationId: string,
    actorId: string,
  ): Promise<string[]> {
    const rows = await db
      .select({ messageId: messageVisibility.messageId })
      .from(messageVisibility)
      .innerJoin(messages, eq(messages.id, messageVisibility.messageId))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messageVisibility.actorId, actorId),
        )
      );

    return rows.map(r => r.messageId);
  }

  /**
   * Obtiene mensajes de una conversación filtrando por visibilidad del actor.
   * Excluye mensajes que el actor ha ocultado individualmente.
   */
  async getMessagesWithVisibilityFilter(
    conversationId: string,
    viewerActorId: string,
    limit = 50,
    cursor?: Date,
  ) {
    const hiddenIds = await this.getHiddenMessageIds(conversationId, viewerActorId);

    const conditions = [eq(messages.conversationId, conversationId)];

    if (hiddenIds.length > 0) {
      conditions.push(notInArray(messages.id, hiddenIds));
    }

    if (cursor) {
      const { lt } = await import('drizzle-orm');
      conditions.push(lt(messages.createdAt, cursor));
    }

    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(messages.createdAt)
      .limit(limit);
  }

  /**
   * Verifica si un mensaje es visible para un actor.
   */
  async isMessageVisibleForActor(
    messageId: string,
    actorId: string,
  ): Promise<boolean> {
    const [hidden] = await db
      .select({ id: messageVisibility.id })
      .from(messageVisibility)
      .where(
        and(
          eq(messageVisibility.messageId, messageId),
          eq(messageVisibility.actorId, actorId),
        )
      )
      .limit(1);

    return !hidden;
  }

  // ─── UTILIDADES ────────────────────────────────────────────────

  /**
   * Verifica si un mensaje puede ser redactado (eliminar para todos).
   */
  async canRedact(messageId: string): Promise<boolean> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.redactedAt) return false;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    return now <= deadline;
  }

  /**
   * Obtiene el tiempo restante para redactar un mensaje (en segundos).
   */
  async getTimeRemainingForRedaction(messageId: string): Promise<number | null> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.redactedAt) return null;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    const remaining = deadline.getTime() - now.getTime();

    return remaining > 0 ? Math.floor(remaining / 1000) : null;
  }

  /**
   * Dispatch unificado: delega a redacción u ocultamiento según scope.
   * Mantiene compatibilidad con la interfaz anterior.
   */
  async deleteMessage(
    messageId: string,
    requesterAccountId: string,
    scope: DeletionScope,
    requesterActorId?: string,
  ): Promise<{ success: boolean; scope: DeletionScope; reason?: string }> {
    if (scope === 'all') {
      const result = await this.redactMessage(messageId, requesterAccountId);
      return { ...result, scope };
    }

    // scope === 'self': necesitamos actorId
    if (!requesterActorId) {
      return { success: false, scope, reason: 'actorId required for scope "self"' };
    }

    const result = await this.hideMessageForActor(messageId, requesterActorId);
    return { ...result, scope };
  }
}

export const messageDeletionService = new MessageDeletionService();
