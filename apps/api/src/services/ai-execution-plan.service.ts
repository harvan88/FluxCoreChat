/**
 * AI Execution Plan Service
 *
 * Single entry point that resolves everything needed to execute (or reject)
 * an AI response. Called once per message, before any AI logic runs.
 *
 * Replaces the scattered logic previously in:
 *  - aiService.getAccountConfig()
 *  - aiService.applyCreditsGating()
 *  - aiService.generateResponse() (provider resolution)
 *  - aiService.processMessage() (provider resolution)
 */

import { db, extensionInstallations } from '@fluxcore/db';
import { and, eq } from 'drizzle-orm';
import { aiEntitlementsService, type AIProviderId } from './ai-entitlements.service';
import { creditsService } from './credits.service';
import type {
  ExecutionPlan,
  EligiblePlan,
  BlockedPlan,
  ProviderEntry,
  BlockReason,
} from './ai-execution-plan';

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_SESSION_FEATURE_KEY = 'ai.session';
const OPENAI_ENGINE = 'openai_chat';

const PROVIDER_BASE_URLS: Record<AIProviderId, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1',
};

const PROVIDER_ENV_KEYS: Record<AIProviderId, { single: string; pool: string }> = {
  groq: { single: 'GROQ_API_KEY', pool: 'GROQ_API_KEYS' },
  openai: { single: 'OPENAI_API_KEY', pool: 'OPENAI_API_KEYS' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getKeysForProvider(provider: AIProviderId): Array<{ apiKey: string; keySource: string }> {
  const envDef = PROVIDER_ENV_KEYS[provider];
  const poolVar = process.env[envDef.pool];
  const singleVar = process.env[envDef.single];

  const pool = (poolVar || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .map((apiKey, idx) => ({ apiKey, keySource: `env_pool_${idx + 1}` }));

  const single =
    typeof singleVar === 'string' && singleVar.trim().length > 0
      ? [{ apiKey: singleVar.trim(), keySource: 'env_single' }]
      : [];

  return [...pool, ...single];
}

function buildProviderOrder(allowedProviders: AIProviderId[], preferredProvider: AIProviderId | null): ProviderEntry[] {
  const ordered = preferredProvider
    ? [preferredProvider, ...allowedProviders.filter((p) => p !== preferredProvider)]
    : [...allowedProviders];

  const entries: ProviderEntry[] = [];
  for (const provider of ordered) {
    const keys = getKeysForProvider(provider);
    for (const key of keys) {
      entries.push({
        provider,
        baseUrl: PROVIDER_BASE_URLS[provider],
        apiKey: key.apiKey,
        keySource: key.keySource,
      });
    }
  }
  return entries;
}

function blocked(
  accountId: string,
  conversationId: string,
  reason: BlockReason,
  message: string,
  extra?: Partial<Pick<import('./ai-execution-plan').BlockDetail, 'requiredProvider' | 'creditBalance'>>,
  composition?: import('./ai-execution-plan').EligiblePlan['composition'] | null,
): BlockedPlan {
  return {
    canExecute: false,
    accountId,
    conversationId,
    composition: composition ?? null,
    block: { reason, message, ...extra },
  };
}

// ─── Main resolver ───────────────────────────────────────────────────────────

export async function resolveExecutionPlan(
  accountId: string,
  conversationId: string,
): Promise<ExecutionPlan> {
  // 1. Resolve active assistant (SINGLE call — no more duplicates)
  const { resolveActiveAssistant } = await import('./fluxcore.service');
  const composition = await resolveActiveAssistant(accountId);

  if (!composition?.assistant) {
    return blocked(accountId, conversationId, 'no_assistant', 'No hay asistente activo configurado para esta cuenta.');
  }

  // 2. Read extension installation config (mode, enabled)
  const [installation] = await db
    .select()
    .from(extensionInstallations)
    .where(
      and(
        eq(extensionInstallations.accountId, accountId),
        eq(extensionInstallations.extensionId, '@fluxcore/asistentes'),
      ),
    )
    .limit(1);

  const cfg = (installation?.config || {}) as Record<string, any>;
  const extensionEnabled = installation ? installation.enabled !== false && cfg.enabled !== false : false;

  if (!extensionEnabled) {
    return blocked(accountId, conversationId, 'ai_disabled', 'La extensión de IA está deshabilitada para esta cuenta.', undefined, composition);
  }

  const mode = (cfg.mode as 'suggest' | 'auto' | 'off') || 'suggest';
  if (mode === 'off') {
    return blocked(accountId, conversationId, 'mode_off', 'El modo de IA está desactivado.', undefined, composition);
  }

  // 3. Extract assistant model config
  const mc = (composition.assistant.modelConfig as Record<string, any>) || {};
  const tc = (composition.assistant.timingConfig as Record<string, any>) || {};

  const assistantProvider: AIProviderId | null =
    mc.provider === 'groq' || mc.provider === 'openai' ? (mc.provider as AIProviderId) : null;
  const assistantModel = typeof mc.model === 'string' ? mc.model : 'llama-3.1-8b-instant';
  const temperature = typeof mc.temperature === 'number' ? mc.temperature : 0.7;
  const topP = typeof mc.topP === 'number' ? mc.topP : 1.0;
  const responseFormat = mc.responseFormat === 'json' ? 'json' as const : 'text' as const;
  const maxTokens = typeof mc.maxTokens === 'number' ? mc.maxTokens : 256;
  const responseDelay = typeof tc.responseDelaySeconds === 'number' ? tc.responseDelaySeconds : 2;

  // 4. Resolve entitlements & allowed providers
  const entitlement = await aiEntitlementsService.getEntitlement(accountId);
  const allProviders: AIProviderId[] = ['groq', 'openai'];
  const allowedProviders = (entitlement?.allowedProviders ?? allProviders)
    .filter((p) => getKeysForProvider(p).length > 0);

  if (allowedProviders.length === 0) {
    return blocked(accountId, conversationId, 'no_providers', 'No hay providers de IA configurados (faltan API keys).', undefined, composition);
  }

  // 5. Determine effective provider
  const effectiveProvider: AIProviderId = assistantProvider && allowedProviders.includes(assistantProvider)
    ? assistantProvider
    : allowedProviders[0];

  // 6. Check if assistant requires a provider that has no API key
  if (assistantProvider && !allowedProviders.includes(assistantProvider)) {
    const assistantName = composition.assistant.name || composition.assistant.id;
    return blocked(
      accountId,
      conversationId,
      'no_api_key',
      `El asistente "${assistantName}" requiere el provider ${assistantProvider}, pero no hay API key configurada.`,
      { requiredProvider: assistantProvider },
      composition,
    );
  }

  // 7. Credits gating (only for OpenAI)
  let creditsSessionId: string | null = null;

  if (effectiveProvider === 'openai') {
    try {
      // Check for existing active session
      const activeSession = await creditsService.getActiveConversationSession({
        accountId,
        conversationId,
        featureKey: AI_SESSION_FEATURE_KEY,
      });

      if (activeSession) {
        creditsSessionId = activeSession.id;
      } else {
        // Try to open a new session (deducts credits)
        const opened = await creditsService.openConversationSession({
          accountId,
          conversationId,
          featureKey: AI_SESSION_FEATURE_KEY,
          engine: OPENAI_ENGINE,
          model: assistantModel,
        });
        creditsSessionId = opened.session.id;
      }
    } catch (error: any) {
      const msg = error?.message || '';
      const balance = await creditsService.getBalance(accountId).catch(() => 0);
      const assistantName = composition.assistant.name || composition.assistant.id;

      if (msg.includes('Insufficient credits')) {
        return blocked(
          accountId,
          conversationId,
          'insufficient_credits',
          `El asistente "${assistantName}" usa OpenAI y no tenés créditos suficientes (balance: ${balance}).`,
          { requiredProvider: 'openai', creditBalance: balance },
          composition,
        );
      }

      // Special handling for FK violation which indicates a sync/integrity issue
      if (msg.includes('foreign key constraint') && msg.includes('conversation')) {
        console.error('[execution-plan] Critical Integrity Error: Conversation not found for credits session', { conversationId, accountId });
        return blocked(
          accountId,
          conversationId,
          'ai_disabled',
          `IA no disponible temporalmente por error de integridad (Conversación).`,
          undefined,
          composition
        );
      }

      // Unexpected system/DB error — block with diagnostic info
      console.error('[execution-plan] Credits gating error:', msg);
      return blocked(
        accountId,
        conversationId,
        'ai_disabled',
        `Error al verificar créditos para "${assistantName}". Por favor, contacte a soporte.`,
        undefined,
        composition,
      );
    }
  }

  // 8. Build provider order with credentials
  const providerOrder = buildProviderOrder(allowedProviders, effectiveProvider);

  if (providerOrder.length === 0) {
    return blocked(accountId, conversationId, 'no_providers', 'No hay providers con API keys válidas.', undefined, composition);
  }

  // 9. Determine runtime
  const runtime: 'openai' | 'local' =
    composition.assistant.runtime === 'openai' && composition.assistant.externalId
      ? 'openai'
      : 'local';

  // 10. Build eligible plan
  const plan: EligiblePlan = {
    canExecute: true,
    accountId,
    conversationId,
    composition,
    runtime,
    provider: effectiveProvider,
    model: assistantModel,
    temperature,
    topP,
    responseFormat,
    maxTokens,
    providerOrder,
    mode,
    responseDelay,
    creditsSessionId,
    externalId: composition.assistant.externalId || null,
  };

  return plan;
}
