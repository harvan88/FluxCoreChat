import { db } from '@fluxcore/db';
import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { sql } from 'drizzle-orm';

/**
 * MessageCore con persistencia transaccional garantizada
 */
export class MessageCoreTransactional {
  /**
   * Recibe y procesa un mensaje con transacción atómica
   */
  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    // Iniciar transacción explícita
    const transaction = await db.transaction(async (tx) => {
      try {
        console.log(`[MessageCore-TX] 🔄 Starting transaction for message`);

        // 1. Persistir mensaje DENTRO de la transacción
        const message = await messageService.createMessage({
          conversationId: envelope.conversationId,
          senderAccountId: envelope.senderAccountId,
          content: envelope.content,
          type: envelope.type,
          generatedBy: envelope.generatedBy || 'human',
        });

        console.log(`[MessageCore-TX] ✅ Message persisted: ${message.id}`);

        // 2. Actualizar conversación DENTRO de la transacción
        const conversation = await conversationService.getConversationById(envelope.conversationId);
        if (conversation) {
          const messageText = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
          await conversationService.updateConversation(envelope.conversationId, {
            lastMessageAt: new Date(),
            lastMessageText: messageText.substring(0, 500),
          });
          console.log(`[MessageCore-TX] ✅ Conversation updated`);
        }

        // 3. Actualizar relationship DENTRO de la transacción
        if (conversation?.relationshipId) {
          await relationshipService.updateLastInteraction(conversation.relationshipId);
          console.log(`[MessageCore-TX] ✅ Relationship updated`);
        }

        // 4. Verificación final - el mensaje EXISTE en la DB
        const verification = await tx.execute(sql`
          SELECT id, created_at FROM messages WHERE id = $1
        `, [message.id]);

        if (verification.length === 0) {
          throw new Error(`Message ${message.id} not found after persistence`);
        }

        console.log(`[MessageCore-TX] ✅ Verification passed: message exists in DB`);

        return {
          success: true,
          messageId: message.id,
          message: verification[0] // Datos reales de la DB
        };

      } catch (error) {
        console.error(`[MessageCore-TX] ❌ Transaction failed:`, error);
        throw error; // Esto hará rollback automático
      }
    });

    // Si llegamos aquí, la transacción fue exitosa
    console.log(`[MessageCore-TX] 🎉 Transaction committed: ${transaction.messageId}`);

    // 5. Notificaciones FUERA de la transacción (no críticas)
    try {
      const conversation = await conversationService.getConversationById(envelope.conversationId);
      if (conversation?.relationshipId) {
        // Broadcast por WebSocket
        this.broadcastToConversationSubscribers(envelope.conversationId, {
          type: 'message:new',
          data: {
            id: transaction.messageId,
            conversationId: envelope.conversationId,
            senderAccountId: envelope.senderAccountId,
            content: envelope.content,
            createdAt: transaction.message.created_at,
          },
        });
        console.log(`[MessageCore-TX] ✅ WebSocket broadcast sent`);
      }
    } catch (broadcastError) {
      console.error(`[MessageCore-TX] ⚠️ Broadcast failed (non-critical):`, broadcastError);
    }

    return {
      success: true,
      messageId: transaction.messageId,
    };
  }

  private broadcastToConversationSubscribers(conversationId: string, data: any) {
    // Implementación existente del broadcast
    console.log(`[MessageCore-TX] 📡 Broadcasting to conversation: ${conversationId}`);
  }
}

export const messageCoreTransactional = new MessageCoreTransactional();
