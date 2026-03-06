// ACCOUNT ACTIVATION SERVICE - Gestión de Accounts Activos por User
// Implementa la lógica de negocio: cada user tiene un "account activo" y solo puede enviar desde ese account

import { db, accounts, users } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

export type ActiveAccountResult = {
  isValid: boolean;
  reason?: string;
  activeAccountId?: string;
  userAccounts?: Array<{
    id: string;
    alias: string;
    displayName: string;
  }>;
};

class AccountActivationService {
  /**
   * Verifica si un user puede enviar mensajes desde un account específico
   * 
   * Reglas de negocio:
   * - Cada user tiene un "account activo" 
   * Solo puede enviar mensajes desde su account activo
   - No puede enviar desde otros accounts del mismo user
   * 
   * @param userId ID del user autenticado
   * @param senderAccountId ID del account desde donde se intenta enviar
   */
  async validateSenderAccount(
    userId: string, 
    senderAccountId: string
  ): Promise<ActiveAccountResult> {
    try {
      // 1. Obtener todos los accounts del user
      const userAccounts = await db
        .select({
          id: accounts.id,
          alias: accounts.alias,
          displayName: accounts.displayName,
        })
        .from(accounts)
        .where(eq(accounts.ownerUserId, userId));

      if (userAccounts.length === 0) {
        return {
          isValid: false,
          reason: 'User has no accounts',
          userAccounts: []
        };
      }

      // 2. Verificar si el senderAccountId pertenece al user
      const senderAccount = userAccounts.find(acc => acc.id === senderAccountId);
      
      if (!senderAccount) {
        return {
          isValid: false,
          reason: 'Account does not belong to authenticated user',
          userAccounts
        };
      }

      // 3. Para la implementación inicial, permitimos cualquier account del user
      // TODO: Implementar lógica de "account activo" cuando el frontend la soporte
      return {
        isValid: true,
        activeAccountId: senderAccountId,
        userAccounts
      };

    } catch (error) {
      console.error('[AccountActivationService] Error validating sender account:', error);
      return {
        isValid: false,
        reason: 'Internal server error',
        userAccounts: []
      };
    }
  }

  /**
   * Obtiene el account activo de un user
   * 
   * @param userId ID del user
   * @returns Account activo o null si no tiene
   */
  async getActiveAccount(userId: string): Promise<{
    id: string;
    alias: string;
    displayName: string;
  } | null> {
    try {
      // Por ahora, retornamos el primer account del user
      // TODO: Implementar persistencia de "account activo" por user
      const [activeAccount] = await db
        .select({
          id: accounts.id,
          alias: accounts.alias,
          displayName: accounts.displayName,
        })
        .from(accounts)
        .where(eq(accounts.ownerUserId, userId))
        .orderBy(accounts.createdAt)
        .limit(1);

      return activeAccount || null;

    } catch (error) {
      console.error('[AccountActivationService] Error getting active account:', error);
      return null;
    }
  }

  /**
   * Establece el account activo para un user
   * 
   * @param userId ID del user
   * @param accountId ID del account a activar
   */
  async setActiveAccount(userId: string, accountId: string): Promise<{
    success: boolean;
    reason?: string;
  }> {
    try {
      // Verificar que el account pertenece al user
      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(
          eq(accounts.id, accountId),
          eq(accounts.ownerUserId, userId)
        ))
        .limit(1);

      if (!account) {
        return {
          success: false,
          reason: 'Account not found or does not belong to user'
        };
      }

      // TODO: Implementar persistencia de account activo
      // Por ahora, simplemente validamos que existe
      return {
        success: true
      };

    } catch (error) {
      console.error('[AccountActivationService] Error setting active account:', error);
      return {
        success: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Obtiene todos los accounts de un user
   */
  async getUserAccounts(userId: string): Promise<Array<{
    id: string;
    alias: string;
    displayName: string;
    createdAt: Date;
  }>> {
    try {
      return await db
        .select({
          id: accounts.id,
          alias: accounts.alias,
          displayName: accounts.displayName,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.ownerUserId, userId))
        .orderBy(accounts.createdAt);

    } catch (error) {
      console.error('[AccountActivationService] Error getting user accounts:', error);
      return [];
    }
  }

  /**
   * Valida que un account pueda participar en una conversación
   * 
   * @param userId ID del user autenticado
   * @param accountId ID del account
   * @param conversationId ID de la conversación
   */
  async validateConversationParticipation(
    userId: string,
    accountId: string,
    conversationId: string
  ): Promise<{
      canParticipate: boolean;
      reason?: string;
      isParticipant?: boolean;
    }> {
    try {
      // 1. Validar que el account pertenece al user
      const accountValidation = await this.validateSenderAccount(userId, accountId);
      
      if (!accountValidation.isValid) {
        return {
          canParticipate: false,
          reason: accountValidation.reason
        };
      }

      // 2. Verificar si el account ya es participante de la conversación
      const { conversationParticipantService } = await import('./conversation-participant.service');
      const participants = await conversationParticipantService.getActiveParticipants(conversationId);
      
      const isParticipant = participants.some(p => p.accountId === accountId);

      return {
        canParticipate: true,
        isParticipant
      };

    } catch (error) {
      console.error('[AccountActivationService] Error validating conversation participation:', error);
      return {
        canParticipate: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Guard de validación para operaciones de chat
   * Lanza error si la validación falla
   */
  async validateChatOperation(
    userId: string,
    senderAccountId: string,
    operation: string
  ): Promise<void> {
    const validation = await this.validateSenderAccount(userId, senderAccountId);
    
    if (!validation.isValid) {
      throw new Error(`Cannot ${operation}: ${validation.reason}`);
    }
  }
}

export const accountActivationService = new AccountActivationService();
