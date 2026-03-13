// MESSAGE VERSIONING SERVICE - Versionamiento de Mensajes v1.3
// Implementa las reglas de edición con ventana de 15 minutos

import { db, messages } from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';

export type VersioningResult = {
  success: boolean;
  version?: number;
  originalId?: string;
  reason?: string;
  canEdit?: boolean;
  timeRemaining?: number; // segundos restantes
};

class MessageVersionService {
  /**
   * Crea una nueva versión de un mensaje editado
   * 
   * Reglas:
   * - Permitido dentro de 15 minutos desde created_at
   * - Crea nueva versión con is_current = true
   * - Marca versión anterior como is_current = false
   * - Mantiene parent_id = null (para replies)
   * - Establece original_id en primera versión
   * 
   * @param messageId ID del mensaje a editar
   * @param newContent Nuevo contenido del mensaje
   * @param editorAccountId ID del account que edita
   */
  async createVersion(
    messageId: string,
    newContent: any,
    editorAccountId: string
  ): Promise<VersioningResult> {
    try {
      // 1. Obtener el mensaje actual
      const [currentMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!currentMessage) {
        return {
          success: false,
          reason: 'Message not found'
        };
      }

      // 2. Verificar ownership (solo el sender puede editar)
      if (currentMessage.senderAccountId !== editorAccountId) {
        return {
          success: false,
          reason: 'Only message sender can edit their own messages'
        };
      }

      // 3. Verificar si ya está redactado
      if (currentMessage.redactedAt) {
        return {
          success: false,
          reason: 'Cannot edit redacted message'
        };
      }

      // 4. Verificar ventana de tiempo de 15 minutos
      const now = new Date();
      const editWindow = new Date(currentMessage.createdAt.getTime() + 15 * 60 * 1000); // +15 minutos
      
      if (now > editWindow) {
        return {
          success: false,
          reason: 'Cannot edit message after 15 minutes window'
        };
      }

      // 5. Verificar si el contenido realmente cambió
      if (JSON.stringify(currentMessage.content) === JSON.stringify(newContent)) {
        return {
          success: false,
          reason: 'Content is identical to current version'
        };
      }

      // 6. Iniciar transacción para crear nueva versión
      const newVersion = (currentMessage.version || 1) + 1;
      const originalId = currentMessage.originalId || currentMessage.id;

      // 7. Marcar versión actual como no actual
      await db
        .update(messages)
        .set({ isCurrent: false })
        .where(and(
          eq(messages.id, messageId),
          eq(messages.isCurrent, true)
        ));

      // 8. Crear nueva versión
      const [newVersionMessage] = await db
        .insert(messages)
        .values({
          conversationId: currentMessage.conversationId,
          senderAccountId: currentMessage.senderAccountId,
          content: newContent,
          type: currentMessage.type,
          generatedBy: currentMessage.generatedBy,
          eventType: 'edit', // Marcar como edición
          parentId: currentMessage.parentId, // Mantener parent_id para replies
          originalId: originalId,
          version: newVersion,
          isCurrent: true,
          metadata: currentMessage.metadata,
        })
        .returning();

      return {
        success: true,
        version: newVersion,
        originalId: originalId
      };

    } catch (error) {
      console.error('[MessageVersionService] Error creating version:', error);
      return {
        success: false,
        reason: 'Internal server error'
      };
    }
  }

  /**
   * Obtiene el historial de versiones de un mensaje
   */
  async getVersionHistory(messageId: string) {
    // Obtener el mensaje actual para encontrar el original_id
    const [currentMessage] = await db
      .select({ originalId: messages.originalId })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!currentMessage) {
      return [];
    }

    const originalId = currentMessage.originalId || messageId;

    // Obtener todas las versiones del mensaje
    return await db
      .select()
      .from(messages)
      .where(eq(messages.originalId, originalId))
      .orderBy(messages.version);
  }

  /**
   * Obtiene la versión actual de un mensaje
   */
  async getCurrentVersion(originalId: string) {
    const [currentVersion] = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.originalId, originalId),
        eq(messages.isCurrent, true)
      ))
      .limit(1);

    return currentVersion || null;
  }

  /**
   * Verifica si un mensaje puede ser editado
   */
  async canEdit(messageId: string): Promise<{ canEdit: boolean; timeRemaining?: number; reason?: string }> {
    const [message] = await db
      .select({ createdAt: messages.createdAt, redactedAt: messages.redactedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return {
        canEdit: false,
        reason: 'Message not found'
      };
    }

    // No se pueden editar mensajes redactados
    if (message.redactedAt) {
      return {
        canEdit: false,
        reason: 'Cannot edit redacted message'
      };
    }

    const now = new Date();
    const editWindow = new Date(message.createdAt.getTime() + 15 * 60 * 1000); // +15 minutos
    const timeRemaining = editWindow.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      return {
        canEdit: false,
        reason: 'Edit window expired (15 minutes)'
      };
    }

    return {
      canEdit: true,
      timeRemaining: Math.floor(timeRemaining / 1000) // segundos restantes
    };
  }

  /**
   * Obtiene todas las versiones de un mensaje para la conversación
   * (solo las versiones actuales, no el historial completo)
   */
  async getCurrentMessagesForConversation(conversationId: string) {
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.isCurrent, true),
        isNull(messages.redactedAt) // No mostrar redactados
      ))
      .orderBy(messages.createdAt);
  }

  /**
   * Obtiene el contenido original de un mensaje (primera versión)
   */
  async getOriginalContent(messageId: string) {
    // Obtener el mensaje actual para encontrar el original_id
    const [currentMessage] = await db
      .select({ originalId: messages.originalId })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!currentMessage) {
      return null;
    }

    const originalId = currentMessage.originalId || messageId;

    // Obtener la primera versión (version = 1)
    const [originalVersion] = await db
      .select({ content: messages.content })
      .from(messages)
      .where(and(
        eq(messages.originalId, originalId),
        eq(messages.version, 1)
      ))
      .limit(1);

    return originalVersion?.content || null;
  }

  /**
   * Revierte un mensaje a una versión anterior
   */
  async revertToVersion(
    messageId: string,
    targetVersion: number,
    editorAccountId: string
  ): Promise<VersioningResult> {
    try {
      // 1. Obtener el mensaje actual
      const [currentMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!currentMessage) {
        return {
          success: false,
          reason: 'Message not found'
        };
      }

      // 2. Verificar ownership
      if (currentMessage.senderAccountId !== editorAccountId) {
        return {
          success: false,
          reason: 'Only message sender can revert their own messages'
        };
      }

      // 3. Obtener la versión objetivo
      const originalId = currentMessage.originalId || currentMessage.id;
      const [targetVersionMessage] = await db
        .select()
        .from(messages)
        .where(and(
          eq(messages.originalId, originalId),
          eq(messages.version, targetVersion)
        ))
        .limit(1);

      if (!targetVersionMessage) {
        return {
          success: false,
          reason: `Version ${targetVersion} not found`
        };
      }

      // 4. Verificar ventana de tiempo
      const editCheck = await this.canEdit(messageId);
      if (!editCheck.canEdit) {
        return {
          success: false,
          reason: editCheck.reason
        };
      }

      // 5. Marcar versión actual como no actual
      await db
        .update(messages)
        .set({ isCurrent: false })
        .where(and(
          eq(messages.id, messageId),
          eq(messages.isCurrent, true)
        ));

      // 6. Crear nueva versión con contenido revertido
      const newVersionNumber = (currentMessage.version || 1) + 1;
      const revertedMessage = await db
        .insert(messages)
        .values({
          conversationId: currentMessage.conversationId,
          senderAccountId: currentMessage.senderAccountId,
          content: targetVersionMessage.content,
          type: currentMessage.type,
          generatedBy: currentMessage.generatedBy,
          eventType: 'edit',
          parentId: currentMessage.parentId,
          originalId: originalId,
          version: newVersionNumber,
          isCurrent: true,
          metadata: {
            ...currentMessage.metadata,
            revertedFrom: targetVersion,
            revertedAt: new Date().toISOString()
          }
        })
        .returning();

      return {
        success: true,
        version: newVersionNumber,
        originalId: originalId
      };

    } catch (error) {
      console.error('[MessageVersionService] Error reverting version:', error);
      return {
        success: false,
        reason: 'Internal server error'
      };
    }
  }
}

export const messageVersionService = new MessageVersionService();
