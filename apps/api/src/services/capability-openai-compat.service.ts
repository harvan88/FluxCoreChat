import { ExecutionAction } from '../core/fluxcore-types';
import { capabilityArgumentNormalizerService } from './capability-argument-normalizer.service';
import { createCapabilityDeps } from './capability-deps-factory.service';
import { createCapabilityExecutionService } from './capability-execution.service';
import { capabilityTranslationService } from './capability-translation.service';

export interface OpenAICompatibleToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    strict?: boolean;
  };
}

export interface OpenAICompatibleToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAICompatibleExecutionContext {
  accountId: string;
  conversationId: string;
  vectorStoreIds?: string[];
  authorizedTemplates?: string[];
}

const LEGACY_OPENAI_TOOL_NAMES = ['send_template', 'list_available_templates'] as const;

class CapabilityOpenAICompatService {
  listTools(): OpenAICompatibleToolDefinition[] {
    return capabilityTranslationService
      .listToolTranslations([...LEGACY_OPENAI_TOOL_NAMES])
      .map(translation => {
        if (translation.toolName !== 'send_template') {
          return translation.toolSchema as OpenAICompatibleToolDefinition;
        }

        return {
          ...translation.toolSchema,
          function: {
            ...translation.toolSchema.function,
            parameters: {
              ...translation.toolSchema.function.parameters,
              properties: {
                ...translation.toolSchema.function.parameters.properties,
                template_id: translation.toolSchema.function.parameters.properties.templateId,
              },
              required: ['template_id'],
            },
          },
        } as OpenAICompatibleToolDefinition;
      });
  }

  async executeToolCall(
    toolCall: OpenAICompatibleToolCall,
    context: OpenAICompatibleExecutionContext
  ): Promise<{ result: string; actions: ExecutionAction[] }> {
    const { name, arguments: argsString } = toolCall.function;

    const capabilityExecution = createCapabilityExecutionService(createCapabilityDeps());
    const normalizedArgs = capabilityArgumentNormalizerService.parseToolArguments(name, argsString);

    const result = await capabilityExecution.executeTool(name, normalizedArgs, {
      accountId: context.accountId,
      conversationId: context.conversationId,
      userMessage: '',
      vectorStoreIds: context.vectorStoreIds,
      authorizedTemplates: context.authorizedTemplates,
    });

    if (name === 'send_template' && result.outcome === 'success') {
      return {
        result: JSON.stringify({
          success: true,
          status: 'queued',
          info: 'Template queued for delivery via platform mediation.'
        }),
        actions: result.actions || []
      };
    }

    if (name === 'list_available_templates' && result.outcome === 'success') {
      return {
        result: JSON.stringify(result.data?.templates ?? []),
        actions: []
      };
    }

    if (result.outcome === 'error') {
      return {
        result: JSON.stringify({ error: result.message || `Tool execution failed for ${name}` }),
        actions: []
      };
    }

    return {
      result: JSON.stringify(result.data ?? { outcome: result.outcome, message: result.message }),
      actions: result.actions || []
    };
  }
}

export const capabilityOpenAICompatService = new CapabilityOpenAICompatService();
