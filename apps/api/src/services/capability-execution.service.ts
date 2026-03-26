export interface CapabilityExecutionContext {
  accountId: string;
  conversationId: string;
  userMessage: string;
  vectorStoreIds?: string[];
  authorizedTemplates?: string[];
}

import { ExecutionAction } from '../core/fluxcore-types';

export interface CapabilityExecutionResult {
  outcome: 'success' | 'not_found' | 'error';
  data?: Record<string, any>;
  actions?: ExecutionAction[];
  message?: string;
  meta?: Record<string, any>;
}

export interface CapabilityExecutionDeps {
  fetchRagContext: (accountId: string, query: string, vectorStoreIds?: string[]) => Promise<any>;
  listTemplates: (accountId: string) => Promise<Array<{ id: string; name?: string; category?: string; variables?: string[]; instructions?: string | null }>>;
  sendTemplate: (params: {
    accountId: string;
    conversationId: string;
    templateId: string;
    variables?: Record<string, string>;
  }) => Promise<{ messageId?: string; status?: string } | null>;
}

class CapabilityExecutionService {
  constructor(private readonly deps: CapabilityExecutionDeps) {}

  async executeTool(toolId: string, params: any, context: CapabilityExecutionContext): Promise<CapabilityExecutionResult> {
    try {
      switch (toolId) {
        case 'search_knowledge': {
          const query = params.query ?? context.userMessage;
          const ragResult = await this.deps.fetchRagContext(
            context.accountId,
            query,
            context.vectorStoreIds
          );

          if (!ragResult) {
            return { outcome: 'not_found', message: 'Knowledge base unavailable' };
          }

          return {
            outcome: 'success',
            data: {
              context: ragResult.context,
              sources: ragResult.sources || [],
              chunksUsed: ragResult.chunksUsed,
              totalTokens: ragResult.totalTokens,
            },
            meta: {
              ragContext: ragResult,
            },
          };
        }

        case 'send_template': {
          const templateId = params.templateId;
          if (!templateId) {
            return { outcome: 'error', message: 'templateId is required' };
          }

          if (!context.authorizedTemplates?.includes(templateId)) {
            return { outcome: 'error', message: `Template ${templateId} is not authorized` };
          }

          return {
            outcome: 'success',
            data: {
              templateId,
              status: 'queued',
            },
            actions: [
              {
                type: 'send_template',
                templateId,
                conversationId: context.conversationId,
                variables: params.variables || {},
              },
            ],
          };
        }

        case 'list_available_templates': {
          const templates = await this.deps.listTemplates(context.accountId);

          return {
            outcome: 'success',
            data: {
              templates,
            },
          };
        }

        default:
          return { outcome: 'error', message: `Unknown tool: ${toolId}` };
      }
    } catch (error: any) {
      return { outcome: 'error', message: error?.message || 'Tool execution failed' };
    }
  }
}

export const createCapabilityExecutionService = (deps: CapabilityExecutionDeps) => new CapabilityExecutionService(deps);
