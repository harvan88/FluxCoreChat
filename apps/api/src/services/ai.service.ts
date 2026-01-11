/**
 * AI Service - Integra la extensión @fluxcore/core-ai con el sistema
 * 
 * Gestiona:
 * - Generación de sugerencias de IA
 * - Cola de respuestas automáticas
 * - Eventos WebSocket para sugerencias
 */

import { db } from '@fluxcore/db';
import { messages, conversations, accounts, relationships, extensionInstallations } from '@fluxcore/db';
import { and, eq, desc } from 'drizzle-orm';
import { 
  CoreAIExtension, 
  getCoreAI, 
  type AISuggestion, 
  type MessageEvent,
  type ContextData,
  OpenAICompatibleClient,
  AIClientError,
} from '../../../../extensions/core-ai/src';
import { aiEntitlementsService, type AIProviderId } from './ai-entitlements.service';
import { creditsService } from './credits.service';

export interface AIServiceConfig {
  defaultEnabled: boolean;
  defaultMode: 'suggest' | 'auto' | 'off';
  defaultResponseDelay: number;
}

class AIService {
  private extension: CoreAIExtension;
  private wsEmitter?: (event: string, data: any) => void;
  private probeClients: Map<string, OpenAICompatibleClient> = new Map();
  private readonly FLUXCORE_PROMO_MARKER = '[[fluxcore:promo]]';
  private readonly FLUXCORE_BRANDING_FOOTER = '(gestionado por FluxCore)';
  private readonly AI_SESSION_FEATURE_KEY = 'ai.session';
  private readonly OPENAI_ENGINE = 'openai_chat';

  constructor() {
    this.extension = getCoreAI({
      enabled: true,
      mode: 'suggest',
      responseDelay: 30,
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      maxTokens: 256,
      temperature: 0.7,
      timeoutMs: 15000,
    });

    // Registrar callback para sugerencias
    this.extension.onSuggestion((suggestion) => {
      this.emitSuggestion(suggestion);
    });
  }

  stripFluxCorePromoMarker(text: string): { text: string; promo: boolean } {
    if (typeof text !== 'string' || text.length === 0) {
      return { text: text || '', promo: false };
    }

    const markerIdx = text.indexOf(this.FLUXCORE_PROMO_MARKER);
    if (markerIdx === -1) {
      return { text, promo: false };
    }

    const withoutMarker = text.split(this.FLUXCORE_PROMO_MARKER).join('');
    const cleaned = withoutMarker
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { text: cleaned, promo: true };
  }

  private stripFluxCoreBrandingFooterFromEnd(text: string): string {
    if (typeof text !== 'string' || text.length === 0) return text || '';

    const lines = text.split('\n');
    let end = lines.length - 1;

    while (end >= 0 && lines[end].trim().length === 0) {
      end -= 1;
    }

    if (end < 0) return '';

    const lastLine = lines[end].trim();

    if (
      lastLine === this.FLUXCORE_BRANDING_FOOTER ||
      lastLine.toLowerCase().includes('gestionado por fluxcore')
    ) {
      const trimmedLines = lines.slice(0, end);
      let end2 = trimmedLines.length - 1;
      while (end2 >= 0 && trimmedLines[end2].trim().length === 0) {
        end2 -= 1;
      }
      return trimmedLines.slice(0, end2 + 1).join('\n');
    }

    return text;
  }

  appendFluxCoreBrandingFooter(text: string): string {
    const safeText = typeof text === 'string' ? text : '';

    const withoutFooter = this.stripFluxCoreBrandingFooterFromEnd(safeText);
    const trimmed = withoutFooter.trim();
    if (trimmed.length === 0) {
      return this.FLUXCORE_BRANDING_FOOTER;
    }

    return `${trimmed}\n\n${this.FLUXCORE_BRANDING_FOOTER}`;
  }

  getSuggestionBrandingDecision(suggestionId?: string | null): { promo: boolean } {
    if (!suggestionId) return { promo: false };
    const stored = this.getSuggestion(suggestionId);
    if (!stored?.content) return { promo: false };
    return { promo: this.stripFluxCorePromoMarker(stored.content).promo };
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
      const gated = await this.applyCreditsGating({
        accountId: recipientAccountId,
        conversationId,
        config,
      });
      
      if (!gated.config.enabled || gated.config.mode === 'off') {
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
      await this.extension.onConfigChange(recipientAccountId, {
        enabled: gated.config.enabled,
        mode: gated.config.mode,
        responseDelay: gated.config.responseDelay,
        provider: gated.config.provider,
        model: gated.config.model || 'llama-3.1-8b-instant',
        maxTokens: gated.config.maxTokens || 256,
        temperature: gated.config.temperature || 0.7,
        timeoutMs: 15000,
        providerOrder: gated.config.providerOrder,
      });

      // Generar sugerencia
      const suggestion = await this.extension.onMessage(event, context, recipientAccountId);

      if (
        gated.sessionId &&
        suggestion?.provider === 'openai' &&
        suggestion?.usage?.totalTokens &&
        typeof suggestion.usage.totalTokens === 'number'
      ) {
        await creditsService.consumeSessionTokens({
          sessionId: gated.sessionId,
          tokens: suggestion.usage.totalTokens,
        });
      }

      if (suggestion) {
        this.emitSuggestion(suggestion);
      }

      return suggestion;
    } catch (error: any) {
      console.error('[ai-service] Error processing message:', error.message);
      return null;
    }
  }

  private async applyCreditsGating(params: {
    accountId: string;
    conversationId: string;
    config: any;
  }): Promise<{ config: any; sessionId?: string }> {
    const providerOrder = Array.isArray(params.config?.providerOrder) ? params.config.providerOrder : [];
    const hasOpenAI = providerOrder.some((p: any) => p?.provider === 'openai');
    const openAIIsPrimary = providerOrder.length > 0 && providerOrder[0]?.provider === 'openai';

    if (!hasOpenAI) {
      return { config: params.config };
    }

    try {
      const active = await creditsService.getActiveConversationSession({
        accountId: params.accountId,
        conversationId: params.conversationId,
        featureKey: this.AI_SESSION_FEATURE_KEY,
      });

      if (active) {
        return { config: params.config, sessionId: active.id };
      }

      if (!openAIIsPrimary) {
        const filtered = providerOrder.filter((p: any) => p?.provider !== 'openai');
        const nextProvider = filtered.length > 0 ? filtered[0].provider : null;
        const currentModel = typeof params.config?.model === 'string' ? params.config.model : '';
        const shouldSwitchModel = nextProvider === 'groq' && currentModel.startsWith('gpt-');

        return {
          config: {
            ...params.config,
            providerOrder: filtered,
            provider: nextProvider,
            model: shouldSwitchModel ? 'llama-3.1-8b-instant' : params.config.model,
          },
        };
      }

      const opened = await creditsService.openConversationSession({
        accountId: params.accountId,
        conversationId: params.conversationId,
        featureKey: this.AI_SESSION_FEATURE_KEY,
        engine: this.OPENAI_ENGINE,
        model: typeof params.config?.model === 'string' ? params.config.model : 'gpt-4o-mini-2024-07-18',
      });

      return { config: params.config, sessionId: opened.session.id };
    } catch (error: any) {
      const filtered = providerOrder.filter((p: any) => p?.provider !== 'openai');
      const nextProvider = filtered.length > 0 ? filtered[0].provider : null;
      const currentModel = typeof params.config?.model === 'string' ? params.config.model : '';
      const shouldSwitchModel = nextProvider === 'groq' && currentModel.startsWith('gpt-');

      return {
        config: {
          ...params.config,
          providerOrder: filtered,
          provider: nextProvider,
          model: shouldSwitchModel ? 'llama-3.1-8b-instant' : params.config.model,
        },
      };
    }
  }

  /**
   * Obtener configuración de IA para una cuenta
   */
  async getAccountConfig(accountId: string): Promise<any> {
    try {
      const entitlement = await aiEntitlementsService.getEntitlement(accountId);
      const [installation] = await db
        .select()
        .from(extensionInstallations)
        .where(
          and(
            eq(extensionInstallations.accountId, accountId),
            eq(extensionInstallations.extensionId, '@fluxcore/core-ai')
          )
        )
        .limit(1);

      const defaultAllowedProviders = (['groq', 'openai'] as AIProviderId[])
        .filter((provider) => this.getProductKeysForProvider(provider).length > 0);

      const defaultProvider: AIProviderId | null = defaultAllowedProviders.includes('groq')
        ? 'groq'
        : defaultAllowedProviders[0] || null;

      const effectiveEntitlement = entitlement ?? {
        accountId,
        enabled: true,
        allowedProviders: defaultAllowedProviders,
        defaultProvider,
      };

      if (effectiveEntitlement.enabled !== true || effectiveEntitlement.allowedProviders.length === 0) {
        return {
          enabled: false,
          entitled: entitlement ? false : true,
          allowedProviders: effectiveEntitlement.allowedProviders ?? [],
          provider: null,
          providerOrder: [],
          mode: 'off' as const,
          responseDelay: 30,
          smartDelayEnabled: false,
          model: 'llama-3.1-8b-instant',
          maxTokens: 256,
          temperature: 0.7,
        };
      }

      if (!installation) {
        const providerSelection = this.resolveProviderSelection({
          selectedProvider: null,
          entitlement: effectiveEntitlement,
        });

        return {
          enabled: false,
          entitled: true,
          allowedProviders: effectiveEntitlement.allowedProviders,
          provider: providerSelection.selectedProvider,
          providerOrder: providerSelection.providerOrder,
          mode: 'off' as const,
          responseDelay: 30,
          smartDelayEnabled: false,
          model: 'llama-3.1-8b-instant',
          maxTokens: 256,
          temperature: 0.7,
        };
      }

      const cfg = (installation.config || {}) as Record<string, any>;

      const requestedProvider = cfg.provider === 'openai' || cfg.provider === 'groq' ? (cfg.provider as AIProviderId) : null;
      const providerSelection = this.resolveProviderSelection({
        selectedProvider: requestedProvider,
        entitlement: effectiveEntitlement,
      });

      return {
        entitled: true,
        allowedProviders: effectiveEntitlement.allowedProviders,
        provider: providerSelection.selectedProvider,
        providerOrder: providerSelection.providerOrder,
        enabled: installation.enabled !== false && cfg.enabled !== false,
        mode: (cfg.mode as 'suggest' | 'auto' | 'off') || 'suggest',
        responseDelay: typeof cfg.responseDelay === 'number' ? cfg.responseDelay : 30,
        smartDelayEnabled: typeof cfg.smartDelayEnabled === 'boolean' ? cfg.smartDelayEnabled : false,
        model: typeof cfg.model === 'string' ? cfg.model : 'llama-3.1-8b-instant',
        maxTokens: typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 256,
        temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.7,
      };
    } catch (error: any) {
      console.warn('[ai-service] Could not load core-ai config:', error.message);
      return {
        enabled: false,
        entitled: false,
        allowedProviders: [],
        provider: null,
        providerOrder: [],
        mode: 'off' as const,
        responseDelay: 30,
        smartDelayEnabled: false,
        model: 'llama-3.1-8b-instant',
        maxTokens: 256,
        temperature: 0.7,
      };
    }
  }

  private resolveProviderSelection(params: {
    selectedProvider: AIProviderId | null;
    entitlement: { allowedProviders: AIProviderId[]; defaultProvider: AIProviderId | null };
  }): {
    selectedProvider: AIProviderId | null;
    providerOrder: Array<{ provider: AIProviderId; baseUrl: string; apiKey: string; keySource?: string }>;
  } {
    const allowed = Array.isArray(params.entitlement.allowedProviders)
      ? params.entitlement.allowedProviders
      : [];

    let selected: AIProviderId | null = params.selectedProvider;
    if (!selected || !allowed.includes(selected)) {
      selected = params.entitlement.defaultProvider && allowed.includes(params.entitlement.defaultProvider)
        ? params.entitlement.defaultProvider
        : allowed[0] || null;
    }

    const orderedProviders = selected
      ? [selected, ...allowed.filter((p) => p !== selected)]
      : [...allowed];

    const providerOrder: Array<{ provider: AIProviderId; baseUrl: string; apiKey: string; keySource?: string }> = [];

    for (const provider of orderedProviders) {
      const keys = this.getProductKeysForProvider(provider);
      for (const key of keys) {
        providerOrder.push({
          provider,
          baseUrl: provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
          apiKey: key.apiKey,
          keySource: key.keySource,
        });
      }
    }

    return {
      selectedProvider: selected,
      providerOrder,
    };
  }

  private getProductKeysForProvider(provider: AIProviderId): Array<{ apiKey: string; keySource: string }> {
    const poolVar = provider === 'groq' ? process.env.GROQ_API_KEYS : process.env.OPENAI_API_KEYS;
    const singleVar = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;

    const pool = (poolVar || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((apiKey, idx) => ({ apiKey, keySource: `env_pool_${idx + 1}` }));

    const single = typeof singleVar === 'string' && singleVar.trim().length > 0
      ? [{ apiKey: singleVar.trim(), keySource: 'env_single' }]
      : [];

    return [...pool, ...single];
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
          bio: (account.profile as any)?.bio || undefined,
          publicContext: (account.profile as any) || {},
          privateContext: account.privateContext || undefined,
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
          messageType: typeof (m.content as any)?.text === 'string' ? 'text' : 'unknown',
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

  listTraces(params: { accountId: string; conversationId?: string; limit?: number }): any[] {
    return this.extension.listTraces(params as any);
  }

  getTrace(params: { accountId: string; traceId: string }): any | null {
    return this.extension.getTrace(params as any);
  }

  clearTraces(params: { accountId: string }): number {
    return this.extension.clearTraces(params as any);
  }

  /**
   * Verificar si la API está configurada
   */
  isConfigured(): boolean {
    return this.extension.isApiConfigured();
  }

  async getAutoReplyDelayMs(accountId: string): Promise<number> {
    const config = await this.getAccountConfig(accountId);
    const delaySeconds = typeof config.responseDelay === 'number' ? config.responseDelay : 0;
    const delayMs = Math.max(0, Math.round(delaySeconds * 1000));
    return delayMs;
  }

  /**
   * Probar conexión con la API
   */
  async testConnection(): Promise<boolean> {
    return this.extension.testApiConnection();
  }

  async getStatusForAccount(accountId: string): Promise<any> {
    const cfg = await this.getAccountConfig(accountId);

    const providerOrder = Array.isArray(cfg.providerOrder) ? cfg.providerOrder : [];
    const configured = providerOrder.length > 0;

    const attempts: Array<{
      provider: string;
      baseUrl: string;
      keySource?: string;
      ok: boolean;
      errorType?: string;
      statusCode?: number;
      message?: string;
    }> = [];

    let connected: boolean | null = null;

    if (configured) {
      for (let i = 0; i < providerOrder.length; i++) {
        const p = providerOrder[i];
        const client = this.getProbeClient(p.baseUrl);

        try {
          await client.testConnection({ apiKey: p.apiKey, timeoutMs: 15000 });
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: true,
          });
          connected = true;
          break;
        } catch (error: any) {
          const normalized = this.normalizeProbeError(error);
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: false,
            errorType: normalized.type,
            statusCode: normalized.statusCode,
            message: normalized.message,
          });

          const canFallback = ['timeout', 'network_error', 'server_error', 'rate_limited', 'unauthorized'].includes(
            normalized.type
          );
          if (!canFallback) {
            connected = false;
            break;
          }
        }
      }

      if (connected === null) {
        connected = false;
      }
    }

    const selectedProvider = typeof cfg.provider === 'string' ? cfg.provider : null;

    const providerSummary = providerOrder
      .reduce((acc: any[], p: any) => {
        const existing = acc.find((x) => x.provider === p.provider);
        if (existing) {
          existing.keyCount += 1;
        } else {
          acc.push({ provider: p.provider, baseUrl: p.baseUrl, keyCount: 1 });
        }
        return acc;
      }, []);

    return {
      accountId,
      entitled: cfg.entitled === true,
      enabled: cfg.enabled === true,
      mode: cfg.mode || null,
      allowedProviders: cfg.allowedProviders || [],
      provider: selectedProvider,
      model: cfg.model || null,
      configured,
      connected,
      providerKeys: providerSummary,
      attempts,
    };
  }

  async getEnvStatus(): Promise<any> {
    const providerOrder: Array<{ provider: AIProviderId; baseUrl: string; apiKey: string; keySource?: string }> = [];

    for (const provider of ['groq', 'openai'] as AIProviderId[]) {
      const keys = this.getProductKeysForProvider(provider);
      for (const key of keys) {
        providerOrder.push({
          provider,
          baseUrl: provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1',
          apiKey: key.apiKey,
          keySource: key.keySource,
        });
      }
    }

    const configured = providerOrder.length > 0;
    const attempts: Array<{
      provider: string;
      baseUrl: string;
      keySource?: string;
      ok: boolean;
      errorType?: string;
      statusCode?: number;
      message?: string;
    }> = [];

    let connected: boolean | null = null;

    if (configured) {
      for (let i = 0; i < providerOrder.length; i++) {
        const p = providerOrder[i];
        const client = this.getProbeClient(p.baseUrl);

        try {
          await client.testConnection({ apiKey: p.apiKey, timeoutMs: 15000 });
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: true,
          });
          connected = true;
          break;
        } catch (error: any) {
          const normalized = this.normalizeProbeError(error);
          attempts.push({
            provider: p.provider,
            baseUrl: p.baseUrl,
            keySource: p.keySource,
            ok: false,
            errorType: normalized.type,
            statusCode: normalized.statusCode,
            message: normalized.message,
          });

          const canFallback = ['timeout', 'network_error', 'server_error', 'rate_limited', 'unauthorized'].includes(
            normalized.type
          );
          if (!canFallback) {
            connected = false;
            break;
          }
        }
      }

      if (connected === null) {
        connected = false;
      }
    }

    const providerSummary = providerOrder
      .reduce((acc: any[], p: any) => {
        const existing = acc.find((x) => x.provider === p.provider);
        if (existing) {
          existing.keyCount += 1;
        } else {
          acc.push({ provider: p.provider, baseUrl: p.baseUrl, keyCount: 1 });
        }
        return acc;
      }, []);

    return {
      configured,
      connected,
      providerKeys: providerSummary,
      attempts,
    };
  }

  async probeCompletion(params: {
    provider: AIProviderId;
    model: string;
    timeoutMs?: number;
  }): Promise<any> {
    const keys = this.getProductKeysForProvider(params.provider);
    if (keys.length === 0) {
      return {
        ok: false,
        provider: params.provider,
        model: params.model,
        errorType: 'not_configured',
        message: `No API key configured for provider ${params.provider}`,
      };
    }

    const baseUrl = params.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const client = this.getProbeClient(baseUrl);

    try {
      const res = await client.createChatCompletion({
        apiKey: keys[0].apiKey,
        systemPrompt: 'You are a connectivity test. Reply with a single word: pong.',
        messages: [{ role: 'user', content: 'ping' }],
        model: params.model,
        maxTokens: 16,
        temperature: 0,
        timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : 15000,
      });

      return {
        ok: true,
        provider: params.provider,
        baseUrl,
        keySource: keys[0].keySource,
        model: params.model,
        content: res.content,
        usage: res.usage,
      };
    } catch (error: any) {
      const normalized = this.normalizeProbeError(error);
      return {
        ok: false,
        provider: params.provider,
        baseUrl,
        keySource: keys[0].keySource,
        model: params.model,
        errorType: normalized.type,
        statusCode: normalized.statusCode,
        message: normalized.message,
      };
    }
  }

  private getProbeClient(baseUrl: string): OpenAICompatibleClient {
    const existing = this.probeClients.get(baseUrl);
    if (existing) return existing;
    const created = new OpenAICompatibleClient(baseUrl);
    this.probeClients.set(baseUrl, created);
    return created;
  }

  private normalizeProbeError(error: any): { type: string; message: string; statusCode?: number } {
    if (error instanceof AIClientError) {
      return {
        type: (error as any).type || 'unknown',
        message: error.message,
        statusCode: (error as any).statusCode,
      };
    }

    return {
      type: 'unknown',
      message: error?.message || 'Unknown error',
    };
  }

  /**
   * Generar respuesta manualmente
   */
  async generateResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string,
    options: { mode?: 'suggest' | 'auto'; triggerMessageId?: string; triggerMessageCreatedAt?: Date } = {}
  ): Promise<AISuggestion | null> {
    const config = await this.getAccountConfig(recipientAccountId);
    const gated = await this.applyCreditsGating({
      accountId: recipientAccountId,
      conversationId,
      config,
    });

    if (!gated.config.enabled || gated.config.mode === 'off') {
      return null;
    }

    const modeForPrompt = options.mode || config.mode;

    await this.extension.onConfigChange(recipientAccountId, {
      enabled: gated.config.enabled,
      mode: modeForPrompt,
      responseDelay: gated.config.responseDelay,
      provider: gated.config.provider,
      model: gated.config.model || 'llama-3.1-8b-instant',
      maxTokens: gated.config.maxTokens || 256,
      temperature: gated.config.temperature || 0.7,
      timeoutMs: 15000,
      providerOrder: gated.config.providerOrder,
    });

    const context = await this.buildContext(recipientAccountId, conversationId);
    
    const event: MessageEvent = {
      messageId: options.triggerMessageId || crypto.randomUUID(),
      conversationId,
      senderAccountId: 'manual',
      recipientAccountId,
      content: lastMessageContent,
      messageType: 'text',
      createdAt: options.triggerMessageCreatedAt || new Date(),
    };

    const suggestion = await this.extension.generateSuggestion(event, context, recipientAccountId);

    if (
      gated.sessionId &&
      suggestion?.provider === 'openai' &&
      suggestion?.usage?.totalTokens &&
      typeof suggestion.usage.totalTokens === 'number'
    ) {
      await creditsService.consumeSessionTokens({
        sessionId: gated.sessionId,
        tokens: suggestion.usage.totalTokens,
      });
    }

    return suggestion;
  }
}

// Singleton
export const aiService = new AIService();
export default aiService;
