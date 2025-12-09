/**
 * WhatsApp Cloud API Client
 * 
 * Cliente para la API de WhatsApp Business Cloud (Meta)
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface WhatsAppConfig {
  phoneNumberId: string;       // ID del número de teléfono de WhatsApp Business
  accessToken: string;         // Token de acceso de Meta
  apiVersion?: string;         // Versión de la API (default: v22.0)
  webhookVerifyToken?: string; // Token para verificar webhook
}

export interface WhatsAppMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'location' | 'contacts';
  text?: { body: string; preview_url?: boolean };
  image?: { link?: string; id?: string; caption?: string };
  video?: { link?: string; id?: string; caption?: string };
  audio?: { link?: string; id?: string };
  document?: { link?: string; id?: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  template?: { name: string; language: { code: string }; components?: any[] };
  contacts?: any[];
  context?: { message_id: string };
}

export interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppClient {
  private config: Required<WhatsAppConfig>;
  private baseUrl: string;

  constructor(config: WhatsAppConfig) {
    this.config = {
      apiVersion: 'v22.0',
      webhookVerifyToken: '',
      ...config,
    };
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}`;
  }

  /**
   * Enviar mensaje de texto
   */
  async sendText(to: string, text: string, replyTo?: string): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'text',
      text: { body: text, preview_url: true },
    };

    if (replyTo) {
      payload.context = { message_id: replyTo };
    }

    return this.sendMessage(payload);
  }

  /**
   * Enviar imagen
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'image',
      image: { link: imageUrl, caption },
    };

    return this.sendMessage(payload);
  }

  /**
   * Enviar documento
   */
  async sendDocument(to: string, documentUrl: string, filename: string, caption?: string): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'document',
      document: { link: documentUrl, filename, caption },
    };

    return this.sendMessage(payload);
  }

  /**
   * Enviar ubicación
   */
  async sendLocation(to: string, lat: number, lng: number, name?: string, address?: string): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'location',
      location: { latitude: lat, longitude: lng, name, address },
    };

    return this.sendMessage(payload);
  }

  /**
   * Enviar template
   */
  async sendTemplate(to: string, templateName: string, languageCode: string, components?: any[]): Promise<WhatsAppAPIResponse> {
    const payload: WhatsAppMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Marcar mensaje como leído
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Enviar mensaje genérico
   */
  private async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppAPIResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`WhatsApp API Error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Normalizar número de teléfono
   */
  private normalizePhone(phone: string): string {
    // Remover espacios, guiones y el símbolo +
    return phone.replace(/[\s\-+]/g, '');
  }

  /**
   * Verificar webhook de Meta
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Obtener configuración
   */
  getConfig(): Readonly<WhatsAppConfig> {
    return { ...this.config };
  }
}

export default WhatsAppClient;
