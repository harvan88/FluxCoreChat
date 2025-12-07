import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { extensionHost, type ProcessMessageResult } from '../services/extension-host.service';
import { automationController, type TriggerEvaluation } from '../services/automation-controller.service';
import type { MessageContent } from '@fluxcore/db';

export interface MessageEnvelope {
  id?: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  generatedBy?: 'human' | 'ai';
  timestamp?: Date;
  // Contexto adicional para extensiones
  targetAccountId?: string;  // La cuenta que recibe el mensaje (para extensiones)
}

export interface ReceiveResult {
  success: boolean;
  messageId?: string;
  error?: string;
  // Resultados del procesamiento de extensiones
  extensionResults?: ProcessMessageResult[];
  // COR-007: Información de automatización
  automation?: TriggerEvaluation;
}

/**
 * MessageCore - El corazón del sistema de mensajería
 * 
 * Responsabilidades:
 * 1. Recibir mensajes de cualquier fuente (adapter, UI)
 * 2. Persistir inmediatamente
 * 3. Notificar via WebSocket (delegado a NotificationService)
 * 4. Actualizar metadatos de conversación
 * 5. Actualizar última interacción en relationship
 * 6. DELEGAR a ExtensionHost para procesamiento de extensiones (COR-001)
 * 
 * NO hace:
 * - Lógica de IA (eso es de extensiones)
 * - Orquestación compleja (eso es de extensiones)
 * - Validación de permisos (eso es middleware)
 */
export class MessageCore {
  private notificationCallbacks: Map<string, (data: any) => void> = new Map();

  /**
   * Recibe y procesa un mensaje
   * COR-001: Ahora delega a ExtensionHost para que las extensiones procesen el mensaje
   */
  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    try {
      // 1. Persistir mensaje
      const message = await messageService.createMessage({
        conversationId: envelope.conversationId,
        senderAccountId: envelope.senderAccountId,
        content: envelope.content,
        type: envelope.type,
        generatedBy: envelope.generatedBy || 'human',
      });

      // 2. Actualizar conversación y obtener datos
      const conversation = await conversationService.getConversationById(envelope.conversationId);
      let extensionResults: ProcessMessageResult[] = [];
      let automationResult: TriggerEvaluation | undefined;

      if (conversation) {
        await conversationService.updateConversation(envelope.conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: envelope.content.text.substring(0, 500),
        });

        // 3. Actualizar última interacción en relationship
        await relationshipService.updateLastInteraction(conversation.relationshipId);

        // 4. Notificar via WebSocket
        this.broadcast(conversation.relationshipId, {
          event: 'message:new',
          data: {
            ...message,
            content: envelope.content,
          },
        });

        // 5. DELEGAR A EXTENSIONHOST (COR-001)
        // Determinar el accountId target para las extensiones
        const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);

        if (relationship) {
          // El targetAccountId es la cuenta que RECIBE el mensaje (no el sender)
          const targetAccountId = envelope.targetAccountId || 
            (envelope.senderAccountId === relationship.accountAId 
              ? relationship.accountBId 
              : relationship.accountAId);

          // COR-007: Evaluar automation_controller ANTES de procesar extensiones
          automationResult = await automationController.evaluateTrigger({
            accountId: targetAccountId,
            relationshipId: conversation.relationshipId,
            messageContent: envelope.content.text,
            messageType: envelope.type,
            senderId: envelope.senderAccountId,
          });

          // Solo procesar con extensiones si automation lo permite
          if (automationResult.shouldProcess) {
            // Procesar mensaje con extensiones del target
            extensionResults = await extensionHost.processMessage({
              accountId: targetAccountId,
              relationshipId: conversation.relationshipId,
              conversationId: envelope.conversationId,
              message: {
                id: message.id,
                content: envelope.content,
                type: envelope.type,
                senderAccountId: envelope.senderAccountId,
              },
              // COR-007: Pasar modo de automatización a extensiones
              automationMode: automationResult.mode,
            });

            // Notificar resultados de extensiones si hay acciones
            const hasActions = extensionResults.some(r => r.actions && r.actions.length > 0);
            if (hasActions) {
              this.broadcast(conversation.relationshipId, {
                event: 'extension:processed',
                data: {
                  messageId: message.id,
                  results: extensionResults,
                  automationMode: automationResult.mode,
                },
              });
            }
          } else {
            // Notificar que automation está deshabilitado
            console.log(`[MessageCore] Automation disabled for ${targetAccountId}: ${automationResult.reason}`);
          }
        }
      }

      return {
        success: true,
        messageId: message.id,
        extensionResults,
        automation: automationResult,
      };
    } catch (error: any) {
      console.error('MessageCore.receive error:', error);
      return {
        success: false,
        error: error.message || 'Failed to receive message',
      };
    }
  }

  /**
   * Envía un mensaje (alias de receive para consistencia de API)
   */
  async send(envelope: MessageEnvelope): Promise<ReceiveResult> {
    return this.receive(envelope);
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   */
  async getHistory(conversationId: string, limit = 50, offset = 0) {
    return await messageService.getMessagesByConversationId(conversationId, limit, offset);
  }

  /**
   * Registra un callback para notificaciones
   */
  subscribe(relationshipId: string, callback: (data: any) => void) {
    this.notificationCallbacks.set(relationshipId, callback);
  }

  /**
   * Desregistra un callback
   */
  unsubscribe(relationshipId: string) {
    this.notificationCallbacks.delete(relationshipId);
  }

  /**
   * Broadcast a todos los subscriptores de una relación
   */
  private broadcast(relationshipId: string, data: any) {
    const callback = this.notificationCallbacks.get(relationshipId);
    if (callback) {
      callback(data);
    }
  }
}

export const messageCore = new MessageCore();
