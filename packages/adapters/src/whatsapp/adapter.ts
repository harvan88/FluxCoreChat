/**
 * WhatsApp Adapter
 * 
 * Implementa IChannelAdapter para el canal WhatsApp Business
 */

import type { 
  IChannelAdapter, 
  NormalizedMessage, 
  OutgoingMessage, 
  SendResult, 
  AdapterStatus,
  MessageContent 
} from '../types';
import { WhatsAppClient, type WhatsAppConfig } from './client';

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string; caption?: string };
          video?: { id: string; mime_type: string; caption?: string };
          audio?: { id: string; mime_type: string };
          document?: { id: string; mime_type: string; filename: string; caption?: string };
          location?: { latitude: number; longitude: number; name?: string; address?: string };
          contacts?: any[];
          context?: { from: string; id: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppAdapter implements IChannelAdapter {
  readonly channel = 'whatsapp';
  readonly name = 'WhatsApp Business';

  private client: WhatsAppClient;
  private connected: boolean = false;
  private lastActivity?: Date;
  private metrics = {
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  };
  private businessPhoneId: string;

  constructor(config: WhatsAppConfig) {
    this.client = new WhatsAppClient(config);
    this.businessPhoneId = config.phoneNumberId;
  }

  /**
   * Inicializar adapter
   */
  async initialize(): Promise<void> {
    // Verificar conexión con la API
    try {
      // En producción, haríamos una llamada de prueba a la API
      this.connected = true;
      console.log(`[whatsapp-adapter] Initialized for phone ${this.businessPhoneId}`);
    } catch (error: any) {
      this.connected = false;
      throw new Error(`Failed to initialize WhatsApp adapter: ${error.message}`);
    }
  }

  /**
   * Apagar adapter
   */
  async shutdown(): Promise<void> {
    this.connected = false;
    console.log('[whatsapp-adapter] Shutdown');
  }

  /**
   * Enviar mensaje
   */
  async send(message: OutgoingMessage): Promise<SendResult> {
    try {
      let response;

      switch (message.content.type) {
        case 'text':
          response = await this.client.sendText(
            message.to, 
            message.content.text || '', 
            message.replyTo
          );
          break;

        case 'image':
          response = await this.client.sendImage(
            message.to,
            message.content.media?.url || '',
            message.content.media?.caption
          );
          break;

        case 'document':
          response = await this.client.sendDocument(
            message.to,
            message.content.media?.url || '',
            message.content.media?.filename || 'document',
            message.content.media?.caption
          );
          break;

        case 'location':
          response = await this.client.sendLocation(
            message.to,
            message.content.location?.latitude || 0,
            message.content.location?.longitude || 0,
            message.content.location?.name,
            message.content.location?.address
          );
          break;

        case 'template':
          response = await this.client.sendTemplate(
            message.to,
            message.content.template?.name || '',
            message.content.template?.language || 'es',
            message.content.template?.components
          );
          break;

        default:
          // Default to text
          response = await this.client.sendText(
            message.to,
            message.content.text || JSON.stringify(message.content)
          );
      }

      this.metrics.messagesSent++;
      this.lastActivity = new Date();

      return {
        success: true,
        messageId: crypto.randomUUID(),
        externalId: response.messages[0].id,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.metrics.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Procesar webhook
   */
  async handleWebhook(payload: WhatsAppWebhookPayload): Promise<NormalizedMessage | null> {
    try {
      if (payload.object !== 'whatsapp_business_account') {
        return null;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;

          const value = change.value;

          // Procesar mensajes entrantes
          if (value.messages && value.messages.length > 0) {
            const msg = value.messages[0];
            const contact = value.contacts?.[0];

            const normalized = this.normalizeIncomingMessage(msg, contact, value.metadata);
            
            if (normalized) {
              this.metrics.messagesReceived++;
              this.lastActivity = new Date();
              return normalized;
            }
          }

          // Procesar actualizaciones de estado
          if (value.statuses && value.statuses.length > 0) {
            // Por ahora solo logueamos los estados
            const status = value.statuses[0];
            console.log(`[whatsapp-adapter] Message ${status.id} status: ${status.status}`);
          }
        }
      }

      return null;
    } catch (error: any) {
      this.metrics.errors++;
      console.error('[whatsapp-adapter] Webhook error:', error.message);
      return null;
    }
  }

  /**
   * Verificar webhook
   */
  verifyWebhook(query: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string }): boolean {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode && token && challenge) {
      const result = this.client.verifyWebhook(mode, token, challenge);
      return result !== null;
    }

    return false;
  }

  /**
   * Obtener challenge para verificación
   */
  getVerificationChallenge(query: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string }): string | null {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode && token && challenge) {
      return this.client.verifyWebhook(mode, token, challenge);
    }

    return null;
  }

  /**
   * Estado de conexión
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Obtener estado
   */
  getStatus(): AdapterStatus {
    return {
      connected: this.connected,
      channel: this.channel,
      lastActivity: this.lastActivity,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Normalizar mensaje entrante
   */
  private normalizeIncomingMessage(
    msg: any, 
    contact: any,
    metadata: any
  ): NormalizedMessage {
    const content = this.extractContent(msg);

    return {
      id: crypto.randomUUID(),
      externalId: msg.id,
      channel: 'whatsapp',
      direction: 'incoming',
      from: {
        id: msg.from,
        name: contact?.profile?.name,
        phone: msg.from,
      },
      to: {
        id: metadata.phone_number_id,
        phone: metadata.display_phone_number,
      },
      content,
      timestamp: new Date(parseInt(msg.timestamp) * 1000),
      status: 'delivered',
      metadata: {
        contextMessageId: msg.context?.id,
        contextFrom: msg.context?.from,
      },
    };
  }

  /**
   * Extraer contenido del mensaje
   */
  private extractContent(msg: any): MessageContent {
    switch (msg.type) {
      case 'text':
        return {
          type: 'text',
          text: msg.text?.body,
        };

      case 'image':
        return {
          type: 'image',
          media: {
            url: '', // Se obtiene con otra llamada a la API
            mimeType: msg.image?.mime_type,
            caption: msg.image?.caption,
          },
        };

      case 'video':
        return {
          type: 'video',
          media: {
            url: '',
            mimeType: msg.video?.mime_type,
            caption: msg.video?.caption,
          },
        };

      case 'audio':
        return {
          type: 'audio',
          media: {
            url: '',
            mimeType: msg.audio?.mime_type,
          },
        };

      case 'document':
        return {
          type: 'document',
          media: {
            url: '',
            mimeType: msg.document?.mime_type,
            filename: msg.document?.filename,
            caption: msg.document?.caption,
          },
        };

      case 'location':
        return {
          type: 'location',
          location: {
            latitude: msg.location?.latitude,
            longitude: msg.location?.longitude,
            name: msg.location?.name,
            address: msg.location?.address,
          },
        };

      default:
        return {
          type: 'text',
          text: `[${msg.type} message]`,
        };
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string): Promise<boolean> {
    return this.client.markAsRead(messageId);
  }
}

export default WhatsAppAdapter;
