import type { OpenAIChatMessage, OpenAIToolCall, OpenAIToolDef } from '../openai-compatible-client';
import type { ContextData } from '../prompt-builder';
import { SEARCH_KNOWLEDGE_TOOL_DEF, parseSearchKnowledgeArgs } from './search-knowledge';

export interface ToolOfferContext {
  hasKnowledgeBase: boolean;
  hasTemplatesTool: boolean;
}

export interface ToolExecutionContext {
  accountId: string;
  conversationId: string;
  eventContent: string;
  vectorStoreIds?: string[];
}

export interface ToolExecutionResult {
  outcome: 'success' | 'not_found' | 'error';
  data?: Record<string, any>;
  message?: string;
}

export interface ToolExecutionResponse {
  name: string;
  message: OpenAIChatMessage;
  result: ToolExecutionResult;
  parsedArgs?: any;
  ragContext?: ContextData['ragContext'] | null;
}

export interface ToolRegistryDeps {
  fetchRagContext: (accountId: string, query: string, vectorStoreIds?: string[]) => Promise<ContextData['ragContext'] | null>;
  listTemplates: (accountId: string) => Promise<Array<{ id: string; name?: string; category?: string; variables?: string[]; instructions?: string | null }>>;
  sendTemplate: (params: {
    accountId: string;
    conversationId: string;
    templateId: string;
    variables?: Record<string, string>;
  }) => Promise<{ messageId?: string; status?: string } | null>;
}

const SEND_TEMPLATE_TOOL_DEF: OpenAIToolDef = {
  type: 'function',
  function: {
    name: 'send_template',
    description:
      'Envía una plantilla de mensaje preautorizada. Úsala SOLO si la intención del usuario coincide con una plantilla disponible. ' +
      'Requiere template_id y, si aplica, variables para reemplazo.',
    parameters: {
      type: 'object',
      properties: {
        template_id: {
          type: 'string',
          description: 'ID exacto de la plantilla autorizada.',
        },
        variables: {
          type: 'object',
          description: 'Mapa de variables para reemplazo en la plantilla.',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['template_id'],
      additionalProperties: false,
    },
  },
};

const LIST_TEMPLATES_TOOL_DEF: OpenAIToolDef = {
  type: 'function',
  function: {
    name: 'list_available_templates',
    description:
      'Lista las plantillas autorizadas para IA. Úsala para encontrar el template_id correcto antes de enviar.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
};

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asStringRecord(input: any): Record<string, string> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  const entries = Object.entries(input).filter(([, value]) => typeof value === 'string');
  if (entries.length === 0) return undefined;
  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value as string;
    return acc;
  }, {});
}

export class ToolRegistry {
  constructor(private readonly deps: ToolRegistryDeps) {}

  getToolsForAssistant(context: ToolOfferContext): OpenAIToolDef[] {
    const tools: OpenAIToolDef[] = [];

    if (context.hasKnowledgeBase) {
      tools.push(SEARCH_KNOWLEDGE_TOOL_DEF);
    }

    if (context.hasTemplatesTool) {
      tools.push(LIST_TEMPLATES_TOOL_DEF, SEND_TEMPLATE_TOOL_DEF);
    }

    return tools;
  }

  async executeToolCall(toolCall: OpenAIToolCall, context: ToolExecutionContext): Promise<ToolExecutionResponse> {
    const name = toolCall.function.name;

    try {
      switch (name) {
        case 'search_knowledge': {
          const parsedArgs = parseSearchKnowledgeArgs(toolCall.function.arguments, context.eventContent);
          const ragContext = await this.deps.fetchRagContext(
            context.accountId,
            parsedArgs.query,
            context.vectorStoreIds
          );

          const result: ToolExecutionResult = ragContext?.context
            ? {
                outcome: 'success',
                data: {
                  found: true,
                  context: ragContext.context,
                  sources: ragContext.sources?.map((s) => s.source) || [],
                  chunksUsed: ragContext.chunksUsed,
                  totalTokens: ragContext.totalTokens,
                },
              }
            : {
                outcome: 'not_found',
                data: {
                  found: false,
                  context: '',
                  sources: [],
                  chunksUsed: 0,
                  totalTokens: 0,
                },
              };

          return {
            name,
            parsedArgs,
            ragContext,
            result,
            message: {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            },
          };
        }
        case 'list_available_templates': {
          const templates = await this.deps.listTemplates(context.accountId);
          const result: ToolExecutionResult = {
            outcome: 'success',
            data: { templates },
          };

          return {
            name,
            result,
            message: {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            },
          };
        }
        case 'send_template': {
          const parsed = safeJsonParse(toolCall.function.arguments) || {};
          const templateId = typeof parsed.template_id === 'string' ? parsed.template_id.trim() : '';
          const variables = asStringRecord(parsed.variables);

          if (!templateId) {
            const result: ToolExecutionResult = {
              outcome: 'error',
              message: 'template_id es requerido.',
            };

            return {
              name,
              parsedArgs: { template_id: templateId, variables },
              result,
              message: {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              },
            };
          }

          const sendResult = await this.deps.sendTemplate({
            accountId: context.accountId,
            conversationId: context.conversationId,
            templateId,
            variables,
          });

          const result: ToolExecutionResult = sendResult
            ? {
                outcome: 'success',
                data: {
                  messageId: sendResult.messageId || null,
                  status: sendResult.status || 'sent',
                },
              }
            : {
                outcome: 'error',
                message: 'No se pudo enviar la plantilla.',
              };

          return {
            name,
            parsedArgs: { template_id: templateId, variables },
            result,
            message: {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            },
          };
        }
        default: {
          const result: ToolExecutionResult = {
            outcome: 'error',
            message: `Tool desconocida: ${name}`,
          };

          return {
            name,
            result,
            message: {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            },
          };
        }
      }
    } catch (error: any) {
      const result: ToolExecutionResult = {
        outcome: 'error',
        message: error?.message || 'Error ejecutando tool.',
      };

      return {
        name,
        result,
        message: {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        },
      };
    }
  }
}
