// MESSAGE DELETION SERVICE - Soft Delete con Scope v1.3
// Implementa las reglas de eliminación del diseño ChatCore v1.3

import { db, messages } from '@fluxcore/db';
import { eq, and, or, ne, isNull } from 'drizzle-orm';

export type DeletionScope = 'self' | 'all';
export type DeletionResult = {
  success: boolean;
  scope: DeletionScope;
  reason?: string;
  deletedAt?: Date;
};

class MessageDeletionService {
  /**
   * Elimina un mensaje con scope según las reglas v1.3
   * 
   * Reglas:
   * - "eliminar para todos" (scope: 'all'): permitido dentro de 60 minutos desde created_at
   * - "eliminar para mí" (scope: 'self'): permitido en cualquier momento
   * 
   * @param messageId ID del mensaje a eliminar
   * @param requesterAccountId ID del account que solicita la eliminación
   * @param scope 'self' o 'all'
   */
  async deleteMessage(
    messageId: string,
    requesterAccountId: string,
    scope: DeletionScope
  ): Promise<DeletionResult> {
    try {
      // 1. Obtener el mensaje
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return {
          success: false,
          scope,
          reason: 'Message not found'
        };
      }

      // 2. Verificar ownership
      if (message.senderAccountId !== requesterAccountId) {
        return {
          success: false,
          scope,
          reason: 'Only message sender can delete their own messages'
        };
      }

      // 3. Verificar si ya está eliminado
      if (message.deletedAt) {
        return {
          success: false,
          scope,
          reason: 'Message already deleted'
        };
      }

      // 4. Aplicar reglas de tiempo para "eliminar para todos"
      if (scope === 'all') {
        const now = new Date();
        const timeWindow = new Date(message.createdAt.getTime() + 60 * 60 * 1000); // +60 minutos
        
        if (now > timeWindow) {
          return {
            success: false,
            scope,
            reason: 'Cannot delete for all after 60 minutes window'
          };
        }
      }

      // 5. Ejecutar soft delete
      const deletedAt = new Date();
      await db
        .update(messages)
        .set({
          deletedAt,
          deletedBy: requesterAccountId,
          deletedScope: scope,
        })
        .where(eq(messages.id, messageId));

      return {
        success: true,
        scope,
        deletedAt
      };

    } catch (error) {
      console.error('[MessageDeletionService] Error deleting message:', error);
      return {
        success: false,
        scope,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Restaura un mensaje (solo para eliminación "self")
   */
  async restoreMessage(
    messageId: string,
    requesterAccountId: string
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return {
          success: false,
          reason: 'Message not found'
        };
      }

      // Solo el sender puede restaurar sus mensajes
      if (message.senderAccountId !== requesterAccountId) {
        return {
          success: false,
          reason: 'Only message sender can restore their own messages'
        };
      }

      // Solo se pueden restaurar eliminaciones "self"
      if (message.deletedScope !== 'self') {
        return {
          success: false,
          reason: 'Can only restore messages deleted with scope "self"'
        };
      }

      // Restaurar mensaje
      await db
        .update(messages)
        .set({
          deletedAt: null,
          deletedBy: null,
          deletedScope: null,
        })
        .where(eq(messages.id, messageId));

      return {
        success: true
      };

    } catch (error) {
      console.error('[MessageDeletionService] Error restoring message:', error);
      return {
        success: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Obtiene mensajes filtrando según el scope de eliminación
   */
  async getMessagesWithDeletionFilter(
    conversationId: string,
    viewerAccountId: string
  ) {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          // Filtro de eliminación:
          // - Si deleted_at es null: mostrar siempre
          // - Si deleted_scope es 'self': mostrar solo si no es el viewer
          // - Si deleted_scope es 'all': nunca mostrar (se filtra en la query)
          or(
            isNull(messages.deletedAt), // No eliminado
            and(
              eq(messages.deletedScope, 'self'), // Eliminado solo para mí
              ne(messages.senderAccountId, viewerAccountId) // No soy quien lo eliminó
            )
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  /**
   * Verifica si un mensaje puede ser eliminado con scope 'all'
   */
  async canDeleteForAll(messageId: string): Promise<boolean> {
    const [message] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) return false;

    const now = new Date();
    const timeWindow = new Date(message.createdAt.getTime() + 60 * 60 * 1000); // +60 minutos
    
    return now <= timeWindow;
  }

  /**
   * Obtiene el tiempo restante para eliminar un mensaje para todos
   */
  async getTimeRemainingForAll(messageId: string): Promise<number | null> {
    const [message] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) return null;

    const now = new Date();
    const deadline = new Date(message.createdAt.getTime() + 60 * 60 * 1000); // +60 minutos
    const remaining = deadline.getTime() - now.getTime();
    
    return remaining > 0 ? Math.floor(remaining / 1000) : null; // segundos restantes
  }
}

export const messageDeletionService = new MessageDeletionService();
