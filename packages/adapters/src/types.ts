/**
 * Adapter Types - Interfaces base para adaptadores de canales
 */

/**
 * Mensaje normalizado de FluxCore
 */
export interface NormalizedMessage {
  id: string;
  externalId: string;          // ID del mensaje en el canal externo
  channel: 'whatsapp' | 'telegram' | 'web' | 'instagram';
  direction: 'incoming' | 'outgoing';

  // Participantes
  from: {
    id: string;                // ID externo del remitente
    name?: string;
    phone?: string;
  };
  to: {
    id: string;                // ID externo del destinatario
    name?: string;
    phone?: string;
  };

  // Contenido
  content: MessageContent;

  // Metadata
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

export interface MessageContent {
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'template';
  text?: string;
  // TODO(assets): Cuando exista la capa de ingestión de medios externos, este campo
  // debe ser assetId y la URL debe obtenerse vía firma del sistema de assets.
  media?: {
    url: string;
    mimeType?: string;
    filename?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contact?: {
    name: string;
    phones: string[];
  };
  template?: {
    name: string;
    language: string;
    components?: any[];
  };
}

/**
 * Evento de cambio de estado (Read/Delivered)
 */
export interface NormalizedStatusEvent {
  channel: 'whatsapp' | 'telegram' | 'web' | 'instagram';
  messageId: string;           // ID externo del mensaje afectado
  externalId: string;          // ID del evento en sí (si existe)
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  recipientId?: string;        // Quién leyó/recibió
  failureReason?: string;
  raw: any;                    // Payload original para evidencia
}

/**
 * Interface base para listeners
 */
export type MessageHandler = (message: NormalizedMessage, channel: string) => Promise<void>;
export type StatusHandler = (event: NormalizedStatusEvent, channel: string) => Promise<void>;
export interface OutgoingMessage {
  to: string;                  // Número o ID del destinatario
  content: MessageContent;
  replyTo?: string;            // ID del mensaje a responder
}

/**
 * Resultado de envío
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
  timestamp?: Date;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  type: 'message' | 'status' | 'error';
  channel: string;
  timestamp: Date;
  payload: any;
}

/**
 * Interfaz base para adaptadores
 */
export interface IChannelAdapter {
  readonly channel: string;
  readonly name: string;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Mensajes
  send(message: OutgoingMessage): Promise<SendResult>;

  // Webhook
  handleWebhook(payload: any): Promise<NormalizedMessage | null>;
  verifyWebhook(payload: any, signature?: string): boolean;

  // Status
  isConnected(): boolean;
  getStatus(): AdapterStatus;
}

/**
 * Estado del adapter
 */
export interface AdapterStatus {
  connected: boolean;
  channel: string;
  lastActivity?: Date;
  metrics: {
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  };
}

/**
 * Configuración de adapter
 */
export interface AdapterConfig {
  channel: string;
  enabled: boolean;
  credentials: Record<string, string>;
  webhookUrl?: string;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}
