import type { OpenAICompatibleToolDefinition } from './capability-openai-compat.service';
import { capabilityOpenAICompatService } from './capability-openai-compat.service';
import { capabilityTranslationService } from './capability-translation.service';

export interface OpenAILegacyOfferContext {
  hasKnowledgeBase: boolean;
  hasTemplatesTool: boolean;
}

class CapabilityOpenAIOfferService {
  listToolsForLegacyOffer(context: OpenAILegacyOfferContext): OpenAICompatibleToolDefinition[] {
    const tools: OpenAICompatibleToolDefinition[] = [];

    if (context.hasKnowledgeBase) {
      const knowledgeTool = capabilityTranslationService.translateToTool('search_knowledge')?.toolSchema as OpenAICompatibleToolDefinition | undefined;
      if (knowledgeTool) {
        tools.push(knowledgeTool);
      }
    }

    if (context.hasTemplatesTool) {
      tools.push(...capabilityOpenAICompatService.listTools());
    }

    return tools;
  }
}

export const capabilityOpenAIOfferService = new CapabilityOpenAIOfferService();
