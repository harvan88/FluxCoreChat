/**
 * AI Service - Integra la extensión @fluxcore/asistentes con el sistema
 * 
 * Gestiona:
 * - Generación de sugerencias de IA
 * - Cola de respuestas automáticas
 * - Eventos WebSocket para sugerencias
 */

import { db } from '@fluxcore/db';
import { accounts, messages, conversations, relationships, extensionInstallations } from '@fluxcore/db';
import type { FluxPolicyContext } from '@fluxcore/db';
import { and, eq } from 'drizzle-orm';
import { manifestLoader } from './manifest-loader.service';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { aiEntitlementsService, type AIProviderId } from './ai-entitlements.service';
import { creditsService } from './credits.service';
import { resolveExecutionPlan } from './ai-execution-plan.service';
import type { GenerateResponseResult, EligiblePlan } from './ai-execution-plan';
import { stripFluxCorePromoMarker as _stripPromo, appendFluxCoreBrandingFooter as _appendBranding, getSuggestionBrandingDecision as _brandingDecision } from './ai-branding.service';
import { suggestionStore } from './ai-suggestion-store';
import { aiTraceService } from './ai-trace.service';
import { buildContext as _buildContext } from './ai-context.service';
import { aiRateLimiter } from './ai-rate-limiter.service';

type AISuggestion = {
  id: string;
  conversationId: string;
  accountId?: string;
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
  proposedWork?: {
    workDefinitionId: string;
    intent: string;
    candidateSlots: Array<{ path: string; value: any; evidence: string }>;
    confidence: number;
    traceId: string;
  };
  attempts?: any[];
  toolUse?: any;
  toolsUsed?: any[];
  promptDebug?: any;
};

type MessageEvent = {
  messageId: string;
  conversationId: string;
  senderAccountId: string;
  recipientAccountId: string;
  content: string;
  messageType: string;
  createdAt: Date;
};

type ContextData = any;

export interface AIServiceConfig {
  defaultEnabled: boolean;
  defaultMode: 'suggest' | 'auto' | 'off';
  defaultResponseDelay: number;
}

class AIService {
  private wsEmitter?: (event: string, data: any) => void;
  private probeClients: Map<string, any> = new Map();
  private fluxcoreModulePromise: Promise<any> | null = null;
  private fluxcoreExtensionPromise: Promise<any> | null = null;
  private fluxcoreExtension: any | null = null;
  private readonly FLUXCORE_ALIAS = 'fluxcore';

  constructor() {
    // Wire up trace service with extension loader
    aiTraceService.setExtensionRef({ getFluxCoreExtension: () => this.getFluxCoreExtension() });
  }

  private async loadFluxCoreModule(): Promise<any> {
    if (this.fluxcoreModulePromise) return this.fluxcoreModulePromise;

    this.fluxcoreModulePromise = (async () => {
      const extensionId = '@fluxcore/asistentes';
      const manifest = manifestLoader.getManifest(extensionId);
      const root = manifestLoader.getExtensionRoot(extensionId);
      const entrypoint = typeof (manifest as any)?.entrypoint === 'string' ? (manifest as any).entrypoint : null;

      if (!manifest || !root || !entrypoint) {
        throw new Error(`Asistentes runtime entrypoint not available for ${extensionId}`);
      }

      const absEntrypoint = path.resolve(root, entrypoint);
      const moduleUrl = pathToFileURL(absEntrypoint).href;
      return import(moduleUrl);
    })();

    return this.fluxcoreModulePromise;
  }

  public async getFluxCoreExtension(): Promise<any | null> {
    if (this.fluxcoreExtension) return this.fluxcoreExtension;
    if (this.fluxcoreExtensionPromise) return this.fluxcoreExtensionPromise;

    this.fluxcoreExtensionPromise = (async () => {
      try {
        const mod: any = await this.loadFluxCoreModule();
        if (typeof mod?.getFluxCore !== 'function') {
          return null;
        }

        const ext = mod.getFluxCore({
          enabled: true,
          mode: 'suggest',
          responseDelay: 30,
          provider: 'groq',
          model: 'llama-3.1-8b-instant',
          maxTokens: 256,
          temperature: 0.7,
          timeoutMs: 15000,
        });

        if (typeof ext?.onSuggestion === 'function') {
          ext.onSuggestion((suggestion: AISuggestion) => {
            if (suggestion?.id) {
              suggestionStore.set(suggestion.id, suggestion);
            }
            this.emitSuggestion(suggestion);
          });
        }

        // Inject runtime services (replaces HTTP self-calls with direct in-process calls)
        if (typeof ext?.setRuntimeServices === 'function') {
          const { fluxcoreService } = await import('./fluxcore.service');
          const { retrievalService } = await import('./retrieval.service');
          const { aiTemplateService } = await import('./ai-template.service');

          ext.setRuntimeServices({
            resolveActiveAssistant: (accountId: string) =>
              fluxcoreService.resolveActiveAssistant(accountId),

            fetchRagContext: async (accountId: string, query: string, vectorStoreIds?: string[]) => {
              let vsIds = vectorStoreIds;
              if (!vsIds || vsIds.length === 0) {
                const composition = await fluxcoreService.resolveActiveAssistant(accountId);
                if (composition?.vectorStores) {
                  vsIds = composition.vectorStores.map((vs: any) => vs.id);
                }
              }
              if (!vsIds || vsIds.length === 0) return null;
              const result = await retrievalService.buildContext(query, vsIds, accountId, { topK: 5, maxTokens: 2000 });
              if (!result) return null;
              return {
                context: result.context || '',
                sources: result.sources || [],
                totalTokens: result.totalTokens || 0,
                chunksUsed: result.chunksUsed || 0,
                vectorStoreIds: vsIds,
              };
            },

            listTemplates: async (accountId: string) => {
              const templates = await aiTemplateService.getAvailableTemplates(accountId);
              return templates.map((t: any) => ({
                id: t.id,
                name: t.name,
                category: t.category,
                variables: t.variables?.map((v: any) => v.name) || [],
                instructions: t.aiUsageInstructions || null,
              }));
            },

            sendTemplate: (params: any) =>
              aiTemplateService.sendAuthorizedTemplate(params),
          });
        }

        this.fluxcoreExtension = ext;
        return ext;
      } catch (error: any) {
        console.warn('[ai-service] Could not load fluxcore runtime:', error?.message || error);
        return null;
      }
    })();

    return this.fluxcoreExtensionPromise;
  }

  private async getProbeClient(baseUrl: string): Promise<any> {
    const existing = this.probeClients.get(baseUrl);
    if (existing) return existing;

    const mod: any = await this.loadFluxCoreModule();
    if (typeof mod?.OpenAICompatibleClient !== 'function') {
      throw new Error('fluxcore OpenAICompatibleClient not available');
    }

    const created = new mod.OpenAICompatibleClient(baseUrl);
    this.probeClients.set(baseUrl, created);
    return created;
  }

  private normalizeProbeError(error: any): { type: string; message: string; statusCode?: number } {
    const type = typeof error?.type === 'string' ? error.type : 'unknown';
    const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : undefined;
    return { type, message, statusCode };
  }

  stripFluxCorePromoMarker(text: string): { text: string; promo: boolean } {
    return _stripPromo(text);
  }

  appendFluxCoreBrandingFooter(text: string): string {
    return _appendBranding(text);
  }

  getSuggestionBrandingDecision(suggestionId?: string | null): { promo: boolean } {
    if (!suggestionId) return { promo: false };
    const stored = this.getSuggestion(suggestionId);
    if (!stored?.content) return { promo: false };
    return _brandingDecision(stored.content);
  }

  /**
   * Registrar emisor de WebSocket
   */
  setWebSocketEmitter(emitter: (event: string, data: any) => void): void {
    this.wsEmitter = emitter;
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
            eq(extensionInstallations.extensionId, '@fluxcore/asistentes')
          )
        )
        .limit(1);

      const defaultAllowedProviders = (['groq', 'openai'] as AIProviderId[])
        .filter((provider) => this.getProductKeysForProvider(provider).length > 0);

      console.log('[ai-service] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
      console.log('[ai-service] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
      console.log('[ai-service] defaultAllowedProviders:', defaultAllowedProviders);

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

      // Consultar asistente activo para obtener modelConfig y timingConfig
      const { fluxcoreService } = await import('./fluxcore.service');
      const activeAssistant = await fluxcoreService.resolveActiveAssistant(accountId);

      // Priorizar config del asistente activo sobre extension_installations
      const assistantModelConfig = activeAssistant?.assistant?.modelConfig as Record<string, any> || {};
      const assistantTimingConfig = activeAssistant?.assistant?.timingConfig as Record<string, any> || {};

      // Provider: usar del asistente si existe, sino de extension_installations
      const requestedProvider =
        (assistantModelConfig.provider === 'openai' || assistantModelConfig.provider === 'groq')
          ? (assistantModelConfig.provider as AIProviderId)
          : (cfg.provider === 'openai' || cfg.provider === 'groq' ? (cfg.provider as AIProviderId) : null);

      const providerSelection = this.resolveProviderSelection({
        selectedProvider: requestedProvider,
        entitlement: effectiveEntitlement,
      });

      // Log para debug
      console.log('[ai-service] Using assistant config:', {
        hasActiveAssistant: !!activeAssistant?.assistant,
        assistantProvider: assistantModelConfig.provider,
        assistantModel: assistantModelConfig.model,
        assistantDelay: assistantTimingConfig.responseDelaySeconds,
        cfgProvider: cfg.provider,
        cfgModel: cfg.model,
        finalProvider: requestedProvider,
      });

      return {
        entitled: true,
        allowedProviders: effectiveEntitlement.allowedProviders,
        provider: providerSelection.selectedProvider,
        providerOrder: providerSelection.providerOrder,
        enabled: installation.enabled !== false && cfg.enabled !== false,
        mode: (cfg.mode as 'suggest' | 'auto' | 'off') || 'suggest',
        // Priorizar timingConfig del asistente
        responseDelay: typeof assistantTimingConfig.responseDelaySeconds === 'number'
          ? assistantTimingConfig.responseDelaySeconds
          : (typeof cfg.responseDelay === 'number' ? cfg.responseDelay : 30),
        smartDelayEnabled: assistantTimingConfig.smartDelay === true || cfg.smartDelayEnabled === true,
        // Priorizar modelConfig del asistente
        model: typeof assistantModelConfig.model === 'string'
          ? assistantModelConfig.model
          : (typeof cfg.model === 'string' ? cfg.model : 'llama-3.1-8b-instant'),
        maxTokens: typeof assistantModelConfig.maxTokens === 'number'
          ? assistantModelConfig.maxTokens
          : (typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 256),
        temperature: typeof assistantModelConfig.temperature === 'number'
          ? assistantModelConfig.temperature
          : (typeof cfg.temperature === 'number' ? cfg.temperature : 0.7),
      };
    } catch (error: any) {
      console.warn('[ai-service] Could not load fluxcore config:', error.message);
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

    console.log(`[ai-service] getProductKeysForProvider(${provider}):`);
    console.log(`  - poolVar exists: ${!!poolVar}`);
    console.log(`  - singleVar exists: ${!!singleVar}, length: ${singleVar?.length || 0}`);

    const pool = (poolVar || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((apiKey, idx) => ({ apiKey, keySource: `env_pool_${idx + 1}` }));

    const single = typeof singleVar === 'string' && singleVar.trim().length > 0
      ? [{ apiKey: singleVar.trim(), keySource: 'env_single' }]
      : [];

    const result = [...pool, ...single];
    console.log(`  - Result keys: ${result.length}`);
    return result;
  }

  private async buildContext(accountId: string, conversationId: string): Promise<ContextData> {
    return _buildContext(accountId, conversationId);
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

  approveSuggestion(suggestionId: string): AISuggestion | null {
    return suggestionStore.approve(suggestionId) as AISuggestion | null;
  }

  rejectSuggestion(suggestionId: string): AISuggestion | null {
    return suggestionStore.reject(suggestionId) as AISuggestion | null;
  }

  editSuggestion(suggestionId: string, newContent: string): AISuggestion | null {
    return suggestionStore.edit(suggestionId, newContent) as AISuggestion | null;
  }

  getSuggestion(suggestionId: string): AISuggestion | null {
    return suggestionStore.get(suggestionId) as AISuggestion | null;
  }

  getPendingSuggestions(conversationId: string): AISuggestion[] {
    return suggestionStore.getPending(conversationId) as AISuggestion[];
  }

  async listTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    return aiTraceService.listTraces(params);
  }

  async getTrace(params: { accountId: string; traceId: string }): Promise<any | null> {
    return aiTraceService.getTrace(params);
  }

  async clearTraces(params: { accountId: string }): Promise<number> {
    return aiTraceService.clearTraces(params);
  }

  async deleteTrace(params: { accountId: string; traceId: string }): Promise<boolean> {
    return aiTraceService.deleteTrace(params);
  }

  async exportTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    return aiTraceService.exportTraces(params);
  }

  /**
   * Verificar si la API está configurada
   */
  isConfigured(): boolean {
    return this.getProductKeysForProvider('groq').length > 0 || this.getProductKeysForProvider('openai').length > 0;
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
    const extension = await this.getFluxCoreExtension();
    if (!extension || typeof extension.testApiConnection !== 'function') return false;
    return extension.testApiConnection();
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
        const client = await this.getProbeClient(p.baseUrl);

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

    const { runtimeConfigService } = await import('./runtime-config.service');
    const runtimeCfg = await runtimeConfigService.getRuntime(accountId);

    return {
      accountId,
      entitled: cfg.entitled === true,
      enabled: cfg.enabled === true,
      mode: cfg.mode || null,
      activeRuntimeId: runtimeCfg.activeRuntimeId,
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
        const client = await this.getProbeClient(p.baseUrl);

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
    const client = await this.getProbeClient(baseUrl);

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

  async complete(params: {
    model: string;
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json';
    providerOrder?: any[];
  }): Promise<{
    content: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    // 1. Determine provider from model or params
    // Simple heuristic: if model starts with 'llama' or 'mixtral' -> Groq; otherwise OpenAI (gpt-*)
    // TODO: Make this robust.
    let provider: AIProviderId = 'openai';
    if (params.model.includes('llama') || params.model.includes('mixtral')) {
      provider = 'groq';
    }

    const keys = this.getProductKeysForProvider(provider);
    if (keys.length === 0) {
      throw new Error(`No API keys configured for provider ${provider}`);
    }

    const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const client = await this.getProbeClient(baseUrl);

    const result = await client.createChatCompletion({
      apiKey: keys[0].apiKey,
      systemPrompt: params.systemPrompt,
      messages: params.messages,
      model: params.model,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      responseFormat: params.responseFormat,
      timeoutMs: 30000,
    });

    return {
      content: result.content,
      usage: result.usage,
    };
  }

  /**
   * Genera una respuesta de IA para una conversación.
   *
   * Usa ExecutionPlan como single source of truth: toda la resolución de
   * asistente, provider, créditos y elegibilidad ocurre en un solo paso
   * ANTES de tocar la extensión FluxCore.
   *
   * @returns GenerateResponseResult — discriminated union:
   *   - { ok: true, suggestion }  → respuesta generada (o null si vacía)
   *   - { ok: false, block }      → bloqueado con motivo (créditos, API key, etc.)
   */
  async generateResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string,
    options: { mode?: 'suggest' | 'auto'; triggerMessageId?: string; triggerMessageCreatedAt?: Date; traceId?: string; policyContext?: FluxPolicyContext } = {}
  ): Promise<GenerateResponseResult> {
    const tracePrefix = options.traceId ? `[ai-service][${options.traceId}]` : '[ai-service]';
    const start = Date.now();

    // ── 1. Resolve execution plan (single source of truth) ──────────────
    const plan = await resolveExecutionPlan(recipientAccountId, conversationId);

    if (!plan.canExecute) {
      console.log(`${tracePrefix} BLOCKED: ${plan.block.reason} — ${plan.block.message}`);
      return { ok: false, block: plan.block };
    }

    // ── Rate limiting ──────────────────────────────────────────────────
    const rateCheck = aiRateLimiter.check(recipientAccountId);
    if (!rateCheck.allowed) {
      console.log(`${tracePrefix} RATE LIMITED: ${rateCheck.reason} (retry in ${rateCheck.retryAfterMs}ms)`);
      return { ok: false, block: { reason: 'rate_limited', message: `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil((rateCheck.retryAfterMs || 5000) / 1000)}s.` } };
    }
    aiRateLimiter.record(recipientAccountId);

    console.log(`${tracePrefix} plan resolved`, {
      runtime: plan.runtime,
      provider: plan.provider,
      model: plan.model,
      mode: plan.mode,
      creditsSession: plan.creditsSessionId ? 'active' : 'none',
      elapsedMs: Date.now() - start,
    });

    // ── 2. Load extension ───────────────────────────────────────────────
    const extension = await this.getFluxCoreExtension();
    if (!extension) {
      return { ok: false, block: { reason: 'no_extension', message: 'La extensión FluxCore no está disponible.' } };
    }

    // ── 3. Build immutable per-request config from plan ────────────────
    const modeForPrompt = options.mode || plan.mode;

    const requestConfig = {
      enabled: true,
      mode: modeForPrompt,
      responseDelay: plan.responseDelay,
      provider: plan.provider,
      model: plan.model,
      maxTokens: plan.maxTokens,
      temperature: plan.temperature,
      timeoutMs: 15000,
      providerOrder: plan.providerOrder,
    };

    // ── 4. Build context ────────────────────────────────────────────────
    const context = await this.buildContext(recipientAccountId, conversationId);

    // WES-170: Recuperar contexto de WES
    const { workResolver } = await import('../core/WorkResolver');
    const { fluxcoreWorkDefinitions } = await import('@fluxcore/db');

    // Necesitamos el relationshipId para workResolver.resolve (Canon compliance)
    const [convRecord] = await db.select({ relationshipId: conversations.relationshipId }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    const relationshipId = convRecord?.relationshipId;

    const wesContext: any = {
      availableWorkDefinitions: await db.select().from(fluxcoreWorkDefinitions).where(eq(fluxcoreWorkDefinitions.accountId, recipientAccountId)),
      activeWork: relationshipId ? await workResolver.resolve({ accountId: recipientAccountId, conversationId, relationshipId }).then(res =>
        res.type === 'RESUME_WORK' ? { id: (res as any).workId, state: 'ACTIVE' } : null
      ) : null
    };


    const event: MessageEvent = {
      messageId: options.triggerMessageId || crypto.randomUUID(),
      conversationId,
      senderAccountId: 'manual',
      recipientAccountId,
      content: lastMessageContent,
      messageType: 'text',
      createdAt: options.triggerMessageCreatedAt || new Date(),
    };

    // ── 5. Execute: OpenAI Assistants API path ──────────────────────────
    let suggestion: AISuggestion | null = null;

    if (plan.runtime === 'openai' && plan.externalId) {
      try {
        const { extensionHost } = await import('./extension-host.service');
        const openaiExtension = await extensionHost.loadExtensionRuntime('@fluxcore/asistentes-openai');
        if (openaiExtension?.generateResponse) {
          suggestion = await openaiExtension.generateResponse({
            plan,
            context,
            event,
            lastMessageContent,
            options,
          });
        }
      } catch (error: any) {
        console.error(`${tracePrefix} OpenAI Assistants extension path failed:`, error?.message);
        // Fall through to local runtime as last resort
      }
    }

    // ── 6. Execute: Local runtime (FluxCore extension) ──────────────────
    suggestion = await extension.generateResponse({
      conversationId,
      recipientAccountId,
      lastMessageContent,
      options: {
        mode: modeForPrompt,
        responseDelay: plan.responseDelay,
        triggerMessageId: options.triggerMessageId,
        policyContext: options.policyContext,
        wes: wesContext,
        context: context,
      }
    });

    // ── 7. Post-Processing Pipeline ──────────────────────────────────────
    if (suggestion) {
      await this.postProcessSuggestion({
        suggestion,
        plan,
        context,
        recipientAccountId,
        conversationId,
        modeForPrompt,
        start,
      });
    }

    return { ok: true, suggestion: suggestion || null };
  }

  /**
   * Common pipeline for AI responses (Signals, Branding, Traces, Credits)
   */
  private async postProcessSuggestion(params: {
    suggestion: AISuggestion;
    plan: EligiblePlan;
    context: any;
    recipientAccountId: string;
    conversationId: string;
    modeForPrompt: string;
    start: number;
  }): Promise<void> {
    const { suggestion, plan, context, recipientAccountId, conversationId, modeForPrompt, start } = params;

    suggestion.accountId = recipientAccountId;
    const rawContent = suggestion.content;



    // 2. Branding (Promo/Footer)
    if (suggestion.content) {
      const decision = _brandingDecision(suggestion.content);
      if (decision.promo) {
        suggestion.content = _appendBranding(suggestion.content);
      }
    }

    // 3. Store in Memory
    suggestionStore.set(suggestion.id, suggestion);

    // 4. Trace Persistence (fire-and-forget)
    aiTraceService
      .persistTrace({
        accountId: recipientAccountId,
        conversationId,
        runtime: plan.runtime,
        provider: suggestion.provider || plan.provider,
        model: suggestion.model || plan.model,
        mode: modeForPrompt,
        startedAt: new Date(start),
        completedAt: new Date(),
        durationMs: Date.now() - start,
        promptTokens: suggestion.usage?.promptTokens,
        completionTokens: suggestion.usage?.completionTokens,
        totalTokens: suggestion.usage?.totalTokens,
        responseContent: rawContent,
        requestContext: context,
        builtPrompt: suggestion.promptDebug?.builtPrompt,
        toolsOffered: suggestion.toolUse?.toolsOffered,
        toolsCalled: suggestion.toolUse?.toolsCalled,
        toolDetails: suggestion.toolUse?.toolDetails,
        attempts: suggestion.attempts,
      })
      .catch(() => { });

    // 5. Consumo de Créditos
    if (plan.creditsSessionId && suggestion.usage?.totalTokens) {
      // Solo cobrar si el provider es OpenAI o si el plan lo exige
      if (suggestion.provider === 'openai' || plan.provider === 'openai') {
        await creditsService.consumeSessionTokens({
          sessionId: plan.creditsSessionId,
          tokens: suggestion.usage.totalTokens,
        });
      }
    }
  }

  async tryCreateWelcomeConversation(params: { newAccountId: string; userName: string }): Promise<void> {
    try {
      const [installation] = await db
        .select()
        .from(extensionInstallations)
        .where(
          and(
            eq(extensionInstallations.accountId, params.newAccountId),
            eq(extensionInstallations.extensionId, '@fluxcore/asistentes')
          )
        )
        .limit(1);

      if (!installation || installation.enabled === false) {
        return;
      }

      const [fluxcoreAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.alias, this.FLUXCORE_ALIAS))
        .limit(1);

      if (!fluxcoreAccount) {
        return;
      }

      const [existingRelationship] = await db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.accountAId, fluxcoreAccount.id),
            eq(relationships.accountBId, params.newAccountId)
          )
        )
        .limit(1);

      if (existingRelationship) {
        // La relación existe, pero verificar si hay conversación
        const [existingConversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.relationshipId, existingRelationship.id))
          .limit(1);

        if (existingConversation) {
          return; // Ya hay conversación, no hacer nada
        }

        // Crear conversación para la relación existente
        const [conversation] = await db
          .insert(conversations)
          .values({
            relationshipId: existingRelationship.id,
            channel: 'web',
          })
          .returning();

        await db.insert(messages).values({
          conversationId: conversation.id,
          senderAccountId: fluxcoreAccount.id,
          type: 'incoming',
          content: {
            text: `¡Hola ${params.userName}! 👋\n\nSoy FluxCore, tu asistente. Estoy aquí para ayudarte a:\n\n• Configurar tu perfil\n• Añadir contactos\n• Explorar las extensiones\n\n¿En qué puedo ayudarte hoy?`,
          },
        });
        return;
      }

      const [relationship] = await db
        .insert(relationships)
        .values({
          accountAId: fluxcoreAccount.id,
          accountBId: params.newAccountId,
          perspectiveA: { savedName: params.userName },
          perspectiveB: { savedName: 'FluxCore' },
        })
        .returning();

      const [conversation] = await db
        .insert(conversations)
        .values({
          relationshipId: relationship.id,
          channel: 'web',
        })
        .returning();

      await db.insert(messages).values({
        conversationId: conversation.id,
        senderAccountId: fluxcoreAccount.id,
        type: 'incoming',
        content: {
          text: `¡Hola ${params.userName}! 👋\n\nSoy FluxCore, tu asistente. Estoy aquí para ayudarte a:\n\n• Configurar tu perfil\n• Añadir contactos\n• Explorar las extensiones\n\n¿En qué puedo ayudarte hoy?`,
        },
      });
    } catch (error: any) {
      console.error('[ai-service] Error creating FluxCore welcome:', error?.message || error);
    }
  }

  /**
   * Helper for internal services (like WES Interpreter) to call LLM directly.
   */
  public async rawCompletion(params: {
    model: string;
    provider: 'groq' | 'openai';
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
  }): Promise<{ content: string }> {
    const ext = await this.getFluxCoreExtension();
    if (!ext || typeof ext.callLLM !== 'function') {
      throw new Error('AI Extension / callLLM not available');
    }

    return ext.callLLM(params);
  }
}

// Singleton
export const aiService = new AIService();
export default aiService;
