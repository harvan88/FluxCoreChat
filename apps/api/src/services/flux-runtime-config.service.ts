/**
 * RuntimeConfigService — Canon v8.3
 *
 * Resolves the technical RuntimeConfig for a given (account, runtimeId).
 * Called by CognitiveDispatcher AFTER resolving PolicyContext, BEFORE invoking RuntimeGateway.
 *
 * Canon §4.4: "PolicyContext governs the behaviour; RuntimeConfig specifies the implementation."
 *
 * Source of truth: fluxcore_assistants (active assistant for the account).
 */

import { db, fluxcoreAssistants, fluxcoreAssistantInstructions, fluxcoreInstructions, fluxcoreInstructionVersions, accountRuntimeConfig, fluxcoreWorkDefinitions, fluxcoreAssistantVectorStores } from '@fluxcore/db';
import { eq, and, asc, desc, or } from 'drizzle-orm';
import type { RuntimeConfig, WorkDefinition } from '@fluxcore/db';

class RuntimeConfigService {

    /**
     * Resolve the RuntimeConfig for an account.
     * Reads the active (production) assistant for the account.
     * Falls back to safe defaults if no assistant is configured.
     */
    async resolve(params: {
        accountId: string;
        runtimeId: string;
        conversationId?: string;
    }): Promise<RuntimeConfig> {
        const { accountId, runtimeId, conversationId } = params;

        try {
            // Find the preferred or production assistant
            const assistantId = await this.resolveAssistantId(accountId);

            if (!assistantId) {
                return this.defaultConfig(accountId, runtimeId);
            }

            // Fetch assistant config
            const [assistant] = await db
                .select()
                .from(fluxcoreAssistants)
                .where(eq(fluxcoreAssistants.id, assistantId))
                .limit(1);

            if (!assistant) {
                return this.defaultConfig(accountId, runtimeId);
            }

            const modelCfg = assistant.modelConfig as any;

            // Fetch linked instructions
            const instructionRows = await db
                .select({ content: fluxcoreInstructionVersions.content, order: fluxcoreAssistantInstructions.order })
                .from(fluxcoreAssistantInstructions)
                .innerJoin(fluxcoreInstructions, eq(fluxcoreAssistantInstructions.instructionId, fluxcoreInstructions.id))
                .leftJoin(fluxcoreInstructionVersions, eq(fluxcoreInstructionVersions.id, fluxcoreInstructions.currentVersionId))
                .where(and(
                    eq(fluxcoreAssistantInstructions.assistantId, assistantId),
                    eq(fluxcoreAssistantInstructions.isEnabled, true)
                ))
                .orderBy(asc(fluxcoreAssistantInstructions.order));

            const instructions = instructionRows
                .map(r => r.content || '')
                .filter(Boolean)
                .join('\n\n---\n\n');

            // Map runtime column to runtimeId
            const resolvedRuntimeId = this.mapRuntimeToId(assistant.runtime, modelCfg);

            // Determine externalAssistantId for AsistentesOpenAI
            const externalAssistantId = (
                resolvedRuntimeId === 'asistentes-openai' &&
                assistant.externalId
            ) ? assistant.externalId : undefined;

            // WorkDefinitions for Fluxi
            const workDefinitions = resolvedRuntimeId === 'fluxi-runtime'
                ? await this.resolveWorkDefinitions(accountId)
                : undefined;

            // VectorStoreIds for AsistentesLocal RAG
            const vectorStoreIds = resolvedRuntimeId === 'asistentes-local'
                ? await this.resolveVectorStoreIds(assistantId)
                : undefined;

            const instructionCount = instructionRows.filter(r => r.content).length;
            console.log(`[RuntimeConfig] 🤖 Resolved assistant=${assistantId.slice(0,8)} name="${assistant.name}" ${resolvedRuntimeId} ${modelCfg?.provider ?? 'groq'}/${modelCfg?.model ?? 'llama-3.1-8b-instant'} instructions=${instructionCount} rag=${vectorStoreIds?.length ?? 0}`);

            return {
                runtimeId: resolvedRuntimeId,
                accountId,
                assistantId,
                assistantName: assistant.name,
                instructions: instructions || undefined,
                provider: modelCfg?.provider || 'groq',
                model: modelCfg?.model || 'llama-3.1-8b-instant',
                temperature: typeof modelCfg?.temperature === 'number' ? modelCfg.temperature : 0.7,
                maxTokens: typeof modelCfg?.maxTokens === 'number' ? modelCfg.maxTokens : 1024,
                externalAssistantId,
                vectorStoreIds,
                authorizedTools: [],
                workDefinitions,
            };

        } catch (error) {
            console.warn('[RuntimeConfigService] Failed to resolve config, using defaults:', error);
            return this.defaultConfig(accountId, runtimeId);
        }
    }

    private async resolveAssistantId(accountId: string): Promise<string | null> {
        // Check accountRuntimeConfig for preferred assistant
        const [runtimeCfg] = await db
            .select()
            .from(accountRuntimeConfig)
            .where(eq(accountRuntimeConfig.accountId, accountId))
            .limit(1);

        const preferredId = (runtimeCfg?.config as any)?.preferredAssistantId as string | undefined;
        if (preferredId) return preferredId;

        // Fallback: find production or active assistant (prefer production, then active)
        const [prodAssistant] = await db
            .select({ id: fluxcoreAssistants.id })
            .from(fluxcoreAssistants)
            .where(and(
                eq(fluxcoreAssistants.accountId, accountId),
                or(eq(fluxcoreAssistants.status, 'production'), eq(fluxcoreAssistants.status, 'active'))
            ))
            .orderBy(desc(fluxcoreAssistants.updatedAt))
            .limit(1);

        return prodAssistant?.id || null;
    }

    private async resolveVectorStoreIds(assistantId: string): Promise<string[]> {
        try {
            const rows = await db
                .select({ vectorStoreId: fluxcoreAssistantVectorStores.vectorStoreId })
                .from(fluxcoreAssistantVectorStores)
                .where(eq(fluxcoreAssistantVectorStores.assistantId, assistantId));
            return rows.map(r => r.vectorStoreId).filter(Boolean) as string[];
        } catch {
            return [];
        }
    }

    private async resolveWorkDefinitions(accountId: string): Promise<WorkDefinition[]> {
        try {
            const rows = await db
                .select({
                    id: fluxcoreWorkDefinitions.id,
                    typeId: fluxcoreWorkDefinitions.typeId,
                    version: fluxcoreWorkDefinitions.version,
                    definitionJson: fluxcoreWorkDefinitions.definitionJson,
                })
                .from(fluxcoreWorkDefinitions)
                .where(eq(fluxcoreWorkDefinitions.accountId, accountId))
                .orderBy(desc(fluxcoreWorkDefinitions.createdAt))
                .limit(20);

            return rows;
        } catch {
            return [];
        }
    }

    /**
     * Maps the assistant.runtime column value to a registered RuntimeAdapter ID.
     * Canon: activeRuntimeId names a registered adapter, never an LLM vendor.
     */
    private mapRuntimeToId(runtime: string, modelCfg: any): string {
        if (runtime === 'openai') {
            // Check if it's using Assistants API (externalId format asst_xxx) or completions
            return 'asistentes-openai';
        }
        if (runtime === 'fluxi') {
            return 'fluxi-runtime';
        }
        return 'asistentes-local';
    }

    private defaultConfig(accountId: string, runtimeId: string): RuntimeConfig {
        return {
            runtimeId: runtimeId || 'asistentes-local',
            accountId,
            provider: 'groq',
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            maxTokens: 1024,
            authorizedTools: [],
        };
    }
}

export const runtimeConfigService = new RuntimeConfigService();
