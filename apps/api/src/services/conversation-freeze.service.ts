// CONVERSATION FREEZE SERVICE - Congelación de Conversaciones v1.3
// Implementa las reglas de congelación según el diseño ChatCore v1.3

import { db, conversations, messages } from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';

export type FreezeReason = 'published' | 'legal_hold' | 'manual';
export type FreezeResult = {
  success: boolean;
  reason?: string;
  frozenAt?: Date;
};

class ConversationFreezeService {
  /**
   * Congela una conversación permanentemente
   * 
   * @param conversationId ID de la conversación a congelar
   * @param reason Razón de la congelación
   * @param accountId ID del account que congela
   */
  async freezeConversation(
    conversationId: string,
    reason: FreezeReason,
    accountId: string
  ): Promise<FreezeResult> {
    try {
      // 1. Obtener la conversación
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        return {
          success: false,
          reason: 'Conversation not found'
        };
      }

      // 2. Verificar si ya está congelada
      if (conversation.frozenAt) {
        return {
          success: false,
          reason: 'Conversation already frozen'
        };
      }

      // 3. Verificar permisos (solo participantes pueden congelar)
      const hasPermission = await this.canFreezeConversation(conversationId, accountId);
      if (!hasPermission) {
        return {
          success: false,
          reason: 'Only conversation participants can freeze conversations'
        };
      }

      // 4. Congelar la conversación
      const frozenAt = new Date();
      await db
        .update(conversations)
        .set({
          frozenAt,
          frozenReason: reason,
        })
        .where(eq(conversations.id, conversationId));

      return {
        success: true,
        reason,
        frozenAt
      };

    } catch (error) {
      console.error('[ConversationFreezeService] Error freezing conversation:', error);
      return {
        success: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Descongela una conversación (solo si no fue congelada por razones permanentes)
   * 
   * @param conversationId ID de la conversación a descongelar
   * @param accountId ID del account que descongela
   */
  async unfreezeConversation(
    conversationId: string,
    accountId: string
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      // 1. Obtener la conversación
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        return {
          success: false,
          reason: 'Conversation not found'
        };
      }

      // 2. Verificar si está congelada
      if (!conversation.frozenAt) {
        return {
          success: false,
          reason: 'Conversation is not frozen'
        };
      }

      // 3. Verificar si puede ser descongelada
      const canUnfreeze = this.canUnfreezeConversation(conversation, accountId);
      if (!canUnfreeze) {
        return {
          success: false,
          reason: 'Cannot unfreeze conversation frozen for: ' + conversation.frozenReason
        };
      }

      // 4. Descongelar
      await db
        .update(conversations)
        .set({
          frozenAt: null,
          frozenReason: null,
        })
        .where(eq(conversations.id, conversationId));

      return {
        success: true
      };

    } catch (error) {
      console.error('[ConversationFreezeService] Error unfreezing conversation:', error);
      return {
        success: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Verifica si una conversación está congelada
   */
  async isFrozen(conversationId: string): Promise<boolean> {
    const [conversation] = await db
      .select({ frozenAt: conversations.frozenAt })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    return conversation?.frozenAt !== null;
  }

  /**
   * Verifica si un usuario puede congelar una conversación
   */
  private async canFreezeConversation(
    conversationId: string,
    accountId: string
  ): Promise<boolean> {
    // Verificar si el usuario es participante de la conversación
    const { conversationParticipantService } = await import('./conversation-participant.service');
    const participants = await conversationParticipantService.getActiveParticipants(conversationId);
    
    return participants.some(p => p.accountId === accountId);
  }

  /**
   * Verifica si una conversación puede ser descongelada
   */
  private canUnfreezeConversation(
    conversation: any,
    accountId: string
  ): boolean {
    // Solo se puede descongelar si:
    // 1. Fue congelada manualmente
    // 2. El que la congeló está intentando descongelar
    return conversation.frozenReason === 'manual' && conversation.frozenBy === accountId;
  }

  /**
   * Obtiene información de congelación de una conversación
   */
  async getFreezeInfo(conversationId: string) {
    const [conversation] = await db
      .select({
        frozenAt: conversations.frozenAt,
        frozenReason: conversations.frozenReason,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    return conversation || null;
  }

  /**
   * Verifica si se pueden realizar mutaciones en una conversación
   */
  async canMutateConversation(conversationId: string): Promise<{
    canMutate: boolean;
    reason?: string;
  }> {
    const conversation = await this.getFreezeInfo(conversationId);
    
    if (!conversation) {
      return {
        canMutate: false,
        reason: 'Conversation not found'
      };
    }

    if (conversation.frozenAt) {
      return {
        canMutate: false,
        reason: `Conversation frozen for: ${conversation.frozenReason}`
      };
    }

    return {
      canMutate: true
    };
  }

  /**
   * Aplica guards de congelación a una operación
   * Lanza error si la conversación está congelada
   */
  async checkMutationAllowed(conversationId: string, operation: string): Promise<void> {
    const check = await this.canMutateConversation(conversationId);
    
    if (!check.canMutate) {
      throw new Error(`Cannot ${operation}: ${check.reason}`);
    }
  }

  /**
   * Obtiene todas las conversaciones congeladas
   */
  async getFrozenConversations() {
    return await db
      .select()
      .from(conversations)
      .where(isNull(conversations.frozenAt))
      .orderBy(conversations.frozenAt);
  }

  /**
   * Congela automáticamente conversaciones basadas en reglas de negocio
   */
  async autoFreezeConversation(
    conversationId: string,
    reason: FreezeReason,
    systemAccountId: string
  ): Promise<FreezeResult> {
    return this.freezeConversation(conversationId, reason, systemAccountId);
  }

  /**
   * Verifica si los mensajes en una conversación pueden ser editados
   * (considerando tanto la ventana de 15 minutos como la congelación)
   */
  async canEditMessagesInConversation(conversationId: string): Promise<{
    canEdit: boolean;
    reason?: string;
    conversationFrozen?: boolean;
    editWindowExpired?: boolean;
  }> {
    // Verificar si la conversación está congelada
    const isFrozen = await this.isFrozen(conversationId);
    
    if (isFrozen) {
      return {
        canEdit: false,
        reason: 'Conversation is frozen',
        conversationFrozen: true
      };
    }

    // Verificar si hay mensajes dentro de la ventana de edición
    const [recentMessage] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(1);

    if (!recentMessage) {
      return {
        canEdit: true
      };
    }

    const now = new Date();
    const editWindow = new Date(recentMessage.createdAt.getTime() + 15 * 60 * 1000); // +15 minutos
    const timeRemaining = editWindow.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      return {
        canEdit: false,
        reason: 'Edit window expired for all messages',
        editWindowExpired: true
      };
    }

    return {
      canEdit: true,
      timeRemaining: Math.floor(timeRemaining / 1000)
    };
  }

  /**
   * Obtiene el estado de congelación de una conversación para mostrar en la UI
   */
  async getConversationFreezeStatus(conversationId: string) {
    const conversation = await this.getFreezeInfo(conversationId);
    
    if (!conversation) {
      return {
        isFrozen: false,
        status: 'not_found'
      };
    }

    if (!conversation.frozenAt) {
      return {
        isFrozen: false,
        status: 'active'
      };
    }

    return {
      isFrozen: true,
      status: conversation.frozenReason || 'unknown',
      frozenAt: conversation.frozenAt,
      frozenReason: conversation.frozenReason
    };
  }
}

export const conversationFreezeService = new ConversationFreezeService();
