/**
 * @fluxcore/core-ai - Extensión de IA por defecto
 * 
 * Proporciona respuestas inteligentes basadas en el contexto de la relación
 * con tres modos de operación: suggest, auto y off.
 */

import { PromptBuilder, type ContextData, type BuiltPrompt } from './prompt-builder';
import { GroqClient } from './groq-client';

export interface CoreAIConfig {
  enabled: boolean;
  mode: 'suggest' | 'auto' | 'off';
  responseDelay: number;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey?: string;
}

export interface AISuggestion {
  id: string;
  conversationId: string;
  content: string;
  generatedAt: Date;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'edited';
}

export interface MessageEvent {
  messageId: string;
  conversationId: string;
  senderAccountId: string;
  recipientAccountId: string;
  content: string;
  messageType: string;
  createdAt: Date;
}

// Cola de respuestas pendientes
const responseQueue: Map<string, NodeJS.Timeout> = new Map();

// Sugerencias generadas
const suggestions: Map<string, AISuggestion> = new Map();

export class CoreAIExtension {
  private config: CoreAIConfig;
  private promptBuilder: PromptBuilder;
  private groqClient: GroqClient;
  private onSuggestionCallback?: (suggestion: AISuggestion) => void;

  constructor(config: Partial<CoreAIConfig> = {}) {
    this.config = {
      enabled: true,
      mode: 'suggest',
      responseDelay: 30,
      model: 'llama-3.1-8b-instant',
      maxTokens: 256,
      temperature: 0.7,
      ...config,
    };

    this.promptBuilder = new PromptBuilder({
      mode: this.config.mode,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      model: this.config.model,
    });

    this.groqClient = new GroqClient(this.config.apiKey);
  }

  /**
   * Hook: Cuando se instala la extensión
   */
  async onInstall(accountId: string): Promise<void> {
    console.log(`[core-ai] Installed for account ${accountId}`);
  }

  /**
   * Hook: Cuando se desinstala la extensión
   */
  async onUninstall(accountId: string): Promise<void> {
    console.log(`[core-ai] Uninstalled from account ${accountId}`);
    // Cancelar respuestas pendientes
    this.cancelPendingResponses(accountId);
  }

  /**
   * Hook: Cuando cambia la configuración
   */
  async onConfigChange(accountId: string, newConfig: Partial<CoreAIConfig>): Promise<void> {
    console.log(`[core-ai] Config changed for account ${accountId}`, newConfig);
    
    Object.assign(this.config, newConfig);
    
    this.promptBuilder.updateConfig({
      mode: this.config.mode,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      model: this.config.model,
    });

    if (newConfig.apiKey) {
      this.groqClient.setApiKey(newConfig.apiKey);
    }
  }

  /**
   * Hook: Cuando se recibe un mensaje
   */
  async onMessage(
    event: MessageEvent,
    context: ContextData,
    recipientAccountId: string
  ): Promise<AISuggestion | null> {
    // Verificar si está habilitado
    if (!this.config.enabled || this.config.mode === 'off') {
      return null;
    }

    // Solo procesar mensajes de texto
    if (event.messageType !== 'text') {
      return null;
    }

    // No procesar mensajes propios
    if (event.senderAccountId === recipientAccountId) {
      return null;
    }

    const conversationId = event.conversationId;

    // Cancelar respuesta pendiente anterior para esta conversación
    if (responseQueue.has(conversationId)) {
      clearTimeout(responseQueue.get(conversationId));
      responseQueue.delete(conversationId);
    }

    // Programar generación de respuesta
    if (this.config.mode === 'auto' && this.config.responseDelay > 0) {
      // Modo auto con delay
      const timeout = setTimeout(async () => {
        const suggestion = await this.generateSuggestion(event, context, recipientAccountId);
        if (suggestion) {
          this.onSuggestionCallback?.(suggestion);
        }
        responseQueue.delete(conversationId);
      }, this.config.responseDelay * 1000);

      responseQueue.set(conversationId, timeout);
      return null;
    } else {
      // Modo suggest: generar inmediatamente
      return this.generateSuggestion(event, context, recipientAccountId);
    }
  }

  /**
   * Genera una sugerencia de respuesta
   */
  async generateSuggestion(
    event: MessageEvent,
    context: ContextData,
    recipientAccountId: string
  ): Promise<AISuggestion | null> {
    try {
      if (!this.groqClient.isConfigured()) {
        console.log('[core-ai] API key not configured, skipping generation');
        return null;
      }

      // Construir el prompt
      const prompt = this.promptBuilder.build(context, recipientAccountId);

      // Añadir el mensaje actual al historial
      const messagesWithCurrent = [
        ...prompt.messages,
        { role: 'user' as const, content: event.content },
      ];

      // Generar respuesta con Groq
      const response = await this.groqClient.createChatCompletion(
        prompt.systemPrompt,
        messagesWithCurrent,
        {
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }
      );

      // Crear sugerencia
      const suggestion: AISuggestion = {
        id: crypto.randomUUID(),
        conversationId: event.conversationId,
        content: response.content,
        generatedAt: new Date(),
        model: this.config.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        status: 'pending',
      };

      // Guardar sugerencia
      suggestions.set(suggestion.id, suggestion);

      console.log(`[core-ai] Generated suggestion: ${suggestion.id} (${response.usage.total_tokens} tokens)`);

      return suggestion;
    } catch (error: any) {
      console.error('[core-ai] Error generating suggestion:', error.message);
      return null;
    }
  }

  /**
   * Aprobar una sugerencia
   */
  approveSuggestion(suggestionId: string): AISuggestion | null {
    const suggestion = suggestions.get(suggestionId);
    if (suggestion) {
      suggestion.status = 'approved';
      return suggestion;
    }
    return null;
  }

  /**
   * Rechazar una sugerencia
   */
  rejectSuggestion(suggestionId: string): AISuggestion | null {
    const suggestion = suggestions.get(suggestionId);
    if (suggestion) {
      suggestion.status = 'rejected';
      return suggestion;
    }
    return null;
  }

  /**
   * Editar y aprobar una sugerencia
   */
  editSuggestion(suggestionId: string, newContent: string): AISuggestion | null {
    const suggestion = suggestions.get(suggestionId);
    if (suggestion) {
      suggestion.content = newContent;
      suggestion.status = 'edited';
      return suggestion;
    }
    return null;
  }

  /**
   * Obtener sugerencia por ID
   */
  getSuggestion(suggestionId: string): AISuggestion | null {
    return suggestions.get(suggestionId) || null;
  }

  /**
   * Obtener sugerencias pendientes para una conversación
   */
  getPendingSuggestions(conversationId: string): AISuggestion[] {
    return Array.from(suggestions.values())
      .filter(s => s.conversationId === conversationId && s.status === 'pending');
  }

  /**
   * Cancelar respuestas pendientes para una cuenta
   */
  private cancelPendingResponses(accountId: string): void {
    // Por ahora cancelamos todas las respuestas pendientes
    for (const [key, timeout] of responseQueue.entries()) {
      clearTimeout(timeout);
    }
    responseQueue.clear();
  }

  /**
   * Registrar callback para nuevas sugerencias
   */
  onSuggestion(callback: (suggestion: AISuggestion) => void): void {
    this.onSuggestionCallback = callback;
  }

  /**
   * Verificar si la API está configurada
   */
  isApiConfigured(): boolean {
    return this.groqClient.isConfigured();
  }

  /**
   * Probar conexión con la API
   */
  async testApiConnection(): Promise<boolean> {
    return this.groqClient.testConnection();
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): CoreAIConfig {
    return { ...this.config };
  }
}

// Exportar instancia singleton para uso en el servicio
let instance: CoreAIExtension | null = null;

export function getCoreAI(config?: Partial<CoreAIConfig>): CoreAIExtension {
  if (!instance) {
    instance = new CoreAIExtension(config);
  }
  return instance;
}

export function resetCoreAI(): void {
  instance = null;
}

export { PromptBuilder, GroqClient };
export type { ContextData, BuiltPrompt };
