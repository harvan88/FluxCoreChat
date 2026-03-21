/**
 * ToolRegistry — FluxCore v8.3
 *
 * Canon §4.15: Tool Sovereignty & Service Architecture
 *
 * Registro centralizado de herramientas para todos los runtimes.
 * Migrado desde extensions/fluxcore-asistentes para centralización.
 */

import type { LLMTool } from '../services/fluxcore/llm-client.service';

export interface ToolOfferContext {
  hasKnowledgeBase: boolean;
  hasTemplatesTool: boolean;
  // Extensible para futuras herramientas
  hasCalendar?: boolean;
  hasCRM?: boolean;
  hasEmail?: boolean;
}

export interface ToolExecutionContext {
  accountId: string;
  conversationId: string;
  userMessage: string;
  vectorStoreIds?: string[];
  authorizedTemplates?: string[];
}

export interface ToolExecutionResult {
  outcome: 'success' | 'not_found' | 'error';
  data?: Record<string, any>;
  message?: string;
}

export interface ToolExecutionResponse {
  name: string;
  result: ToolExecutionResult;
  content: string;
  parsedArgs?: any;
}

export interface ToolRegistryDeps {
  fetchRagContext: (accountId: string, query: string, vectorStoreIds?: string[]) => Promise<any>;
  listTemplates: (accountId: string) => Promise<Array<{ id: string; name?: string; category?: string; variables?: string[]; instructions?: string | null }>>;
  sendTemplate: (params: {
    accountId: string;
    conversationId: string;
    templateId: string;
    variables?: Record<string, string>;
  }) => Promise<{ messageId?: string; status?: string } | null>;
}

// Definiciones de herramientas (migradas desde extensión)
const SEARCH_KNOWLEDGE_TOOL: LLMTool = {
  type: 'function',
  function: {
    name: 'search_knowledge',
    description: 'Search the knowledge base for relevant information to answer the user\'s question. Use this when the user asks something that may be in the business\'s documentation, catalog, or FAQs.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query, formulated as a question or topic based on the user\'s message.',
        },
      },
      required: ['query'],
    },
  },
};

const SEND_TEMPLATE_TOOL: LLMTool = {
  type: 'function',
  function: {
    name: 'send_template',
    description: 'Send a predefined message template to the user instead of a free-text response. Use this when a greeting, promotional, or procedural template is more appropriate than a custom response.',
    parameters: {
      type: 'object',
      properties: {
        templateId: {
          type: 'string',
          description: 'The ID of the template to send.',
        },
        variables: {
          type: 'object',
          description: 'Optional variable values for the template placeholders.',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['templateId'],
    },
  },
};

class ToolRegistry {
  constructor(private readonly deps: ToolRegistryDeps) {}

  /**
   * Obtener herramientas disponibles para un asistente basado en contexto
   */
  getAvailableTools(context: ToolOfferContext): LLMTool[] {
    const tools: LLMTool[] = [];

    if (context.hasKnowledgeBase) {
      tools.push(SEARCH_KNOWLEDGE_TOOL);
    }

    if (context.hasTemplatesTool) {
      tools.push(SEND_TEMPLATE_TOOL);
    }

    // Futuro: agregar más herramientas basadas en contexto
    if (context.hasCalendar) {
      // tools.push(CALENDAR_TOOL);
    }

    if (context.hasCRM) {
      // tools.push(CRM_TOOL);
    }

    return tools;
  }

  /**
   * Obtener definición de herramienta específica
   */
  getToolDefinition(toolId: string): LLMTool | null {
    const allTools = this.getAllToolDefinitions();
    return allTools.find(tool => tool.function.name === toolId) || null;
  }

  /**
   * Ejecutar una herramienta
   */
  async executeTool(toolId: string, params: any, context: ToolExecutionContext): Promise<ToolExecutionResult> {
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

          const sendResult = await this.deps.sendTemplate({
            accountId: context.accountId,
            conversationId: context.conversationId,
            templateId,
            variables: params.variables,
          });

          if (!sendResult) {
            return { outcome: 'error', message: 'Failed to send template' };
          }

          return {
            outcome: 'success',
            data: {
              messageId: sendResult.messageId,
              status: sendResult.status,
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

  /**
   * Verificar si una herramienta está autorizada para el asistente
   */
  isAuthorized(toolId: string, context: ToolOfferContext): boolean {
    const availableTools = this.getAvailableTools(context);
    return availableTools.some(tool => tool.function.name === toolId);
  }

  /**
   * Obtener todas las definiciones de herramientas (para catálogo)
   */
  private getAllToolDefinitions(): LLMTool[] {
    return [
      SEARCH_KNOWLEDGE_TOOL,
      SEND_TEMPLATE_TOOL,
      // Futuro: agregar más herramientas aquí
    ];
  }
}

export const toolRegistry = new ToolRegistry({
  // Estas dependencias se inyectarán desde el CognitiveDispatcher
  fetchRagContext: async () => null, // Placeholder
  listTemplates: async () => [],    // Placeholder
  sendTemplate: async () => null,   // Placeholder
});
