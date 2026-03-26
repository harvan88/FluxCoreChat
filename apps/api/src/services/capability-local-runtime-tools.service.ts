import type { RuntimeConfig } from '@fluxcore/db';
import type { AuthorizedRuntimeContext } from '../core/fluxcore-types';
import type { LLMTool, LLMToolCall } from './fluxcore/llm-client.service';
import { capabilityArgumentNormalizerService } from './capability-argument-normalizer.service';
import {
  createCapabilityExecutionService,
  type CapabilityExecutionContext,
  type CapabilityExecutionDeps,
} from './capability-execution.service';
import { capabilityOfferService } from './capability-offer.service';

interface LocalRuntimeOfferParams {
  runtimeConfig: RuntimeConfig;
  authorizedContext: AuthorizedRuntimeContext;
  allowedToolNames?: string[];
}

interface LocalRuntimeToolExecutionParams extends LocalRuntimeOfferParams {
  toolCall: LLMToolCall;
  executionContext: CapabilityExecutionContext;
  deps: CapabilityExecutionDeps;
}

export interface LocalRuntimeTemplateAction {
  type: 'send_template';
  templateId: string;
  conversationId: string;
  variables: Record<string, string>;
}

export interface LocalRuntimeToolExecutionResult {
  content: string;
  templateAction?: LocalRuntimeTemplateAction;
  parsedArgs?: any;
}

class CapabilityLocalRuntimeToolsService {
  listTools(params: LocalRuntimeOfferParams): LLMTool[] {
    return capabilityOfferService
      .resolveForExecution(params)
      .filter((offer) => !params.allowedToolNames || params.allowedToolNames.includes(offer.toolName))
      .map((offer) => offer.toolSchema as LLMTool);
  }

  async executeTool(params: LocalRuntimeToolExecutionParams): Promise<LocalRuntimeToolExecutionResult> {
    const { toolCall, executionContext, deps, runtimeConfig, authorizedContext, allowedToolNames } = params;
    const toolName = toolCall.function.name;

    if (allowedToolNames && !allowedToolNames.includes(toolName)) {
      return {
        content: JSON.stringify({ error: `Tool ${toolName} is not available in this runtime` }),
      };
    }

    const offer = capabilityOfferService.getOfferForExecution(toolName, {
      runtimeConfig,
      authorizedContext,
    });

    if (!offer) {
      return {
        content: JSON.stringify({ error: `Tool ${toolName} is not authorized` }),
      };
    }

    const parsedArgs = capabilityArgumentNormalizerService.parseToolArguments(toolName, toolCall.function.arguments, {
      fallbackQuery: executionContext.userMessage,
    });

    if (offer.executionMode === 'declarative_action') {
      const templateId = parsedArgs?.templateId;
      if (typeof templateId !== 'string' || templateId.trim().length === 0) {
        return {
          parsedArgs,
          content: JSON.stringify({ error: 'templateId is required' }),
        };
      }

      if (!executionContext.authorizedTemplates?.includes(templateId)) {
        return {
          parsedArgs,
          content: JSON.stringify({ error: `Template ${templateId} is not authorized` }),
        };
      }

      return {
        parsedArgs,
        content: JSON.stringify({ status: 'queued', templateId }),
        templateAction: {
          type: 'send_template',
          templateId,
          conversationId: executionContext.conversationId,
          variables: parsedArgs?.variables ?? {},
        },
      };
    }

    const capabilityExecution = createCapabilityExecutionService(deps);
    const result = await capabilityExecution.executeTool(toolName, parsedArgs, executionContext);

    if (toolName === 'search_knowledge') {
      if (result.outcome === 'success' && result.data?.context) {
        return {
          parsedArgs,
          content: result.data.context,
        };
      }

      if (result.outcome === 'not_found') {
        return {
          parsedArgs,
          content: JSON.stringify({ message: 'No relevant information found' }),
        };
      }
    }

    if (result.outcome === 'error') {
      return {
        parsedArgs,
        content: JSON.stringify({ error: result.message || 'Tool execution failed' }),
      };
    }

    return {
      parsedArgs,
      content: JSON.stringify(result.data ?? { outcome: result.outcome, message: result.message }),
    };
  }
}

export const capabilityLocalRuntimeToolsService = new CapabilityLocalRuntimeToolsService();
