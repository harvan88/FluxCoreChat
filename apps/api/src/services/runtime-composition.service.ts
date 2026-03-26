import type { RuntimeConfig } from '@fluxcore/db';
import { resolveExecutionPlan } from './ai-execution-plan.service';
import { createFluxiRuntimeConfig } from './fluxcore/fluxi-dependency-injection';
import { resolveActiveAssistant } from './fluxcore/runtime.service';
import { workDefinitionService } from './work-definition.service';
import type { RuntimeSelection } from './runtime-selection.service';

export interface RuntimeCompositionResult {
    runtimeId: string;
    runtimeConfig: RuntimeConfig;
}

class RuntimeCompositionService {
    async resolve(params: {
        accountId: string;
        conversationId: string;
        selection: RuntimeSelection;
    }): Promise<RuntimeCompositionResult> {
        const { accountId, conversationId, selection } = params;

        if (selection.strategy === 'fluxi') {
            const runtimeId = '@fluxcore/fluxi';
            const workDefinitions = await workDefinitionService.listLatest(accountId);
            return {
                runtimeId,
                runtimeConfig: {
                    runtimeId,
                    accountId,
                    provider: 'fluxi',
                    model: 'fluxi',
                    authorizedTools: [],
                    ...createFluxiRuntimeConfig(accountId),
                    workDefinitions,
                } as RuntimeConfig,
            };
        }

        let executionPlan: Awaited<ReturnType<typeof resolveExecutionPlan>> | null = null;
        try {
            executionPlan = await resolveExecutionPlan(accountId, conversationId);
        } catch (error) {
            console.warn('[RuntimeCompositionService] Could not resolve execution plan:', error);
        }

        const composition = executionPlan?.composition ?? await resolveActiveAssistant(accountId);
        const assistant = composition?.assistant;
        const modelConfig = (assistant?.modelConfig as Record<string, any> | undefined) ?? {};

        const runtimeId = assistant?.runtime === 'openai'
            ? 'asistentes-openai'
            : 'asistentes-local';

        const instructions = composition?.instructions
            ?.map((instruction) => instruction.content)
            .filter(Boolean)
            .join('\n\n---\n\n') || undefined;

        const vectorStoreIds = composition?.vectorStores?.map((store) => store.id).filter(Boolean) || [];
        const authorizedTools = composition?.tools?.map((tool) => tool.id).filter(Boolean) || [];

        const runtimeConfig: RuntimeConfig = {
            runtimeId,
            accountId,
            assistantId: assistant?.id,
            assistantName: assistant?.name,
            instructions,
            provider: typeof modelConfig.provider === 'string' ? modelConfig.provider : 'groq',
            model: typeof modelConfig.model === 'string' ? modelConfig.model : 'llama-3.1-8b-instant',
            temperature: typeof modelConfig.temperature === 'number' ? modelConfig.temperature : 0.7,
            maxTokens: typeof modelConfig.maxTokens === 'number' ? modelConfig.maxTokens : 1024,
            vectorStoreId: vectorStoreIds[0],
            vectorStoreIds,
            externalAssistantId: runtimeId === 'asistentes-openai' ? assistant?.externalId ?? undefined : undefined,
            authorizedTools,
        };

        if (executionPlan?.canExecute) {
            runtimeConfig.provider = executionPlan.provider;
            runtimeConfig.model = executionPlan.model;
            runtimeConfig.temperature = executionPlan.temperature;
            runtimeConfig.maxTokens = executionPlan.maxTokens;
        }

        return {
            runtimeId,
            runtimeConfig,
        };
    }
}

export const runtimeCompositionService = new RuntimeCompositionService();
