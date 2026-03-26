import { capabilityTranslationService } from './capability-translation.service';

class CapabilityInstructionService {
  getInstructionBlock(toolName: string): string | null {
    return capabilityTranslationService.translateToTool(toolName)?.instructionBlock ?? null;
  }

  listInstructionBlocks(toolNames?: string[]): string[] {
    return capabilityTranslationService
      .listToolTranslations(toolNames)
      .map(translation => translation.instructionBlock)
      .filter((instructionBlock): instructionBlock is string => typeof instructionBlock === 'string' && instructionBlock.trim().length > 0);
  }
}

export const capabilityInstructionService = new CapabilityInstructionService();
