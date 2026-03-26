import type { CapabilityExecutionDeps } from './capability-execution.service';
import { aiTemplateService } from './ai-template.service';
import { retrievalService } from './retrieval.service';

interface CreateCapabilityDepsOptions {
  enableTemplateSend?: boolean;
  resolveVectorStoreIds?: (accountId: string) => Promise<string[] | undefined>;
}

export function createCapabilityDeps(options: CreateCapabilityDepsOptions = {}): CapabilityExecutionDeps {
  const {
    enableTemplateSend = true,
    resolveVectorStoreIds,
  } = options;

  return {
    fetchRagContext: async (accountId: string, query: string, vectorStoreIds?: string[]) => {
      let resolvedVectorStoreIds = vectorStoreIds;

      if ((!resolvedVectorStoreIds || resolvedVectorStoreIds.length === 0) && resolveVectorStoreIds) {
        resolvedVectorStoreIds = await resolveVectorStoreIds(accountId);
      }

      if (!resolvedVectorStoreIds || resolvedVectorStoreIds.length === 0) {
        return null;
      }

      const result = await retrievalService.buildContext(query, resolvedVectorStoreIds, accountId, {
        topK: 5,
        maxTokens: 2000,
      });

      return {
        ...result,
        vectorStoreIds: resolvedVectorStoreIds,
      };
    },
    listTemplates: async (accountId: string) => {
      const templates = await aiTemplateService.getAvailableTemplates(accountId);
      return templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        category: template.category,
        variables: template.variables?.map((variable: any) => variable.name) || [],
        instructions: template.aiUsageInstructions || null,
      }));
    },
    sendTemplate: async ({ accountId, conversationId, templateId, variables }) => {
      if (!enableTemplateSend) {
        return null;
      }

      const result = await aiTemplateService.sendAuthorizedTemplate({
        templateId,
        accountId,
        conversationId,
        variables,
      });

      return {
        messageId: result.messageId,
        status: result.success ? 'sent' : 'unknown',
      };
    },
  };
}
