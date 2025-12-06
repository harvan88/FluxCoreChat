/**
 * AI Service - Integra la extensión @fluxcore/core-ai con el sistema
 * 
 * Gestiona:
 * - Generación de sugerencias de IA
 * - Cola de respuestas automáticas
 * - Eventos WebSocket para sugerencias
 */

import { db } from '@fluxcore/db';
import { messages, conversations, accounts, relationships } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import { 
  CoreAIExtension, 
  getCoreAI, 
  type AISuggestion, 
  type MessageEvent,
  type ContextData 
} from '../../../../extensions/core-ai/src';

export interface AIServiceConfig {
  defaultEnabled: boolean;
  defaultMode: 'suggest' | 'auto' | 'off';
  defaultResponseDelay: number;
}

class AIService {
  private extension: CoreAIExtension;
  private wsEmitter?: (event: string, data: any) => void;

  constructor() {
    this.extension = getCoreAI({
      enabled: true,
      mode: 'suggest',
      responseDelay: 30,
      model: 'llama-3.1-8b-instant',
      maxTokens: 256,
      temperature: 0.7,
      apiKey: process.env.GROQ_API_KEY,
    });

    // Registrar callback para sugerencias
    this.extension.onSuggestion((suggestion) => {
      this.emitSuggestion(suggestion);
    });
  }

  /**
   * Registrar emisor de WebSocket
   */
  setWebSocketEmitter(emitter: (event: string, data: any) => void): void {
    this.wsEmitter = emitter;
  }

  /**
   * Procesar un mensaje entrante y generar sugerencia si corresponde
   */
  async processMessage(
    messageId: string,
    conversationId: string,
    senderAccountId: string,
    recipientAccountId: string,
    content: string
  ): Promise<AISuggestion | null> {
    try {
      // Obtener configuración de la extensión para la cuenta receptora
      const config = await this.getAccountConfig(recipientAccountId);
      
      if (!config.enabled || config.mode === 'off') {
        return null;
      }

      // Construir contexto
      const context = await this.buildContext(recipientAccountId, conversationId);

      // Crear evento de mensaje
      const event: MessageEvent = {
        messageId,
        conversationId,
        senderAccountId,
        recipientAccountId,
        content,
        messageType: 'text',
        createdAt: new Date(),
      };

      // Actualizar configuración de la extensión
      this.extension.onConfigChange(recipientAccountId, {
        enabled: config.enabled,
        mode: config.mode,
        responseDelay: config.responseDelay,
        model: config.model || 'llama-3.1-8b-instant',
        maxTokens: config.maxTokens || 256,
        temperature: config.temperature || 0.7,
        apiKey: config.apiKey || process.env.GROQ_API_KEY,
      });

      // Generar sugerencia
      const suggestion = await this.extension.onMessage(event, context, recipientAccountId);

      if (suggestion) {
        this.emitSuggestion(suggestion);
      }

      return suggestion;
    } catch (error: any) {
      console.error('[ai-service] Error processing message:', error.message);
      return null;
    }
  }

  /**
   * Obtener configuración de IA para una cuenta
   */
  private async getAccountConfig(accountId: string): Promise<any> {
    // Por ahora devolvemos la configuración por defecto
    // En producción, esto vendría de extension_installations
    return {
      enabled: true,
      mode: 'suggest' as const,
      responseDelay: 30,
      model: 'llama-3.1-8b-instant',
      maxTokens: 256,
      temperature: 0.7,
      apiKey: process.env.GROQ_API_KEY,
    };
  }

  /**
   * Construir contexto completo para la IA
   */
  private async buildContext(accountId: string, conversationId: string): Promise<ContextData> {
    try {
      // Obtener cuenta
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      // Obtener conversación
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      // Obtener relación
      let relationship = null;
      let relContext: any[] = [];
      
      if (conversation?.relationshipId) {
        const [rel] = await db
          .select()
          .from(relationships)
          .where(eq(relationships.id, conversation.relationshipId))
          .limit(1);
        
        relationship = rel;

        // El contexto está en el campo context de la relación (JSONB)
        if (rel && (rel as any).context?.entries) {
          relContext = (rel as any).context.entries;
        }
      }

      // Obtener mensajes recientes
      const recentMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderAccountId: messages.senderAccountId,
          createdAt: messages.createdAt,
          type: messages.type,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(10);

      return {
        account: account ? {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          bio: (account as any).bio || undefined,
          publicContext: {},
          privateContext: {},
        } : undefined,
        relationship: relationship ? {
          id: relationship.id,
          context: relContext.map((c: any) => ({
            type: c.type || c.contextType,
            content: c.content,
            authorId: c.author_account_id || c.authorAccountId,
          })),
          status: (relationship as any).status || 'active',
        } : undefined,
        conversation: conversation ? {
          id: conversation.id,
          channel: conversation.channel,
          metadata: (conversation as any).metadata || {},
        } : undefined,
        messages: recentMessages.reverse().map(m => ({
          id: m.id,
          content: (m.content as any)?.text || String(m.content),
          senderAccountId: m.senderAccountId,
          createdAt: m.createdAt,
          messageType: m.type,
        })),
        overlays: {},
      };
    } catch (error: any) {
      console.error('[ai-service] Error building context:', error.message);
      return {
        messages: [],
      };
    }
  }

  /**
   * Emitir sugerencia por WebSocket
   */
  private emitSuggestion(suggestion: AISuggestion): void {
    if (this.wsEmitter) {
      this.wsEmitter('ai:suggestion', suggestion);
    }
    console.log(`[ai-service] Suggestion emitted: ${suggestion.id}`);
  }

  /**
   * Aprobar una sugerencia
   */
  approveSuggestion(suggestionId: string): AISuggestion | null {
    return this.extension.approveSuggestion(suggestionId);
  }

  /**
   * Rechazar una sugerencia
   */
  rejectSuggestion(suggestionId: string): AISuggestion | null {
    return this.extension.rejectSuggestion(suggestionId);
  }

  /**
   * Editar y aprobar una sugerencia
   */
  editSuggestion(suggestionId: string, newContent: string): AISuggestion | null {
    return this.extension.editSuggestion(suggestionId, newContent);
  }

  /**
   * Obtener sugerencia por ID
   */
  getSuggestion(suggestionId: string): AISuggestion | null {
    return this.extension.getSuggestion(suggestionId);
  }

  /**
   * Obtener sugerencias pendientes para una conversación
   */
  getPendingSuggestions(conversationId: string): AISuggestion[] {
    return this.extension.getPendingSuggestions(conversationId);
  }

  /**
   * Verificar si la API está configurada
   */
  isConfigured(): boolean {
    return this.extension.isApiConfigured();
  }

  /**
   * Probar conexión con la API
   */
  async testConnection(): Promise<boolean> {
    return this.extension.testApiConnection();
  }

  /**
   * Generar respuesta manualmente
   */
  async generateResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string
  ): Promise<AISuggestion | null> {
    const context = await this.buildContext(recipientAccountId, conversationId);
    
    const event: MessageEvent = {
      messageId: crypto.randomUUID(),
      conversationId,
      senderAccountId: 'manual',
      recipientAccountId,
      content: lastMessageContent,
      messageType: 'text',
      createdAt: new Date(),
    };

    return this.extension.generateSuggestion(event, context, recipientAccountId);
  }
}

// Singleton
export const aiService = new AIService();
export default aiService;
