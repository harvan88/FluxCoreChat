/**
 * FluxPolicyContext — Shared Pre-Runtime Context
 * 
 * Canon v7.0, Section 3: La Capa de Políticas (Pre-Ejecución)
 * 
 * This is the contract that FluxCore resolves BEFORE invoking any runtime.
 * All runtimes receive this immutable context. None of them resolve it themselves.
 * 
 * Named "Flux" to avoid collision with asset-policies.ts PolicyContext.
 * 
 * Ownership: FluxCore (persisted via ChatCore's Configuration Slots).
 * Source of truth: extension_installations.config for @fluxcore/asistentes + account_runtime_config.
 */

/**
 * Attention preferences — how the AI should communicate.
 * These belong to FluxCore, not ChatCore (ontological test: they wouldn't exist without AI).
 */
export interface FluxAttentionPreferences {
    /** Communication tone: "formal", "casual", "friendly" */
    tone: 'formal' | 'casual' | 'friendly';

    /** Formality level for addressing the user */
    formality: 'usted' | 'tú' | 'vos';

    /** Whether to use emojis in responses */
    useEmojis: boolean;

    /** Preferred language for responses */
    language: string;
}

/**
 * Automation policies — how the system should behave operationally.
 */
export interface FluxAutomationPolicies {
    /** The automation mode for this account+relationship */
    mode: 'automatic' | 'supervised' | 'disabled';

    /** Delay before auto-responding (seconds) */
    responseDelaySeconds: number;
}

/**
 * Contact context — data about the specific relationship/contact.
 * Notes come from ChatCore (CRM data), rules come from FluxCore (AI behavior).
 */
export interface FluxContactContext {
    /** CRM notes about the contact (from ChatCore's relationship.context) */
    notes: string[];

    /** Contact preferences (from ChatCore's relationship.context) */
    preferences: string[];

    /** AI behavior rules for this contact (from FluxCore config) */
    rules: string[];
}

/**
 * Business identity — who is responding.
 * Read from ChatCore's account profile.
 */
export interface FluxBusinessIdentity {
    /** Account display name */
    displayName: string;

    /** Account bio/description */
    bio?: string;

    /** Account username */
    username: string;
}

/**
 * FluxPolicyContext — the complete pre-runtime context.
 * 
 * Resolved once per message by FluxPolicyContextService.
 * Passed to every runtime as immutable input.
 */
export interface FluxPolicyContext {
    /** Attention preferences (tone, emojis, formality) */
    attention: FluxAttentionPreferences;

    /** Automation policies (mode, delay) */
    automation: FluxAutomationPolicies;

    /** Contact-specific context (notes, preferences, rules) */
    contact: FluxContactContext;

    /** Business identity (who is responding) */
    business: FluxBusinessIdentity;

    /** Which runtime should process this message */
    activeRuntimeId: string;

    /** Timestamp when this context was resolved */
    resolvedAt: Date;
}

/**
 * Default attention preferences when none are configured.
 */
export const FLUX_DEFAULT_ATTENTION: FluxAttentionPreferences = {
    tone: 'friendly',
    formality: 'tú',
    useEmojis: false,
    language: 'es',
};
