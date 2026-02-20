/**
 * RuntimeConfig — Canon v8.3
 *
 * The technical configuration of the active runtime for a specific account.
 * Resolved by RuntimeConfigService from fluxcore_assistants BEFORE handleMessage.
 *
 * Distinction from PolicyContext:
 *   PolicyContext = business governance (tone, mode, windows)
 *   RuntimeConfig = technical implementation (instructions, model, provider)
 *
 * Canon §4.4: "PolicyContext governs the behaviour; RuntimeConfig specifies the implementation."
 */

import type { WorkDefinition } from './policy-context';

export interface RuntimeConfig {
    /** Runtime ID — matches the registered RuntimeAdapter */
    runtimeId: string;

    /** Account this config belongs to */
    accountId: string;

    /** The resolved assistant ID (for traceability) */
    assistantId?: string;

    /** The resolved assistant name (for traceability) */
    assistantName?: string;

    /** System instructions (for AsistentesLocal + AsistentesOpenAI) */
    instructions?: string;

    /** LLM provider (for AsistentesLocal) */
    provider?: string;

    /** LLM model name (for AsistentesLocal) */
    model?: string;

    /** LLM temperature (for AsistentesLocal) */
    temperature?: number;

    /** LLM max tokens (for AsistentesLocal) */
    maxTokens?: number;

    /** Vector store ID to use for knowledge queries (for AsistentesLocal — local pgvector) */
    vectorStoreId?: string;

    /** All vector store IDs linked to this assistant (for AsistentesLocal RAG) */
    vectorStoreIds?: string[];

    /** OpenAI Assistants API external ID, format 'asst_xxx' (for AsistentesOpenAI) */
    externalAssistantId?: string;

    /** Tool IDs authorized by the operator for this assistant */
    authorizedTools: string[];

    /** WorkDefinitions resolved for Fluxi runtime */
    workDefinitions?: WorkDefinition[];
}

/**
 * ConversationMessage — canonical semantic representation of a chat turn.
 * Used in RuntimeInput.conversationHistory.
 *
 * Canon §4.5: "The runtime receives linguistic representation of the world,
 * not raw physical evidence."
 */
export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
}
