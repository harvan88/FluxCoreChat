/**
 * FluxPolicyContext — Canon v8.3
 *
 * Business governance context resolved BEFORE any runtime is invoked.
 * Flat structure — no nested sub-objects.
 *
 * Distinction from RuntimeConfig (Canon §4.4):
 *   PolicyContext  = HOW and WHEN the AI operates (business governance)
 *   RuntimeConfig  = WHAT the runtime uses to execute (technical implementation)
 *
 * The CognitionWorker resolves both before calling RuntimeGateway.
 * Neither the runtime nor PolicyContext know about each other's internals.
 */

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/** A rule, note, or preference about the specific contact/relationship */
export interface ContactRule {
    type: 'note' | 'preference' | 'rule';
    content: string;
}

/** Policy for when the business is outside operating hours */
export interface OffHoursPolicy {
    action: 'ignore' | 'reply_once' | 'queue';
    message?: string;
}

/** Business profile data authorized by the operator for AI use */
export interface ResolvedBusinessProfile {
    displayName?: string;
    bio?: string;
    privateContext?: string;
    businessHours?: Array<{
        days: string[];
        open: string;
        close: string;
    }>;
    location?: string;
    website?: string;
    timezone?: string;
    avatarUrl?: string;
    /** Authorized templates available for this account */
    templates?: Array<{
        templateId: string;
        name: string;
        instructions?: string;
        variables: Array<{ name: string; required?: boolean }>;
        content?: string;
    }>;
    /** Authorized appointment services */
    appointmentServices?: Array<{
        name: string;
        description?: string;
        price?: string;
    }>;
    [key: string]: unknown;
}

/** Active Work state for this conversation (Fluxi) */
export interface ActiveWorkContext {
    workId: string;
    state: string;
    typeId: string;
}

/** WorkDefinition — a transactional intent template (Fluxi) */
export interface WorkDefinition {
    id: string;
    typeId: string;
    version: string;
    definitionJson: any;
}

// ---------------------------------------------------------------------------
// FluxPolicyContext — flat, canonical
// ---------------------------------------------------------------------------

/**
 * FluxPolicyContext — resolved once per turn by FluxPolicyContextService.
 * Passed to every runtime as part of RuntimeInput.
 * IMMUTABLE for the lifetime of a single turn invocation.
 */
export interface FluxPolicyContext {
    // ── Identity (structural — resolved by CognitionWorker) ──────────────────
    accountId: string;
    contactId: string;
    conversationId: string;
    channel: string;

    // ── Automation — if and how the AI should respond ─────────────────────────
    mode: 'auto' | 'suggest' | 'off';
    responseDelayMs: number;

    // ── Turn window ───────────────────────────────────────────────────────────
    turnWindowMs: number;
    turnWindowTypingMs: number;
    turnWindowMaxMs: number;

    // ── Business rules ────────────────────────────────────────────────────────
    offHoursPolicy: OffHoursPolicy;
    contactRules: ContactRule[];

    // ── Runtime ───────────────────────────────────────────────────────────────
    /** ID of the registered RuntimeAdapter to invoke */
    activeRuntimeId: string;

    /** Template IDs authorized at the policy level */
    authorizedTemplates: string[];

    // ── Resolved business data (authorized by operator in fluxcore_assistants) ─
    /** Only contains fields the operator authorized in authorized_data_scopes */
    resolvedBusinessProfile: ResolvedBusinessProfile;

    // ── Fluxi (optional — only populated when Fluxi runtime is active) ────────
    activeWork?: ActiveWorkContext;
    workDefinitions?: WorkDefinition[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const FLUX_DEFAULT_POLICY: Omit<FluxPolicyContext, 'accountId' | 'contactId' | 'conversationId' | 'channel' | 'resolvedBusinessProfile'> = {
    mode: 'auto',
    responseDelayMs: 0,
    turnWindowMs: 3000,
    turnWindowTypingMs: 5000,
    turnWindowMaxMs: 60000,
    offHoursPolicy: { action: 'ignore' },
    contactRules: [],
    activeRuntimeId: 'asistentes-local',
    authorizedTemplates: [],
};
