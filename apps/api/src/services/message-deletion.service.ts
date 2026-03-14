// MESSAGE DELETION SERVICE — Modelo canónico de eliminación v2.1
//
// Principios:
// 1. Los mensajes nunca se eliminan físicamente por acción de un actor.
// 2. "Eliminar para todos" = sobrescritura (reemplazo destructivo del contenido).
// 3. "Eliminar para mí" = ocultamiento por actor (message_visibility).
// 4. Las conversaciones se desuscriben, no se eliminan.
//
// Refactoring 2026-03-13: "redacción" → "sobrescritura" para clarificar terminología

import crypto from 'node:crypto';

import { db, messages, messageVisibility } from '@fluxcore/db';
import { eq, and, notInArray } from 'drizzle-orm';

export type DeletionScope = 'self' | 'all';

export type OverwriteResult = {
  success: boolean;
  reason?: string;
  overwrittenAt?: Date;
  redactedAt?: Date; // Para compatibilidad con legacy
};

// Tipo legacy (deprecated) - mantener compatibilidad
export type RedactionResult = OverwriteResult;

export type HideResult = {
  success: boolean;
  reason?: string;
  hiddenAt?: Date;
};

/** Contenido canónico que reemplaza al original tras una sobrescritura */
const OVERWRITTEN_CONTENT = Object.freeze({
  text: 'Este mensaje fue eliminado',
});

class MessageDeletionService {

  // ─── SOBRESCRITURA (eliminar para todos) ───────────────────────────

  /**
   * Sobrescribe un mensaje: reemplaza el contenido original.
   * El mensaje sigue existiendo en la conversación, pero su contenido
   * original deja de existir en ChatCore.
   *
   * Reglas:
   * - Solo el emisor puede sobrescribir su propio mensaje.
   * - Permitido dentro de 60 minutos desde created_at.
   * - Un mensaje ya sobrescrito no puede sobrescribirse de nuevo.
   */
  async overwriteMessageForAll(
    messageId: string,
    requesterAccountId: string,
  ): Promise<OverwriteResult> {
    console.log(`[MessageDeletion] 🔍 DEBUG: overwriteMessageForAll llamado`);
    console.log(`[MessageDeletion] 📥 DEBUG: messageId=${messageId}, requesterAccountId=${requesterAccountId}`);
    
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
        return { success: false, reason: 'Only message sender can overwrite their own messages' };
      }

      if (message.overwrittenAt) {
        return { success: false, reason: 'Message already overwritten' };
      }

      // Ventana de tiempo: 60 minutos
      const now = new Date();
      const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
      if (now > deadline) {
        return { success: false, reason: 'Cannot overwrite message after 60 minutes window' };
      }

      // Sobrescribir contenido y marcar
      const overwrittenAt = new Date();
      await db
        .update(messages)
        .set({
          content: OVERWRITTEN_CONTENT,
          overwrittenAt,
          overwrittenBy: requesterAccountId,
          // Mantener campos legacy por compatibilidad
          redactedAt: overwrittenAt,
          redactedBy: requesterAccountId,
        })
        .where(eq(messages.id, messageId));

      console.log(`[MessageDeletion] Message ${messageId} overwritten by ${requesterAccountId}`);

      // 🔄 ENVIAR NOTIFICACIÓN WEBSOCKET A TODOS LOS PARTICIPANTES
      try {
        const { messageCore } = await import('../core/message-core');
        const [message] = await db
          .select({
            id: messages.id,
            conversationId: messages.conversationId,
            senderAccountId: messages.senderAccountId,
            content: messages.content,
            overwrittenAt: messages.overwrittenAt,
            overwrittenBy: messages.overwrittenBy,
            createdAt: messages.createdAt,
            type: messages.type,
            generatedBy: messages.generatedBy,
          })
          .from(messages)
          .where(eq(messages.id, messageId))
          .limit(1);

        if (message) {
          // Notificar a todos los participantes de la conversación
          const payload = {
            type: 'message:updated',
            data: {
              ...message,
              action: 'overwritten', // Cambiado de 'redacted' a 'overwritten'
              overwrittenBy: requesterAccountId,
              overwrittenAt: overwrittenAt,
            }
          };
          
          console.log(`[MessageDeletion] Broadcasting message:updated payload:`, {
            conversationId: message.conversationId,
            messageId: message.id,
            senderAccountId: message.senderAccountId,
            overwrittenBy: requesterAccountId,
            payloadType: payload.type,
            payloadAction: payload.data.action
          });
          
          await messageCore.broadcastToConversation(message.conversationId, payload);
          console.log(`[MessageDeletion] WebSocket notification sent for overwritten message ${messageId}`);
        }
      } catch (wsError) {
        console.error('[MessageDeletion] Error sending WebSocket notification:', wsError);
        // No fallar la operación si el WebSocket falla
      }

      // ═══════════════════════════════════════════════════════════════
      // CERTIFICACIÓN EN KERNEL (usando chatcore-gateway existente)
      // ═══════════════════════════════════════════════════════════════
      try {
        const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
        
        // Obtener hash del contenido original
        const originalContent = message.content;
        const originalContentHash = this.hashContent(originalContent);
        
        // Certificar con EXTERNAL_STATE_OBSERVED
        const certification = await chatCoreGateway.certifyStateChange({
          stateChange: 'message_content_overwritten',
          messageId,
          overwrittenBy: requesterAccountId,
          conversationId: message.conversationId,
          originalContentHash
        });
        
        if (certification.accepted) {
          console.log(`[MessageDeletion] Overwrite certified: signal #${certification.signalId}`);
        } else {
          console.warn(`[MessageDeletion] Failed to certify overwrite: ${certification.reason}`);
        }
      } catch (certError: any) {
        console.error('[MessageDeletion] Error certifying overwrite:', certError);
        // No fallar la operación principal por error en certificación
      }

      return { success: true, overwrittenAt };
    } catch (error) {
      console.error('[MessageDeletion] Error overwriting message:', error);
      return { success: false, reason: 'Internal server error' };
    }
  }

  // MÉTODO LEGACY (redirección) - mantener por compatibilidad
  async redactMessage(
    messageId: string,
    requesterAccountId: string,
  ): Promise<RedactionResult> {
    console.warn('[MessageDeletion] DEPRECATED: redactMessage() called, use overwriteMessageForAll()');
    const result = await this.overwriteMessageForAll(messageId, requesterAccountId);
    
    // Convertir resultado al formato legacy
    return {
      success: result.success,
      reason: result.reason,
      redactedAt: result.overwrittenAt,
    };
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
   * Verifica si un mensaje puede ser sobrescrito (eliminar para todos).
   */
  async canOverwrite(messageId: string): Promise<boolean> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, overwrittenAt: messages.overwrittenAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.overwrittenAt) return false;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    return now <= deadline;
  }

  // Mantener método legacy por compatibilidad
  async canRedact(messageId: string): Promise<boolean> {
    console.warn('[MessageDeletion] DEPRECATED: canRedact() called, use canOverwrite()');
    return await this.canOverwrite(messageId);
  }

  /**
   * Obtiene el tiempo restante para sobrescribir un mensaje (en segundos).
   */
  async getTimeRemainingForOverwrite(messageId: string): Promise<number | null> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, overwrittenAt: messages.overwrittenAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message || message.overwrittenAt) return null;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000);
    const remaining = deadline.getTime() - now.getTime();

    return remaining > 0 ? Math.floor(remaining / 1000) : null;
  }

  // Mantener método legacy por compatibilidad
  async getTimeRemainingForRedaction(messageId: string): Promise<number | null> {
    console.warn('[MessageDeletion] DEPRECATED: getTimeRemainingForRedaction() called, use getTimeRemainingForOverwrite()');
    return await this.getTimeRemainingForOverwrite(messageId);
  }

  /**
   * Dispatch unificado: delega a sobrescritura u ocultamiento según scope.
   * Mantiene compatibilidad con la interfaz anterior.
   */
  async deleteMessage(
    messageId: string,
    requesterAccountId: string,
    scope: DeletionScope = 'self',
    requesterActorId?: string,
  ): Promise<DeletionResult> {
    console.log(`[MessageDeletion] 🔍 DEBUG: deleteMessage llamado con scope=${scope}`);
    console.log(`[MessageDeletion] 📥 DEBUG: messageId=${messageId}, requesterAccountId=${requesterAccountId}`);
    
    if (scope === 'all') {
      // Usar nuevo método pero mantener interfaz legacy
      const result = await this.overwriteMessageForAll(messageId, requesterAccountId);
      return { ...result, scope };
    }

    // scope === 'self': necesitamos actorId
    if (!requesterActorId) {
      return { success: false, scope, reason: 'actorId required for scope "self"' };
    }

    const result = await this.hideMessageForActor(messageId, requesterActorId);
    return { ...result, scope };
  }

  // ─── UTILIDADES ────────────────────────────────────────────────

  /**
   * Genera hash SHA256 del contenido para referencia en certificación
   */
  private hashContent(content: any): string {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }
}

export const messageDeletionService = new MessageDeletionService();
