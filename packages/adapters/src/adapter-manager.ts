/**
 * Adapter Manager
 * 
 * Gestiona múltiples adaptadores de canales de comunicación
 */

import type { 
  IChannelAdapter, 
  NormalizedMessage, 
  OutgoingMessage, 
  SendResult, 
  AdapterStatus
} from './types';
import { WhatsAppAdapter } from './whatsapp';
import type { WhatsAppConfig } from './whatsapp';

export interface AdapterManagerConfig {
  whatsapp?: WhatsAppConfig & { enabled?: boolean };
  // Futuros adaptadores
  // telegram?: TelegramConfig & { enabled?: boolean };
  // instagram?: InstagramConfig & { enabled?: boolean };
}

type MessageHandler = (message: NormalizedMessage, channel: string) => Promise<void>;

export class AdapterManager {
  private adapters: Map<string, IChannelAdapter> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private initialized: boolean = false;

  constructor(private config: AdapterManagerConfig = {}) {}

  /**
   * Inicializar todos los adaptadores configurados
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Inicializar WhatsApp si está configurado
    if (this.config.whatsapp?.enabled !== false && this.config.whatsapp?.phoneNumberId) {
      try {
        const waAdapter = new WhatsAppAdapter(this.config.whatsapp);
        await waAdapter.initialize();
        this.adapters.set('whatsapp', waAdapter);
        console.log('[adapter-manager] WhatsApp adapter initialized');
      } catch (error: any) {
        console.error('[adapter-manager] Failed to initialize WhatsApp:', error.message);
      }
    }

    // Futuros adaptadores...

    this.initialized = true;
    console.log(`[adapter-manager] Initialized with ${this.adapters.size} adapter(s)`);
  }

  /**
   * Apagar todos los adaptadores
   */
  async shutdown(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.shutdown();
        console.log(`[adapter-manager] ${name} adapter shutdown`);
      } catch (error: any) {
        console.error(`[adapter-manager] Failed to shutdown ${name}:`, error.message);
      }
    }
    this.adapters.clear();
    this.initialized = false;
  }

  /**
   * Obtener un adaptador específico
   */
  getAdapter(channel: string): IChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  /**
   * Obtener todos los adaptadores
   */
  getAllAdapters(): Map<string, IChannelAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Enviar mensaje por un canal específico
   */
  async send(channel: string, message: OutgoingMessage): Promise<SendResult> {
    const adapter = this.adapters.get(channel);
    
    if (!adapter) {
      return {
        success: false,
        error: `Adapter not found for channel: ${channel}`,
      };
    }

    if (!adapter.isConnected()) {
      return {
        success: false,
        error: `Adapter ${channel} is not connected`,
      };
    }

    return adapter.send(message);
  }

  /**
   * Procesar webhook de un canal
   */
  async handleWebhook(channel: string, payload: any): Promise<NormalizedMessage | null> {
    const adapter = this.adapters.get(channel);
    
    if (!adapter) {
      console.warn(`[adapter-manager] No adapter for channel: ${channel}`);
      return null;
    }

    const message = await adapter.handleWebhook(payload);

    if (message) {
      // Notificar a los handlers
      for (const handler of this.messageHandlers) {
        try {
          await handler(message, channel);
        } catch (error: any) {
          console.error('[adapter-manager] Message handler error:', error.message);
        }
      }
    }

    return message;
  }

  /**
   * Verificar webhook
   */
  verifyWebhook(channel: string, payload: any, signature?: string): boolean {
    const adapter = this.adapters.get(channel);
    return adapter?.verifyWebhook(payload, signature) ?? false;
  }

  /**
   * Registrar handler de mensajes
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Obtener estado de todos los adaptadores
   */
  getStatus(): Record<string, AdapterStatus> {
    const status: Record<string, AdapterStatus> = {};
    
    for (const [name, adapter] of this.adapters) {
      status[name] = adapter.getStatus();
    }
    
    return status;
  }

  /**
   * Verificar si un canal está disponible
   */
  hasChannel(channel: string): boolean {
    return this.adapters.has(channel);
  }

  /**
   * Obtener canales disponibles
   */
  getAvailableChannels(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Singleton instance
let managerInstance: AdapterManager | null = null;

export function getAdapterManager(config?: AdapterManagerConfig): AdapterManager {
  if (!managerInstance) {
    managerInstance = new AdapterManager(config);
  }
  return managerInstance;
}

export function resetAdapterManager(): void {
  if (managerInstance) {
    managerInstance.shutdown();
    managerInstance = null;
  }
}

export default AdapterManager;
