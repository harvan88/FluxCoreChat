/**
 * AI Service - Integra la extensión @fluxcore/fluxcore con el sistema
 * 
 * Gestiona:
 * - Generación de sugerencias de IA
 * - Cola de respuestas automáticas
 * - Eventos WebSocket para sugerencias
 */

import { db } from '@fluxcore/db';
import { messages, conversations, accounts, relationships, extensionInstallations } from '@fluxcore/db';
import { and, eq, desc } from 'drizzle-orm';
import { manifestLoader } from './manifest-loader.service';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { aiEntitlementsService, type AIProviderId } from './ai-entitlements.service';
import { creditsService } from './credits.service';
import { aiToolService } from './ai-tools.service';

type AISuggestion = {
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
  private suggestions: Map<string, AISuggestion> = new Map();
  private fluxcoreModulePromise: Promise<any> | null = null;
  private fluxcoreExtensionPromise: Promise<any> | null = null;
  private fluxcoreExtension: any | null = null;
  private readonly FLUXCORE_PROMO_MARKER = '[[fluxcore:promo]]';
  private readonly FLUXCORE_BRANDING_FOOTER = '(gestionado por FluxCore)';
  private readonly FLUXCORE_USERNAME = 'fluxcore';
  private readonly AI_SESSION_FEATURE_KEY = 'ai.session';
  private readonly OPENAI_ENGINE = 'openai_chat';

  constructor() {
  }

  private async loadFluxCoreModule(): Promise<any> {
    if (this.fluxcoreModulePromise) return this.fluxcoreModulePromise;

    this.fluxcoreModulePromise = (async () => {
      const extensionId = '@fluxcore/fluxcore';
      const manifest = manifestLoader.getManifest(extensionId);
      const root = manifestLoader.getExtensionRoot(extensionId);
      const entrypoint = typeof (manifest as any)?.entrypoint === 'string' ? (manifest as any).entrypoint : null;

      if (!manifest || !root || !entrypoint) {
        throw new Error('fluxcore runtime entrypoint not available');
      }

      const absEntrypoint = path.resolve(root, entrypoint);
      const moduleUrl = pathToFileURL(absEntrypoint).href;
      return import(moduleUrl);
    })();

    return this.fluxcoreModulePromise;
  }

  private async getFluxCoreExtension(): Promise<any | null> {
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
              this.suggestions.set(suggestion.id, suggestion);
            }
            this.emitSuggestion(suggestion);
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
   * NOTA: Este método genera la sugerencia. El delay debe aplicarse ANTES de llamar a este método.
   */
  async processMessage(
    messageId: string,
    conversationId: string,
    senderAccountId: string,
    recipientAccountId: string,
    content: string
  ): Promise<AISuggestion | null> {
    const traceId = typeof messageId === 'string' && messageId.length > 0
      ? messageId
      : `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const tracePrefix = `[ai-service][${traceId}]`;
    const start = Date.now();

    console.log('[ai-service] ========== PROCESANDO MENSAJE ==========');
    console.log('[ai-service] Message ID:', messageId);
    console.log('[ai-service] Conversation ID:', conversationId);
    console.log('[ai-service] Sender:', senderAccountId);
    console.log('[ai-service] Recipient:', recipientAccountId);
    console.log('[ai-service] Content:', content?.substring(0, 100));

    try {
      const extension = await this.getFluxCoreExtension();
      if (!extension) {
        console.log('[ai-service] ❌ Extension fluxcore NO disponible');
        return null;
      }
      console.log('[ai-service] ✓ Extension fluxcore cargada');

      // Obtener configuración base de la extensión
      const config = await this.getAccountConfig(recipientAccountId);

      // 🔧 Obtener asistente activo con su composición completa
      const { fluxcoreService } = await import('./fluxcore.service');
      const composition = await fluxcoreService.resolveActiveAssistant(recipientAccountId);

      const assistantModelConfig = composition?.assistant?.modelConfig || {};
      const assistantProviderRaw = typeof (assistantModelConfig as any)?.provider === 'string' ? (assistantModelConfig as any).provider : null;
      const assistantProvider = assistantProviderRaw === 'groq' || assistantProviderRaw === 'openai' ? assistantProviderRaw : null;

      const baseProviderOrder = Array.isArray(config?.providerOrder) ? config.providerOrder : [];
      const assistantProviderAvailable = assistantProvider
        ? baseProviderOrder.some((p: any) => p?.provider === assistantProvider)
        : false;

      const providerOrder = assistantProviderAvailable && assistantProvider
        ? baseProviderOrder
          .slice()
          .sort((a: any, b: any) => (a?.provider === assistantProvider ? 0 : 1) - (b?.provider === assistantProvider ? 0 : 1))
        : baseProviderOrder;

      const configWithAssistantPref = {
        ...config,
        provider: assistantProviderAvailable ? assistantProvider : config.provider,
        providerOrder,
      };

      const gated = await this.applyCreditsGating({
        accountId: recipientAccountId,
        conversationId,
        config: configWithAssistantPref,
      });

      if (!gated.config.enabled || gated.config.mode === 'off') {
        console.log('[ai-service] ❌ IA deshabilitada. enabled:', gated.config.enabled, 'mode:', gated.config.mode);
        return null;
      }
      console.log('[ai-service] ✓ IA habilitada. mode:', gated.config.mode);

      // Construir contexto
      const context = await this.buildContext(recipientAccountId, conversationId);

      console.log(`${tracePrefix} context built`, {
        messagesCount: Array.isArray((context as any)?.messages) ? (context as any).messages.length : undefined,
        elapsedMs: Date.now() - start,
      });

      // 🔧 NUEVO: Construir system prompt desde instructions del asistente
      let systemPrompt = '';
      if (composition?.instructions) {
        for (const instruction of composition.instructions) {
          systemPrompt += instruction.content + '\n\n';
        }
      }

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

      // 🔧 MODIFICADO: Actualizar configuración usando modelConfig del asistente activo
      const assistantModel = typeof (assistantModelConfig as any)?.model === 'string' ? (assistantModelConfig as any).model : null;
      const assistantTemperature = typeof (assistantModelConfig as any)?.temperature === 'number' ? (assistantModelConfig as any).temperature : null;
      const assistantTopP = typeof (assistantModelConfig as any)?.topP === 'number' ? (assistantModelConfig as any).topP : null;
      const assistantResponseFormat = typeof (assistantModelConfig as any)?.responseFormat === 'string' ? (assistantModelConfig as any).responseFormat : null;

      // 🔧 FIX CRÍTICO: Usar provider del asistente activo, NO de extension_installations
      const finalProvider = assistantProvider || gated.config.provider || 'groq';

      // Construir providerOrder con el provider del asistente primero
      let finalProviderOrder = gated.config.providerOrder || [];
      if (assistantProvider && !finalProviderOrder.some((p: any) => p.provider === assistantProvider)) {
        // Agregar provider del asistente si no está en la lista
        const newProviderEntry = {
          provider: assistantProvider,
          baseUrl: assistantProvider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.groq.com/openai/v1',
          apiKey: assistantProvider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY,
          keySource: 'env_single',
        };
        if (newProviderEntry.apiKey) {
          finalProviderOrder = [newProviderEntry, ...finalProviderOrder];
        }
      } else if (assistantProvider) {
        // Reordenar para que el provider del asistente esté primero
        finalProviderOrder = [
          ...finalProviderOrder.filter((p: any) => p.provider === assistantProvider),
          ...finalProviderOrder.filter((p: any) => p.provider !== assistantProvider),
        ];
      }

      await extension.onConfigChange(recipientAccountId, {
        enabled: gated.config.enabled,
        mode: gated.config.mode,
        responseDelay: gated.config.responseDelay,
        provider: finalProvider,  // ← USAR PROVIDER DEL ASISTENTE
        model: assistantModel || gated.config.model || 'llama-3.1-8b-instant',  // ← SIEMPRE USAR MODELO DEL ASISTENTE
        maxTokens: gated.config.maxTokens || 256,
        temperature: assistantTemperature ?? gated.config.temperature ?? 0.7,
        topP: assistantTopP ?? 1.0,
        responseFormat: assistantResponseFormat || 'text',
        timeoutMs: 15000,
        providerOrder: finalProviderOrder,  // ← USAR PROVEEDOR ORDER CORREGIDO
        systemPrompt: systemPrompt.trim() || undefined,
        tools: aiToolService.getTools(), // ← INYECTAR TOOLS DISPONIBLES
      });

      console.log('[ai-service] Config aplicada (FIX):', {
        enabled: gated.config.enabled,
        mode: gated.config.mode,
        model: assistantModel || gated.config.model,
        provider: finalProvider,
        providerOrderLength: finalProviderOrder?.length || 0,
        providerOrderProviders: finalProviderOrder?.map((p: any) => p.provider),
      });

      // ════════════════════════════════════════════════════════════════════════
      // FLUJO DIFERENCIADO: Asistentes OpenAI vs Local
      // ════════════════════════════════════════════════════════════════════════

      const assistantRuntime = composition?.assistant?.runtime;
      const assistantExternalId = composition?.assistant?.externalId;

      console.log(`${tracePrefix} assistant resolved`, {
        assistantId: composition?.assistant?.id,
        runtime: assistantRuntime,
        externalId: assistantExternalId,
        elapsedMs: Date.now() - start,
      });

      console.log('[ai-service] Assistant runtime:', assistantRuntime);
      console.log('[ai-service] Assistant externalId:', assistantExternalId);

      // Si es un asistente OpenAI con externalId, usar la API de Assistants
      if (assistantRuntime === 'openai' && assistantExternalId) {
        console.log('[ai-service] 🚀 Usando flujo de OpenAI Assistants API');

        const { runAssistantWithMessages } = await import('./openai-sync.service');

        // Construir mensajes para el thread de OpenAI
        const threadMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // Agregar mensajes del historial (context.messages)
        if (Array.isArray(context.messages)) {
          for (const msg of context.messages) {
            const role = msg.isFromMe ? 'assistant' : 'user';
            threadMessages.push({
              role,
              content: msg.content || '',
            });
          }
        }

        // Agregar el mensaje actual si no está en el historial
        const currentMsgInHistory = threadMessages.some(m =>
          m.content.includes(content) || content.includes(m.content)
        );
        if (!currentMsgInHistory) {
          threadMessages.push({
            role: 'user',
            content,
          });
        }

        // Ejecutar el asistente de OpenAI
        const result = await runAssistantWithMessages({
          assistantExternalId,
          messages: threadMessages,
          instructions: systemPrompt.trim() || undefined,
          traceId,
          accountId: recipientAccountId,
          conversationId,
        });

        console.log(`${tracePrefix} openai result`, {
          success: result.success,
          hasContent: !!result.content,
          threadId: result.threadId,
          runId: result.runId,
          error: result.error,
          elapsedMs: Date.now() - start,
        });

        if (!result.success || !result.content) {
          console.log('[ai-service] ❌ Error en OpenAI Assistants API:', result.error);
          return null;
        }

        console.log('[ai-service] ✓ Respuesta de OpenAI Assistants API recibida');

        // Crear sugerencia compatible con el formato existente
        const suggestion: AISuggestion = {
          id: crypto.randomUUID(),
          conversationId,
          content: result.content,
          generatedAt: new Date(),
          model: assistantModel || 'gpt-4o',
          provider: 'openai',
          usage: result.usage ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          } : {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          status: 'pending',
        };

        // Consumir créditos si aplica
        if (
          gated.sessionId &&
          result.usage?.totalTokens &&
          typeof result.usage.totalTokens === 'number'
        ) {
          await creditsService.consumeSessionTokens({
            sessionId: gated.sessionId,
            tokens: result.usage.totalTokens,
          });
        }

        this.suggestions.set(suggestion.id, suggestion);
        this.emitSuggestion(suggestion);

        return suggestion;
      } else {
        console.log('[ai-service] 🚫 No se puede usar OpenAI Assistants API. Razon:', {
          assistantRuntime,
          assistantExternalId,
        });
      }

      // ════════════════════════════════════════════════════════════════════════
      // FLUJO LOCAL: Usar FluxCore Extension con Chat Completions
      // ════════════════════════════════════════════════════════════════════════

      console.log('[ai-service] 📦 Usando flujo local FluxCore (Chat Completions)');
      console.log('[ai-service] Llamando extension.onMessage()...');
      const suggestion = await extension.onMessage(event, context, recipientAccountId);
      console.log('[ai-service] Resultado onMessage:', suggestion ? 'SUGERENCIA GENERADA' : 'null');

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
        this.suggestions.set(suggestion.id, suggestion);
        this.emitSuggestion(suggestion);
      }

      return suggestion;
    } catch (error: any) {
      console.error('[ai-service] ❌ ERROR en processMessage:', error.message);
      console.error('[ai-service] Stack:', error.stack);
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
            eq(extensionInstallations.extensionId, '@fluxcore/fluxcore')
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
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;
    suggestion.status = 'approved';
    return suggestion;
  }

  /**
   * Rechazar una sugerencia
   */
  rejectSuggestion(suggestionId: string): AISuggestion | null {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;
    suggestion.status = 'rejected';
    return suggestion;
  }

  /**
   * Editar y aprobar una sugerencia
   */
  editSuggestion(suggestionId: string, newContent: string): AISuggestion | null {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;
    suggestion.content = newContent;
    suggestion.status = 'edited';
    return suggestion;
  }

  /**
   * Obtener sugerencia por ID
   */
  getSuggestion(suggestionId: string): AISuggestion | null {
    return this.suggestions.get(suggestionId) || null;
  }

  /**
   * Obtener sugerencias pendientes para una conversación
   */
  getPendingSuggestions(conversationId: string): AISuggestion[] {
    return Array.from(this.suggestions.values()).filter(
      (s) => s.conversationId === conversationId && s.status === 'pending'
    );
  }

  async listTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    const extension = await this.getFluxCoreExtension();
    if (!extension || typeof extension.listTraces !== 'function') return [];
    return extension.listTraces(params as any);
  }

  async getTrace(params: { accountId: string; traceId: string }): Promise<any | null> {
    const extension = await this.getFluxCoreExtension();
    if (!extension || typeof extension.getTrace !== 'function') return null;
    return extension.getTrace(params as any);
  }

  async clearTraces(params: { accountId: string }): Promise<number> {
    const extension = await this.getFluxCoreExtension();
    if (!extension || typeof extension.clearTraces !== 'function') return 0;
    return extension.clearTraces(params as any);
  }

  async exportTraces(params: { accountId: string; conversationId?: string; limit?: number }): Promise<any[]> {
    const extension = await this.getFluxCoreExtension();
    if (
      !extension ||
      typeof extension.listTraces !== 'function' ||
      typeof extension.getTrace !== 'function'
    ) {
      return [];
    }

    const summaries = extension.listTraces(params as any) || [];
    const traces: any[] = [];

    for (const summary of summaries) {
      const detail = extension.getTrace({ accountId: params.accountId, traceId: summary.id });
      if (detail) {
        traces.push(detail);
      }
    }

    return traces;
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

  /**
   * Generar respuesta manualmente
   */
  async generateResponse(
    conversationId: string,
    recipientAccountId: string,
    lastMessageContent: string,
    options: { mode?: 'suggest' | 'auto'; triggerMessageId?: string; triggerMessageCreatedAt?: Date; traceId?: string } = {}
  ): Promise<AISuggestion | null> {
    const tracePrefix = options.traceId ? `[ai-service][${options.traceId}]` : '[ai-service]';
    const start = Date.now();

    console.log(`${tracePrefix} generateResponse start`, {
      conversationId,
      recipientAccountId,
      mode: options.mode,
      triggerMessageId: options.triggerMessageId,
    });

    const extension = await this.getFluxCoreExtension();
    if (!extension) return null;

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

    await extension.onConfigChange(recipientAccountId, {
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

    try {
      const { fluxcoreService } = await import('./fluxcore.service');
      const composition = await fluxcoreService.resolveActiveAssistant(recipientAccountId);

      const assistantRuntime = composition?.assistant?.runtime;
      const assistantExternalId = composition?.assistant?.externalId;

      if (assistantRuntime === 'openai' && assistantExternalId) {
        const assistantModelConfig = (composition?.assistant?.modelConfig as Record<string, any>) || {};
        const assistantModel = typeof assistantModelConfig.model === 'string' ? assistantModelConfig.model : null;
        const assistantMaxTokens = typeof assistantModelConfig.maxTokens === 'number'
          ? assistantModelConfig.maxTokens
          : gated.config.maxTokens || 256;
        const assistantTemperature = typeof assistantModelConfig.temperature === 'number'
          ? assistantModelConfig.temperature
          : gated.config.temperature || 0.7;

        const { runAssistantWithMessages } = await import('./openai-sync.service');

        const threadMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        if (Array.isArray((context as any)?.messages)) {
          for (const msg of (context as any).messages) {
            const role = msg.senderAccountId === recipientAccountId ? 'assistant' : 'user';

            const ts = msg.createdAt instanceof Date
              ? msg.createdAt.toISOString()
              : new Date(msg.createdAt as any).toISOString();

            const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
            const alreadyPrefixed = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s/.test(content);

            threadMessages.push({
              role,
              content: alreadyPrefixed ? content : `[${ts}] ${content}`,
            });
          }
        }

        const currentTs = event.createdAt instanceof Date
          ? event.createdAt.toISOString()
          : new Date(event.createdAt as any).toISOString();

        const currentContent = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\]\s/.test(lastMessageContent)
          ? lastMessageContent
          : `[${currentTs}] ${lastMessageContent}`;

        const currentMsgInHistory = threadMessages.some((m) =>
          m.content.includes(lastMessageContent) || lastMessageContent.includes(m.content)
        );
        let appendedCurrentMessage = false;
        if (!currentMsgInHistory) {
          threadMessages.push({
            role: 'user',
            content: currentContent,
          });
          appendedCurrentMessage = true;
        }

        const instructionIds = Array.isArray(composition?.instructions)
          ? composition!.instructions
            .map((i: any) => (typeof i?.id === 'string' ? i.id : ''))
            .filter((x: string) => typeof x === 'string' && x.trim().length > 0)
          : undefined;

        const instructionLinks = Array.isArray(composition?.instructions)
          ? composition!.instructions
            .map((i: any) => ({
              id: typeof i?.id === 'string' ? i.id : '',
              name: typeof i?.name === 'string' ? i.name : undefined,
              order: typeof i?.order === 'number' ? i.order : undefined,
              versionId: typeof i?.versionId === 'string' ? i.versionId : null,
            }))
            .filter((x: any) => typeof x?.id === 'string' && x.id.trim().length > 0)
          : undefined;

        const instructionContents = Array.isArray(composition?.instructions)
          ? composition!.instructions
            .map((i: any) => (typeof i?.content === 'string' ? i.content : ''))
            .filter((x: string) => x.trim().length > 0)
          : [];

        const vectorStoreIds = Array.isArray(composition?.vectorStores)
          ? composition!.vectorStores
            .map((vs: any) => (typeof vs?.id === 'string' ? vs.id : ''))
            .filter((x: string) => typeof x === 'string' && x.trim().length > 0)
          : undefined;

        const vectorStores = Array.isArray(composition?.vectorStores)
          ? composition!.vectorStores
            .map((vs: any) => ({
              id: typeof vs?.id === 'string' ? vs.id : '',
              name: typeof vs?.name === 'string' ? vs.name : undefined,
            }))
            .filter((x: any) => typeof x?.id === 'string' && x.id.trim().length > 0)
          : undefined;

        const toolIds = Array.isArray(composition?.tools)
          ? composition!.tools
            .map((t: any) => (typeof t?.connectionId === 'string' ? t.connectionId : (typeof t?.id === 'string' ? t.id : '')))
            .filter((x: string) => typeof x === 'string' && x.trim().length > 0)
          : undefined;

        const tools = Array.isArray(composition?.tools)
          ? composition!.tools
            .map((t: any) => ({
              id: typeof t?.connectionId === 'string' ? t.connectionId : (typeof t?.id === 'string' ? t.id : ''),
              name: typeof t?.name === 'string' ? t.name : undefined,
            }))
            .filter((x: any) => typeof x?.id === 'string' && x.id.trim().length > 0)
          : undefined;

        const assistantMeta = composition?.assistant ? {
          assistantId: composition.assistant.id,
          assistantName: typeof composition.assistant?.name === 'string' ? composition.assistant.name : undefined,
          instructionIds,
          instructionLinks,
          vectorStoreIds,
          vectorStores,
          toolIds,
          tools,
          modelConfig: composition.assistant?.modelConfig
            ? {
              provider: composition.assistant.modelConfig.provider,
              model: composition.assistant.modelConfig.model,
              temperature: composition.assistant.modelConfig.temperature,
              topP: composition.assistant.modelConfig.topP,
              responseFormat: (composition.assistant.modelConfig as any)?.responseFormat,
            }
            : undefined,
          effective: undefined as any, // Initialize for later assignment
        } : undefined;

        const traceContext = {
          ...context,
          assistantMeta,
        };

        const systemPromptSections: string[] = [];
        if (instructionContents.length > 0) {
          systemPromptSections.push(instructionContents.join('\n\n'));
        } else {
          systemPromptSections.push('Instrucciones gestionadas en OpenAI Assistants.');
        }
        systemPromptSections.push(`assistantExternalId: ${assistantExternalId}`);
        const systemPromptText = systemPromptSections.join('\n\n');

        const baseMessages = appendedCurrentMessage
          ? threadMessages.slice(0, -1)
          : [...threadMessages];
        const messagesWithCurrent = [...threadMessages];

        const requestBodyForTrace = {
          model: assistantModel || 'openai-assistant',
          messages: [
            { role: 'system', content: systemPromptText },
            ...messagesWithCurrent,
          ],
          max_tokens: assistantMaxTokens,
          temperature: assistantTemperature,
        };

        const attemptStartedAt = Date.now();
        const result = await runAssistantWithMessages({
          assistantExternalId,
          messages: threadMessages,
          traceId: options.traceId,
          accountId: recipientAccountId,
          conversationId,
        });

        const traceAttempt: any = {
          provider: 'openai',
          baseUrl: 'assistants://api.openai.com',
          keySource: 'openai_assistants_api',
          attempt: 1,
          startedAt: new Date(attemptStartedAt).toISOString(),
          durationMs: Date.now() - attemptStartedAt,
          requestBody: requestBodyForTrace,
          ok: result.success && !!result.content,
        };

        if (traceAttempt.ok && result.usage) {
          traceAttempt.response = {
            content: result.content,
            usage: {
              prompt_tokens: result.usage.promptTokens,
              completion_tokens: result.usage.completionTokens,
              total_tokens: result.usage.totalTokens,
            },
          };
        } else if (!traceAttempt.ok) {
          traceAttempt.error = {
            type: 'unknown',
            message: result.error || 'Assistant run failed',
          };
        }

        if (assistantMeta) {
          assistantMeta.effective = {
            provider: 'openai',
            baseUrl: 'assistants://api.openai.com',
            model: assistantModel || 'openai-assistant',
            maxTokens: assistantMaxTokens,
            temperature: assistantTemperature,
          };
        }

        const traceEntry = {
          id: options.traceId || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          accountId: recipientAccountId,
          conversationId,
          messageId: event.messageId,
          mode: modeForPrompt === 'auto' ? 'auto' : 'suggest',
          model: assistantModel || 'openai-assistant',
          maxTokens: assistantMaxTokens,
          temperature: assistantTemperature,
          context: traceContext,
          builtPrompt: {
            systemPrompt: systemPromptText,
            messages: baseMessages,
            messagesWithCurrent,
          },
          attempts: [traceAttempt],
          final: traceAttempt.ok && result.usage
            ? {
              provider: 'openai',
              baseUrl: 'assistants://api.openai.com',
              usage: {
                prompt_tokens: result.usage.promptTokens,
                completion_tokens: result.usage.completionTokens,
                total_tokens: result.usage.totalTokens,
              },
            }
            : undefined,
        };

        try {
          const extension = await this.getFluxCoreExtension();
          if (extension && typeof extension.recordTrace === 'function') {
            extension.recordTrace(traceEntry);
          }
        } catch (traceError) {
          console.warn('[ai-service] Failed to record OpenAI trace', traceError);
        }

        if (!result.success || !result.content) {
          return null;
        }

        const suggestion: AISuggestion = {
          id: crypto.randomUUID(),
          conversationId,
          content: result.content,
          generatedAt: new Date(),
          model: assistantModel || 'gpt-4o',
          provider: 'openai',
          usage: result.usage
            ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
            : {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
          status: 'pending',
        };

        this.suggestions.set(suggestion.id, suggestion);

        if (
          gated.sessionId &&
          suggestion.usage.totalTokens &&
          typeof suggestion.usage.totalTokens === 'number'
        ) {
          await creditsService.consumeSessionTokens({
            sessionId: gated.sessionId,
            tokens: suggestion.usage.totalTokens,
          });
        }

        return suggestion;
      }

      console.log(`${tracePrefix} fallback to local runtime`, {
        reason: assistantRuntime !== 'openai' ? 'runtime_not_openai' : 'missing_externalId',
        runtime: assistantRuntime,
        externalId: assistantExternalId,
        elapsedMs: Date.now() - start,
      });
    } catch (error: any) {
      console.warn(`${tracePrefix} Failed to resolve assistant runtime for generateResponse`, {
        message: error?.message || String(error),
        stack: error?.stack,
        elapsedMs: Date.now() - start,
      });
    }

    const suggestion = await extension.generateSuggestion(event, context, recipientAccountId);

    if (suggestion) {
      this.suggestions.set(suggestion.id, suggestion);
    }

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

  async tryCreateWelcomeConversation(params: { newAccountId: string; userName: string }): Promise<void> {
    try {
      const [installation] = await db
        .select()
        .from(extensionInstallations)
        .where(
          and(
            eq(extensionInstallations.accountId, params.newAccountId),
            eq(extensionInstallations.extensionId, '@fluxcore/fluxcore')
          )
        )
        .limit(1);

      if (!installation || installation.enabled === false) {
        return;
      }

      const [fluxcoreAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.username, this.FLUXCORE_USERNAME))
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
}

// Singleton
export const aiService = new AIService();
export default aiService;
