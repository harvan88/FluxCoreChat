import type { FluxcoreInstruction } from '../../../packages/db/src/schema/fluxcore-instructions';
import { SEARCH_KNOWLEDGE_SYSTEM_INSTRUCTION } from './tools/search-knowledge';

export type InstructionLike = Pick<FluxcoreInstruction, 'id' | 'content'> | { content?: string | null };

export interface ExtraInstructionsOptions {
  instructions?: InstructionLike[] | null;
  includeSearchKnowledge?: boolean;
}

export function buildExtraInstructions(options: ExtraInstructionsOptions): string[] {
  const { instructions, includeSearchKnowledge } = options;

  const extraInstructions = Array.isArray(instructions)
    ? instructions
        .map((instruction) => {
          if (typeof instruction?.content !== 'string') return '';
          const trimmed = instruction.content.trim();
          return trimmed.length > 0 ? trimmed : '';
        })
        .filter((content): content is string => content.length > 0)
    : [];

  if (includeSearchKnowledge) {
    extraInstructions.push(SEARCH_KNOWLEDGE_SYSTEM_INSTRUCTION);
  }

  return extraInstructions;
}
