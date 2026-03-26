import { capabilityArgumentNormalizerService } from './capability-argument-normalizer.service';
import {
  createCapabilityExecutionService,
  type CapabilityExecutionDeps,
  type CapabilityExecutionResult,
} from './capability-execution.service';

export interface OpenAICompatibleToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export interface OpenAICompatibleToolExecutionCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAICompatibleToolExecutionContext {
  accountId: string;
  conversationId: string;
  eventContent: string;
  vectorStoreIds?: string[];
}

export interface OpenAICompatibleToolExecutionResponse {
  name: string;
  result: CapabilityExecutionResult;
  parsedArgs?: any;
  message: OpenAICompatibleToolMessage;
  ragContext?: any | null;
}

class CapabilityOpenAIToolResponseService {
  async executeToolCall(
    toolCall: OpenAICompatibleToolExecutionCall,
    context: OpenAICompatibleToolExecutionContext,
    deps: CapabilityExecutionDeps
  ): Promise<OpenAICompatibleToolExecutionResponse> {
    const name = toolCall.function.name;
    const parsedArgs = capabilityArgumentNormalizerService.parseToolArguments(name, toolCall.function.arguments, {
      fallbackQuery: context.eventContent,
    });

    const capabilityExecution = createCapabilityExecutionService(deps);
    const authorizedTemplates = name === 'send_template'
      ? (await deps.listTemplates(context.accountId)).map(template => template.id)
      : undefined;

    const result = await capabilityExecution.executeTool(name, parsedArgs, {
      accountId: context.accountId,
      conversationId: context.conversationId,
      userMessage: context.eventContent,
      vectorStoreIds: context.vectorStoreIds,
      authorizedTemplates,
    });

    const messageResult = name === 'search_knowledge'
      ? result.outcome === 'success'
        ? {
          ...result,
          data: {
            found: true,
            ...result.data,
          },
        }
        : result.outcome === 'not_found'
          ? {
            ...result,
            data: {
              found: false,
            },
          }
          : result
      : result;

    return {
      name,
      parsedArgs,
      result: messageResult,
      ragContext: result.meta?.ragContext ?? null,
      message: {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(messageResult),
      },
    };
  }
}

export const capabilityOpenAIToolResponseService = new CapabilityOpenAIToolResponseService();
