/**
 * @fluxcore/fluxcore - Extensión de IA por defecto
 * 
 * Proporciona respuestas inteligentes basadas en el contexto de la relación
 * con tres modos de operación: suggest, auto y off.
 */

import { PromptBuilder, type ContextData, type BuiltPrompt } from './prompt-builder';
import { OpenAICompatibleClient, AIClientError, type AIErrorType } from './openai-compatible-client';

export interface FluxCoreConfig {
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

// Tipo simplificado de la respuesta del Runtime API
interface AssistantComposition {
  assistant: {
    id: string;
    name: string;
    modelConfig: {
      provider: 'groq' | 'openai';
      model: string;
      temperature: number;
      topP: number;
      responseFormat?: 'text' | 'json';
    };
  };
  instructions: Array<{ id: string; name?: string; content: string; order: number; versionId?: string | null }>;
  vectorStores: Array<any>;
  tools: Array<any>;
}

export class FluxCoreExtension {
  private config: FluxCoreConfig;
  private promptBuilder: PromptBuilder;
  private clients: Map<string, OpenAICompatibleClient> = new Map();
  private onSuggestionCallback?: (suggestion: AISuggestion) => void;

  constructor(config: Partial<FluxCoreConfig> = {}) {
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
   * Fetch active assistant from FluxCore Runtime API
   */
  private async fetchActiveAssistant(accountId: string): Promise<AssistantComposition | null> {
    try {
      // TODO: Get API URL from config or env. Defaulting to localhost:3000 for now.
      const port = process.env.PORT || 3000;
      const url = `http://localhost:${port}/fluxcore/runtime/active-assistant?accountId=${accountId}`;

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`[fluxcore] Failed to fetch active assistant: ${response.status} ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();
      return data as AssistantComposition;
    } catch (error) {
      console.warn('[fluxcore] Error fetching active assistant:', error);
      return null;
    }
  }

  /**
   * Fetch RAG context from Vector Stores via Runtime API
   * RAG-008: Integración con retrieval service
   */
  private async fetchRAGContext(
    accountId: string,
    query: string,
    vectorStoreIds?: string[]
  ): Promise<ContextData['ragContext'] | null> {
    try {
      const port = process.env.PORT || 3000;
      const url = `http://localhost:${port}/fluxcore/runtime/rag-context`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          query,
          vectorStoreIds,
          options: { topK: 5, maxTokens: 2000 },
        }),
      });

      if (!response.ok) {
        console.warn(`[fluxcore] Failed to fetch RAG context: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.success && data.data) {
        return {
          context: data.data.context || '',
          sources: data.data.sources || [],
          totalTokens: data.data.totalTokens || 0,
          chunksUsed: data.data.chunksUsed || 0,
          vectorStoreIds,
        };
      }
      return null;
    } catch (error) {
      console.warn('[fluxcore] Error fetching RAG context:', error);
      return null;
    }
  }

  /**
   * Hook: Cuando se instala la extensión
   */
  async onInstall(accountId: string): Promise<void> {
    console.log(`[fluxcore] Installed for account ${accountId}`);
  }

  /**
   * Hook: Cuando se desinstala la extensión
   */
  async onUninstall(accountId: string): Promise<void> {
    console.log(`[fluxcore] Uninstalled from account ${accountId}`);
    // Cancelar respuestas pendientes
    this.cancelPendingResponses(accountId);
  }

  /**
   * Hook: Cuando cambia la configuración
   */
  async onConfigChange(accountId: string, newConfig: Partial<FluxCoreConfig>): Promise<void> {
    console.log(`[fluxcore] Config changed for account ${accountId}`, {
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
    console.log('[fluxcore] ========== generateSuggestion INICIO ==========');
    console.log('[fluxcore] Event messageId:', event.messageId);
    console.log('[fluxcore] Current config:', {
      enabled: this.config.enabled,
      mode: this.config.mode,
      model: this.config.model,
      temperature: this.config.temperature,
    });

    try {
      let providerOrder = this.getProviderOrder();
      console.log('[fluxcore] Providers disponibles:', providerOrder.map(p => p.provider));

      if (providerOrder.length === 0) {
        console.log('[fluxcore] ❌ No hay providers configurados');
        return null;
      }

      const active = await this.fetchActiveAssistant(recipientAccountId);

      const instructionIds = Array.isArray(active?.instructions)
        ? active!.instructions
          .map((i: any) => (typeof i?.id === 'string' ? i.id : ''))
          .filter((x: string) => typeof x === 'string' && x.trim().length > 0)
        : undefined;

      const instructionLinks = Array.isArray(active?.instructions)
        ? active!.instructions
          .map((i: any) => ({
            id: typeof i?.id === 'string' ? i.id : '',
            name: typeof i?.name === 'string' ? i.name : undefined,
            order: typeof i?.order === 'number' ? i.order : undefined,
            versionId: typeof i?.versionId === 'string' ? i.versionId : null,
          }))
          .filter((x: any) => typeof x?.id === 'string' && x.id.trim().length > 0)
        : undefined;

      const vectorStoreIds = Array.isArray(active?.vectorStores)
        ? active!.vectorStores
          .map((vs: any) => (typeof vs?.id === 'string' ? vs.id : ''))
          .filter((x: string) => typeof x === 'string' && x.trim().length > 0)
        : undefined;

      const vectorStores = Array.isArray(active?.vectorStores)
        ? active!.vectorStores
          .map((vs: any) => ({
            id: typeof vs?.id === 'string' ? vs.id : '',
            name: typeof vs?.name === 'string' ? vs.name : undefined,
          }))
          .filter((x: any) => typeof x?.id === 'string' && x.id.trim().length > 0)
        : undefined;

      const toolIds = Array.isArray(active?.tools)
        ? active!.tools
          .map((t: any) => (typeof t?.connectionId === 'string' ? t.connectionId : (typeof t?.id === 'string' ? t.id : '')))
          .filter((x: string) => typeof x === 'string' && x.trim().length > 0)
        : undefined;

      const tools = Array.isArray(active?.tools)
        ? active!.tools
          .map((t: any) => ({
            id: typeof t?.connectionId === 'string' ? t.connectionId : (typeof t?.id === 'string' ? t.id : ''),
            name: typeof t?.name === 'string' ? t.name : undefined,
          }))
          .filter((x: any) => typeof x?.id === 'string' && x.id.trim().length > 0)
        : undefined;

      const assistantMeta: ContextData['assistantMeta'] | undefined = active?.assistant
        ? {
          assistantId: active.assistant.id,
          assistantName: typeof active.assistant?.name === 'string' ? active.assistant.name : undefined,
          instructionIds,
          instructionLinks,
          vectorStoreIds,
          vectorStores,
          toolIds,
          tools,
          modelConfig: active.assistant?.modelConfig
            ? {
              provider: active.assistant.modelConfig.provider,
              model: active.assistant.modelConfig.model,
              temperature: active.assistant.modelConfig.temperature,
              topP: active.assistant.modelConfig.topP,
              responseFormat: (active.assistant.modelConfig as any)?.responseFormat,
            }
            : undefined,
        }
        : undefined;

      const preferredProvider =
        active?.assistant?.modelConfig?.provider === 'groq' || active?.assistant?.modelConfig?.provider === 'openai'
          ? active.assistant.modelConfig.provider
          : null;

      const hasPreferredProvider = preferredProvider
        ? providerOrder.some((p) => p.provider === preferredProvider)
        : false;

      console.log('[fluxcore] Preferred provider:', preferredProvider);
      console.log('[fluxcore] hasPreferredProvider:', hasPreferredProvider);
      console.log('[fluxcore] Provider order final:', providerOrder.map(p => p.provider));

      if (hasPreferredProvider && preferredProvider) {
        providerOrder = providerOrder
          .slice()
          .sort((a, b) => (a.provider === preferredProvider ? 0 : 1) - (b.provider === preferredProvider ? 0 : 1));
      }

      // Construir el prompt
      const extraInstructions = Array.isArray(active?.instructions)
        ? active!.instructions
          .map((i) => (typeof (i as any)?.content === 'string' ? (i as any).content : ''))
          .filter((x) => typeof x === 'string' && x.trim().length > 0)
        : [];

      // RAG-008: Obtener contexto de Vector Stores si están configurados
      let ragContext: ContextData['ragContext'] | undefined;
      if (vectorStoreIds && vectorStoreIds.length > 0) {
        const rag = await this.fetchRAGContext(recipientAccountId, event.content, vectorStoreIds);
        ragContext = rag || {
          context: '',
          sources: [],
          totalTokens: 0,
          chunksUsed: 0,
          vectorStoreIds,
        };
      }

      // Inyectar RAG context en el contexto
      const enrichedContext: ContextData = {
        ...context,
        assistantMeta,
        ragContext,
      };

      const prompt = this.promptBuilder.build(
        enrichedContext,
        recipientAccountId,
        extraInstructions.length > 0 ? extraInstructions : undefined
      );

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
        context: enrichedContext,
        builtPrompt: {
          systemPrompt: prompt.systemPrompt,
          messages: prompt.messages,
          messagesWithCurrent,
        },
        attempts: [],
      };

      let response: ChatCompletionResult;
      console.log('[fluxcore] Llamando createChatCompletionWithFallback...');
      console.log('[fluxcore] modelOverride:', hasPreferredProvider && typeof active?.assistant?.modelConfig?.model === 'string'
        ? active.assistant.modelConfig.model
        : 'ninguno (usando default)');

      try {
        response = await this.createChatCompletionWithFallback({
          providerOrder,
          systemPrompt: prompt.systemPrompt,
          messages: messagesWithCurrent,
          trace,
          modelOverride:
            hasPreferredProvider && typeof active?.assistant?.modelConfig?.model === 'string'
              ? active.assistant.modelConfig.model
              : undefined,
          temperatureOverride:
            hasPreferredProvider && typeof active?.assistant?.modelConfig?.temperature === 'number'
              ? active.assistant.modelConfig.temperature
              : undefined,
        });
        console.log('[fluxcore] ✓ Respuesta recibida de provider:', response.provider);
      } catch (error: any) {
        console.log('[fluxcore] ❌ Error en createChatCompletionWithFallback:', error.message);
        addTrace(trace);
        throw error;
      }

      trace.model = response.requestBody.model;
      trace.maxTokens = response.requestBody.max_tokens;
      trace.temperature = response.requestBody.temperature;

      if (assistantMeta) {
        assistantMeta.effective = {
          provider: response.provider,
          baseUrl: response.baseUrl,
          model: response.requestBody.model,
          maxTokens: response.requestBody.max_tokens,
          temperature: response.requestBody.temperature,
        };
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

      console.log(`[fluxcore] Generated suggestion: ${suggestion.id} (${response.usage.total_tokens} tokens)`);

      return suggestion;
    } catch (error: any) {
      console.error('[fluxcore] Error generating suggestion:', error?.message || 'Unknown error');
      return null;
    }
  }

  listTraces(params: { accountId: string; conversationId?: string; limit?: number }): Array<Pick<AITraceEntry, 'id' | 'createdAt' | 'accountId' | 'conversationId' | 'messageId' | 'mode' | 'model' | 'maxTokens' | 'temperature' | 'final'> & { attempts: number }> {
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
  getConfig(): FluxCoreConfig {
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
    console.log('[fluxcore] getProviderOrder - config.providerOrder length:', this.config.providerOrder?.length || 0);
    console.log('[fluxcore] getProviderOrder - OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('[fluxcore] getProviderOrder - GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

    if (Array.isArray(this.config.providerOrder) && this.config.providerOrder.length > 0) {
      console.log('[fluxcore] Usando providerOrder de config:', this.config.providerOrder.map(p => p.provider));
      return this.config.providerOrder.filter((p) => typeof p?.apiKey === 'string' && p.apiKey.length > 0);
    }

    console.log('[fluxcore] Construyendo providerOrder desde environment...');
    const providers: Array<{ provider: 'groq' | 'openai'; baseUrl: string; apiKey: string; keySource?: string }> = [];

    // Groq primero (más estable/rápido para desarrollo)
    const groqKey = this.config.apiKey || process.env.GROQ_API_KEY;
    if (groqKey) {
      providers.push({
        provider: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
        keySource: groqKey === this.config.apiKey ? 'config' : 'env_GROQ_API_KEY',
      });
    }

    // OpenAI como alternativa
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      providers.push({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: openaiKey,
        keySource: 'env_OPENAI_API_KEY',
      });
    }

    return providers;
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

  /**
   * Obtiene un modelo compatible para el provider dado.
   * Si el modelo solicitado no es compatible con el provider, retorna un equivalente.
   */
  private getCompatibleModel(requestedModel: string, provider: 'groq' | 'openai'): string {
    // Modelos de OpenAI
    const openaiModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'];
    // Modelos de Groq
    const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];

    const isOpenAIModel = openaiModels.some(m => requestedModel.includes(m));
    const isGroqModel = groqModels.some(m => requestedModel.includes(m));

    // Si el modelo ya es compatible con el provider, usarlo
    if (provider === 'openai' && isOpenAIModel) return requestedModel;
    if (provider === 'groq' && isGroqModel) return requestedModel;
    if (provider === 'groq' && !isOpenAIModel && !isGroqModel) return requestedModel; // Modelo custom, intentar

    // Mapeo de fallback
    if (provider === 'groq' && isOpenAIModel) {
      // Modelo de OpenAI solicitado pero usando Groq - usar equivalente
      if (requestedModel.includes('gpt-4o')) return 'llama-3.3-70b-versatile';
      if (requestedModel.includes('gpt-4')) return 'llama-3.3-70b-versatile';
      if (requestedModel.includes('gpt-3.5')) return 'llama-3.1-8b-instant';
      return 'llama-3.1-8b-instant'; // Default Groq
    }

    if (provider === 'openai' && isGroqModel) {
      // Modelo de Groq solicitado pero usando OpenAI - usar equivalente
      if (requestedModel.includes('70b')) return 'gpt-4o';
      return 'gpt-4o-mini'; // Default OpenAI
    }

    return requestedModel; // Fallback: usar el modelo tal cual
  }

  private async createChatCompletionWithFallback(params: {
    providerOrder: Array<{ provider: 'groq' | 'openai'; baseUrl: string; apiKey: string; keySource?: string }>;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    trace: AITraceEntry;
    modelOverride?: string;
    maxTokensOverride?: number;
    temperatureOverride?: number;
  }): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; provider: 'groq' | 'openai'; baseUrl: string; requestBody: ChatCompletionRequestBody }> {
    const timeoutMs = this.config.timeoutMs || 15000;
    const maxAttemptsPerProvider = 2;

    // Modelo base solicitado (puede ser de cualquier provider)
    const requestedModel = params.modelOverride || this.config.model;
    const maxTokens = params.maxTokensOverride ?? this.config.maxTokens;
    const temperature = params.temperatureOverride ?? this.config.temperature;

    let lastError: any = null;

    for (let providerIdx = 0; providerIdx < params.providerOrder.length; providerIdx++) {
      const provider = params.providerOrder[providerIdx];
      const client = this.getClient(provider.baseUrl);

      // Ajustar modelo según el provider (mapeo de modelos entre providers)
      const model = this.getCompatibleModel(requestedModel, provider.provider);
      console.log(`[fluxcore] Intentando provider=${provider.provider} con modelo=${model} (solicitado: ${requestedModel})`);

      for (let attempt = 1; attempt <= maxAttemptsPerProvider; attempt++) {
        const startedAt = Date.now();
        const requestBody: ChatCompletionRequestBody = {
          model,
          messages: [
            { role: 'system' as const, content: params.systemPrompt },
            ...params.messages,
          ],
          max_tokens: maxTokens,
          temperature,
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
            model,
            maxTokens,
            temperature,
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
let instance: FluxCoreExtension | null = null;

export function getFluxCore(config?: Partial<FluxCoreConfig>): FluxCoreExtension {
  if (!instance) {
    instance = new FluxCoreExtension(config);
  }
  return instance;
}

export function resetFluxCore(): void {
  instance = null;
}

export { PromptBuilder, OpenAICompatibleClient, AIClientError };
export type { ContextData, BuiltPrompt };
