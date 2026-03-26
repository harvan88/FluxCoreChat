import { capabilityInstructionService } from './capability-instruction.service';

export type InstructionLike = { id?: string; content?: string | null };

type NormalizedInstruction = { id?: string; content: string };

export interface ExtraInstructionsOptions {
  instructions?: InstructionLike[] | null;
  includeSearchKnowledge?: boolean;
}

class CapabilityExtraInstructionsService {
  buildExtraInstructions(options: ExtraInstructionsOptions): string[] {
    const { instructions, includeSearchKnowledge } = options;

    const normalized: NormalizedInstruction[] = Array.isArray(instructions)
      ? instructions.flatMap((instruction) => {
          if (typeof instruction?.content !== 'string') return [];
          const trimmed = instruction.content.trim();
          if (trimmed.length === 0) return [];
          return [{ id: instruction?.id, content: trimmed }];
        })
      : [];

    const orderedSections: string[] = [];
    const templateEntry = normalized.find((entry) => entry.id === 'system-templates-context');

    if (templateEntry) {
      orderedSections.push(templateEntry.content);
    } else if (normalized.length > 0) {
      orderedSections.push(normalized[0].content);
    }

    if (includeSearchKnowledge) {
      const instructionBlock = capabilityInstructionService.getInstructionBlock('search_knowledge') || '';
      if (instructionBlock) {
        orderedSections.push(instructionBlock);
      }
    }

    const remaining = normalized.filter((entry) => entry !== templateEntry);
    if (!templateEntry && remaining.length > 0) {
      remaining.shift();
    }

    remaining.forEach((entry) => {
      orderedSections.push(entry.content);
    });

    if (orderedSections.length === 0) {
      return [];
    }

    return [orderedSections.join('\n\n')];
  }
}

export const capabilityExtraInstructionsService = new CapabilityExtraInstructionsService();
