/**
 * @fluxcore/core-ai - Extensión de IA por defecto
 * 
 * Proporciona respuestas inteligentes basadas en el contexto de la relación
 * con tres modos de operación: suggest, auto y off.
 */

import { PromptBuilder, type ContextData, type BuiltPrompt } from './prompt-builder';
import { OpenAICompatibleClient, AIClientError, type AIErrorType } from './openai-compatible-client';

export interface CoreAIConfig {
  enabled: boolean;
  mode: 'suggest' | 'auto' | 'off';
  responseDelay: number;
  provider?: 'groq' | 'openai';
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs?: number;
  providerOrder?: Array<{
    provider: 'groq' | 'openai';
    baseUrl: string;
    apiKey: string;
    keySource?: string;
  }>;
  // Legacy (deprecated): keep for backwards compatibility, but do not expose to users.
  apiKey?: string;
}

type ChatCompletionRequestBody = {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens: number;
  temperature: number;
};

type ChatCompletionResult = {
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  provider: 'groq' | 'openai';
  baseUrl: string;
  requestBody: ChatCompletionRequestBody;
};

export interface AISuggestion {
  id: string;
  conversationId: string;
  content: string;
  generatedAt: Date;
  model: string;
  traceId?: string;
  provider?: 'groq' | 'openai';
  baseUrl?: string;
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

export interface AITraceAttempt {
  provider: 'groq' | 'openai';
  baseUrl: string;
  keySource?: string;
  attempt: number;
  startedAt: string;
  durationMs?: number;
  requestBody: ChatCompletionRequestBody;
  ok: boolean;
  error?: {
    type: AIErrorType;
    message: string;
    statusCode?: number;
  };
  response?: {
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
}

export interface AITraceEntry {
  id: string;
  createdAt: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  mode: 'suggest' | 'auto';
  model: string;
  maxTokens: number;
  temperature: number;
  context: ContextData;
  builtPrompt: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    messagesWithCurrent: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
  attempts: AITraceAttempt[];
  final?: {
    provider: 'groq' | 'openai';
    baseUrl: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
}

// Cola de respuestas pendientes
const responseQueue: Map<string, NodeJS.Timeout> = new Map();

// Sugerencias generadas
const suggestions: Map<string, AISuggestion> = new Map();

const TRACE_MAX_ENTRIES = 200;
const traces: AITraceEntry[] = [];

function addTrace(entry: AITraceEntry): void {
  traces.unshift(entry);
  if (traces.length > TRACE_MAX_ENTRIES) {
    traces.length = TRACE_MAX_ENTRIES;
  }
}

export class CoreAIExtension {
  private config: CoreAIConfig;
  private promptBuilder: PromptBuilder;
  private clients: Map<string, OpenAICompatibleClient> = new Map();
  private onSuggestionCallback?: (suggestion: AISuggestion) => void;

  constructor(config: Partial<CoreAIConfig> = {}) {
    this.config = {
      enabled: true,
      mode: 'suggest',
      responseDelay: 30,
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      maxTokens: 256,
      temperature: 0.7,
      timeoutMs: 15000,
      ...config,
    };

    this.promptBuilder = new PromptBuilder({
      mode: this.config.mode,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      model: this.config.model,
    });
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
    console.log(`[core-ai] Config changed for account ${accountId}`, {
      enabled: newConfig.enabled,
      mode: newConfig.mode,
      responseDelay: newConfig.responseDelay,
      provider: newConfig.provider,
      model: newConfig.model,
      maxTokens: newConfig.maxTokens,
      temperature: newConfig.temperature,
      timeoutMs: newConfig.timeoutMs,
      providerOrder: Array.isArray(newConfig.providerOrder)
        ? newConfig.providerOrder.map((p) => ({ provider: p.provider, baseUrl: p.baseUrl, keySource: p.keySource }))
        : undefined,
    });
    
    Object.assign(this.config, newConfig);
    
    this.promptBuilder.updateConfig({
      mode: this.config.mode,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      model: this.config.model,
    });
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
      const providerOrder = this.getProviderOrder();
      if (providerOrder.length === 0) {
        console.log('[core-ai] No provider configured, skipping generation');
        return null;
      }

      // Construir el prompt
      const prompt = this.promptBuilder.build(context, recipientAccountId);

      // Añadir el mensaje actual al historial
      const hasCurrentInHistory = Array.isArray(context.messages)
        ? context.messages.some((m) => m.id === event.messageId)
        : false;

      const timestampPrefixRegex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s*/;
      const normalizeForDedupe = (text: string): string => text.replace(timestampPrefixRegex, '').trim();
      const extractTimestamp = (text: string): Date | null => {
        const m = text.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\]\s/);
        if (!m) return null;
        const d = new Date(m[1]);
        return Number.isNaN(d.getTime()) ? null : d;
      };

      const currentTs = event.createdAt instanceof Date
        ? event.createdAt.toISOString()
        : new Date(event.createdAt as any).toISOString();

      const currentContent = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s/.test(event.content)
        ? event.content
        : `[${currentTs}] ${event.content}`;

      const last = prompt.messages.length > 0 ? prompt.messages[prompt.messages.length - 1] : null;
      const lastTs = last ? extractTimestamp(last.content) : null;
      const eventCreatedAt = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt as any);
      const isDuplicateByText =
        last?.role === 'user' &&
        normalizeForDedupe(last.content) === normalizeForDedupe(event.content);
      const isNearInTime =
        lastTs &&
        !Number.isNaN(eventCreatedAt.getTime()) &&
        Math.abs(eventCreatedAt.getTime() - lastTs.getTime()) < 15000;

      const shouldAppendCurrent = !hasCurrentInHistory && !(isDuplicateByText && isNearInTime);
      const messagesWithCurrent = shouldAppendCurrent
        ? [...prompt.messages, { role: 'user' as const, content: currentContent }]
        : prompt.messages;

      const traceId = crypto.randomUUID();
      const trace: AITraceEntry = {
        id: traceId,
        createdAt: new Date().toISOString(),
        accountId: recipientAccountId,
        conversationId: event.conversationId,
        messageId: event.messageId,
        mode: this.config.mode === 'auto' ? 'auto' : 'suggest',
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        context,
        builtPrompt: {
          systemPrompt: prompt.systemPrompt,
          messages: prompt.messages,
          messagesWithCurrent,
        },
        attempts: [],
      };

      let response: ChatCompletionResult;
      try {
        response = await this.createChatCompletionWithFallback({
          providerOrder,
          systemPrompt: prompt.systemPrompt,
          messages: messagesWithCurrent,
          trace,
        });
      } catch (error: any) {
        addTrace(trace);
        throw error;
      }

      trace.final = {
        provider: response.provider,
        baseUrl: response.baseUrl,
        usage: response.usage,
      };

      addTrace(trace);

      const cleanedContent = typeof response.content === 'string'
        ? response.content.replace(timestampPrefixRegex, '').trim()
        : '';

      // Crear sugerencia
      const suggestion: AISuggestion = {
        id: crypto.randomUUID(),
        conversationId: event.conversationId,
        content: cleanedContent,
        generatedAt: new Date(),
        model: this.config.model,
        traceId,
        provider: response.provider,
        baseUrl: response.baseUrl,
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
      console.error('[core-ai] Error generating suggestion:', error?.message || 'Unknown error');
      return null;
    }
  }

  listTraces(params: { accountId: string; conversationId?: string; limit?: number }): Array<Pick<AITraceEntry, 'id' | 'createdAt' | 'accountId' | 'conversationId' | 'messageId' | 'mode' | 'model' | 'maxTokens' | 'temperature' | 'final'> & { attempts: number }>
  {
    const limit = typeof params.limit === 'number' ? Math.max(1, Math.min(200, params.limit)) : 50;
    return traces
      .filter((t) => t.accountId === params.accountId)
      .filter((t) => (params.conversationId ? t.conversationId === params.conversationId : true))
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        accountId: t.accountId,
        conversationId: t.conversationId,
        messageId: t.messageId,
        mode: t.mode,
        model: t.model,
        maxTokens: t.maxTokens,
        temperature: t.temperature,
        final: t.final,
        attempts: t.attempts.length,
      }));
  }

  getTrace(params: { accountId: string; traceId: string }): AITraceEntry | null {
    const trace = traces.find((t) => t.id === params.traceId);
    if (!trace) return null;
    if (trace.accountId !== params.accountId) return null;
    return trace;
  }

  clearTraces(params: { accountId: string }): number {
    const before = traces.length;
    for (let i = traces.length - 1; i >= 0; i--) {
      if (traces[i].accountId === params.accountId) {
        traces.splice(i, 1);
      }
    }
    return before - traces.length;
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
  private cancelPendingResponses(_accountId: string): void {
    // Por ahora cancelamos todas las respuestas pendientes
    for (const [, timeout] of responseQueue.entries()) {
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
    return this.getProviderOrder().length > 0;
  }

  /**
   * Probar conexión con la API
   */
  async testApiConnection(): Promise<boolean> {
    try {
      const providerOrder = this.getProviderOrder();
      if (providerOrder.length === 0) return false;

      for (let i = 0; i < providerOrder.length; i++) {
        const p = providerOrder[i];
        const client = this.getClient(p.baseUrl);
        try {
          await client.testConnection({ apiKey: p.apiKey, timeoutMs: this.config.timeoutMs || 15000 });
          return true;
        } catch (error: any) {
          const err = this.normalizeError(error);
          const canFallback = this.shouldFallback(err.type);
          if (!canFallback) {
            return false;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): CoreAIConfig {
    return { ...this.config };
  }

  private getClient(baseUrl: string): OpenAICompatibleClient {
    const existing = this.clients.get(baseUrl);
    if (existing) return existing;
    const created = new OpenAICompatibleClient(baseUrl);
    this.clients.set(baseUrl, created);
    return created;
  }

  private getProviderOrder(): Array<{ provider: 'groq' | 'openai'; baseUrl: string; apiKey: string; keySource?: string }> {
    if (Array.isArray(this.config.providerOrder) && this.config.providerOrder.length > 0) {
      return this.config.providerOrder.filter((p) => typeof p?.apiKey === 'string' && p.apiKey.length > 0);
    }

    const legacyKey = this.config.apiKey || process.env.GROQ_API_KEY || '';
    if (legacyKey) {
      return [
        {
          provider: 'groq',
          baseUrl: 'https://api.groq.com/openai/v1',
          apiKey: legacyKey,
          keySource: 'legacy',
        },
      ];
    }

    return [];
  }

  private normalizeError(error: any): { type: AIErrorType; message: string; statusCode?: number } {
    if (error instanceof AIClientError) {
      return { type: error.type, message: error.message, statusCode: error.statusCode };
    }
    return { type: 'unknown', message: error?.message || 'Unknown error' };
  }

  private shouldFallback(type: AIErrorType): boolean {
    return (
      type === 'timeout' ||
      type === 'network_error' ||
      type === 'server_error' ||
      type === 'rate_limited' ||
      type === 'unauthorized'
    );
  }

  private async createChatCompletionWithFallback(params: {
    providerOrder: Array<{ provider: 'groq' | 'openai'; baseUrl: string; apiKey: string; keySource?: string }>;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    trace: AITraceEntry;
  }): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; provider: 'groq' | 'openai'; baseUrl: string; requestBody: ChatCompletionRequestBody }> {
    const timeoutMs = this.config.timeoutMs || 15000;
    const maxAttemptsPerProvider = 2;

    let lastError: any = null;

    for (let providerIdx = 0; providerIdx < params.providerOrder.length; providerIdx++) {
      const provider = params.providerOrder[providerIdx];
      const client = this.getClient(provider.baseUrl);

      for (let attempt = 1; attempt <= maxAttemptsPerProvider; attempt++) {
        const startedAt = Date.now();
        const requestBody: ChatCompletionRequestBody = {
          model: this.config.model,
          messages: [
            { role: 'system' as const, content: params.systemPrompt },
            ...params.messages,
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        };

        const traceAttempt: AITraceAttempt = {
          provider: provider.provider,
          baseUrl: provider.baseUrl,
          keySource: provider.keySource,
          attempt,
          startedAt: new Date().toISOString(),
          requestBody,
          ok: false,
        };

        try {
          const res = await client.createChatCompletion({
            apiKey: provider.apiKey,
            systemPrompt: params.systemPrompt,
            messages: params.messages,
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            timeoutMs,
          });

          traceAttempt.ok = true;
          traceAttempt.durationMs = Date.now() - startedAt;
          traceAttempt.requestBody = res.requestBody as unknown as ChatCompletionRequestBody;
          traceAttempt.response = { content: res.content, usage: res.usage };
          params.trace.attempts.push(traceAttempt);

          return {
            content: res.content,
            usage: res.usage,
            provider: provider.provider,
            baseUrl: provider.baseUrl,
            requestBody: res.requestBody as unknown as ChatCompletionRequestBody,
          };
        } catch (error: any) {
          lastError = error;
          const err = this.normalizeError(error);
          const retryable = this.shouldFallback(err.type);

          traceAttempt.ok = false;
          traceAttempt.durationMs = Date.now() - startedAt;
          traceAttempt.error = {
            type: err.type,
            message: err.message,
            statusCode: err.statusCode,
          };
          params.trace.attempts.push(traceAttempt);

          if (retryable && attempt < maxAttemptsPerProvider) {
            await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt - 1)));
            continue;
          }

          const canFallback = this.shouldFallback(err.type);
          if (!canFallback) {
            throw error;
          }
        }
      }
    }

    throw lastError || new Error('All providers failed');
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

export { PromptBuilder, OpenAICompatibleClient, AIClientError };
export type { ContextData, BuiltPrompt };
