/**
 * FluxCore v8.2 — Core Cognition Types
 * 
 * These types define the contracts between all cognition-layer components.
 * Every runtime, dispatcher, and executor speaks this language.
 * 
 * Canon §4: "Runtimes are sovereign — they receive context and return actions."
 */

import type { FluxPolicyContext } from '@fluxcore/db';
import type { RuntimeConfig, ConversationMessage } from '@fluxcore/db';

// ---------------------------------------------------------------------------
// Execution Actions — The Runtime's Only Output
// ---------------------------------------------------------------------------

/**
 * ExecutionAction — what a Runtime is allowed to return.
 * 
 * Canon Invariant #19: Runtimes NEVER execute effects directly.
 * They return declarative actions that the ActionExecutor mediates.
 */
export type ExecutionAction =
    // Basic conversational actions
    | SendMessageAction
    | SendTemplateAction
    | StartTypingAction
    | NoAction
    // Fluxi/WES transactional actions (H4)
    | ProposeWorkAction
    | OpenWorkAction
    | AdvanceWorkStateAction
    | RequestSlotAction
    | CloseWorkAction
    ;

export interface SendMessageAction {
    type: 'send_message';
    content: string;
    conversationId: string;
}

export interface SendTemplateAction {
    type: 'send_template';
    templateId: string;
    conversationId: string;
    variables?: Record<string, string>;
}

export interface StartTypingAction {
    type: 'start_typing';
    conversationId: string;
}

export interface NoAction {
    type: 'no_action';
    reason: string;
}

// ---------------------------------------------------------------------------
// Fluxi/WES Actions — H4: Transactional Runtime
// ---------------------------------------------------------------------------

export interface CandidateSlot {
    path: string;
    value: any;
    evidence: { text: string; confidence?: number };
}

/** Runtime detected transactional intent — ask ActionExecutor to persist a ProposedWork */
export interface ProposeWorkAction {
    type: 'propose_work';
    conversationId: string;
    workDefinitionId: string;
    intent: string;
    candidateSlots: CandidateSlot[];
    confidence: number;
    /** Human-readable message to send while proposal is being evaluated */
    replyMessage?: string;
}

/** Gate passed — ask ActionExecutor to open the Work from the ProposedWork */
export interface OpenWorkAction {
    type: 'open_work';
    conversationId: string;
    proposedWorkId: string;
    /** Human-readable confirmation message to send */
    replyMessage?: string;
}

/** Ingest new slot values into an active Work */
export interface AdvanceWorkStateAction {
    type: 'advance_work_state';
    conversationId: string;
    workId: string;
    slots: CandidateSlot[];
    /** Optional message to send after advancing */
    replyMessage?: string;
}

/** Ask user to confirm a slot value via SemanticContext */
export interface RequestSlotAction {
    type: 'request_slot';
    conversationId: string;
    workId: string;
    slotPath: string;
    proposedValue: any;
    /** The question to ask the user */
    questionMessage: string;
}

/** Work completed or abandoned */
export interface CloseWorkAction {
    type: 'close_work';
    conversationId: string;
    workId: string;
    resolution: 'completed' | 'cancelled' | 'failed';
    /** Final message to send to the user */
    replyMessage?: string;
}

// ---------------------------------------------------------------------------
// Runtime Contract — The Interface All Runtimes Must Implement
// ---------------------------------------------------------------------------

/**
 * RuntimeInput — the complete, pre-resolved context a Runtime receives.
 *
 * Canon v8.3 §4.5:
 *   - policyContext: business governance (tone, mode, windows, resolvedBusinessProfile)
 *   - runtimeConfig: technical implementation (instructions, model, provider)
 *   - conversationHistory: semantic message history (role/content only, no raw evidence)
 *
 * The CognitionWorker builds this BEFORE invoking the runtime.
 * The runtime NEVER reads from the database. Everything arrives here.
 */
export interface RuntimeInput {
    /** Business governance policy resolved for this account + contact */
    policyContext: FluxPolicyContext;

    /** Technical configuration of the active runtime for this account */
    runtimeConfig: RuntimeConfig;

    /**
     * Full conversation history in semantic form.
     * Built from `messages` table by the CognitionWorker.
     * Does NOT include raw signal evidence.
     */
    conversationHistory: ConversationMessage[];
}

/**
 * RuntimeAdapter — the contract every runtime must fulfill.
 *
 * Canon v8.3 Invariant 10:
 *   "Ningún runtime consulta bases de datos durante handleMessage.
 *    Todo llega en RuntimeInput."
 */
export interface RuntimeAdapter {
    /** Unique identifier for this runtime (must match RuntimeConfig.runtimeId) */
    readonly runtimeId: string;

    /** Human-readable name for logging/UI */
    readonly displayName: string;

    /**
     * Process a conversational turn and return declarative actions.
     *
     * @param input - Complete pre-resolved context. No DB access allowed inside.
     * @returns Array of ExecutionAction[] for ActionExecutor to mediate.
     */
    handleMessage(input: RuntimeInput): Promise<ExecutionAction[]>;
}
