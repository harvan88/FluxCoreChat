/**
 * AI Execution Plan — Single Source of Truth
 *
 * Resuelve TODA la información necesaria para ejecutar (o rechazar) una
 * respuesta de IA en un solo paso, antes de tocar la extensión FluxCore.
 *
 * Principios:
 *  - Una sola llamada a resolveActiveAssistant() por mensaje
 *  - Una sola decisión de elegibilidad (créditos, API keys, entitlements)
 *  - Resultado fuertemente tipado: Eligible | Blocked
 *  - Sin degradación silenciosa: si no puede ejecutar, retorna el motivo
 */

import type { AIProviderId } from './ai-entitlements.service';
import type { AssistantComposition } from './fluxcore/runtime.service';

// ─── Provider Entry ──────────────────────────────────────────────────────────

export interface ProviderEntry {
  provider: AIProviderId;
  baseUrl: string;
  apiKey: string;
  keySource?: string;
}

// ─── Block Reasons ───────────────────────────────────────────────────────────

export type BlockReason =
  | 'ai_disabled'
  | 'mode_off'
  | 'no_extension'
  | 'no_assistant'
  | 'no_api_key'
  | 'insufficient_credits'
  | 'no_providers'
  | 'entitlement_denied';

export interface BlockDetail {
  reason: BlockReason;
  /** Human-readable message (safe to show to end-user) */
  message: string;
  /** Provider that was required but unavailable */
  requiredProvider?: AIProviderId;
  /** Current credit balance when blocked by credits */
  creditBalance?: number;
}

// ─── Execution Plan (discriminated union) ────────────────────────────────────

interface ExecutionPlanBase {
  accountId: string;
  conversationId: string;
  composition: AssistantComposition | null;
}

export interface EligiblePlan extends ExecutionPlanBase {
  canExecute: true;
  composition: AssistantComposition;

  /** Resolved runtime: 'openai' (Assistants API) or 'local' (FluxCore extension) */
  runtime: 'openai' | 'local';

  /** Provider to use (from assistant.modelConfig) */
  provider: AIProviderId;
  /** Model to use */
  model: string;
  /** Temperature override from assistant */
  temperature: number;
  /** TopP override from assistant */
  topP: number;
  /** Response format */
  responseFormat: 'text' | 'json';
  /** Max tokens */
  maxTokens: number;

  /** Ordered list of providers with credentials — ready to pass to extension */
  providerOrder: ProviderEntry[];

  /** Extension config fields */
  mode: 'suggest' | 'auto' | 'off';
  responseDelay: number;

  /** Credits session (if OpenAI and session was opened/found) */
  creditsSessionId: string | null;

  /** OpenAI Assistants API specific */
  externalId: string | null;
}

export interface BlockedPlan extends ExecutionPlanBase {
  canExecute: false;
  block: BlockDetail;
}

export type ExecutionPlan = EligiblePlan | BlockedPlan;

// ─── Generate Response Result ────────────────────────────────────────────────

export interface GenerateResponseSuccess {
  ok: true;
  suggestion: {
    id: string;
    conversationId: string;
    content: string;
    generatedAt: Date;
    model: string;
    provider?: 'groq' | 'openai';
    baseUrl?: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    status: 'pending' | 'approved' | 'rejected' | 'edited';
  };
}

export interface GenerateResponseBlocked {
  ok: false;
  block: BlockDetail;
}

export interface GenerateResponseEmpty {
  ok: true;
  suggestion: null;
}

export type GenerateResponseResult =
  | GenerateResponseSuccess
  | GenerateResponseBlocked
  | GenerateResponseEmpty;
