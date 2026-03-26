import type { FluxCoreCapability } from '../core/capabilities';
import { capabilityRegistryService } from './capability-registry.service';

export interface CapabilityToolTranslation {
    capabilityId: string;
    slug: string;
    toolName: string;
    description: string;
    toolSchema: any;
    domain: FluxCoreCapability['domain'];
    kind: FluxCoreCapability['kind'];
    version: string;
    usageHints: string[];
    translationStrategy: FluxCoreCapability['translationStrategy'];
    instructionBlock?: string;
}

class CapabilityTranslationService {
    listToolTranslations(toolNames?: string[]): CapabilityToolTranslation[] {
        const definitions = Array.isArray(toolNames)
            ? capabilityRegistryService
                .listDefinitions()
                .filter(definition => toolNames.includes(definition.name))
            : capabilityRegistryService.listDefinitions();

        return definitions
            .map(definition => this.translateToTool(definition.name))
            .filter((translation): translation is CapabilityToolTranslation => translation !== null);
    }

    translateToTool(toolName: string): CapabilityToolTranslation | null {
        const definition = capabilityRegistryService.getByToolName(toolName);
        if (!definition) {
            return null;
        }

        return {
            capabilityId: definition.id,
            slug: definition.slug,
            toolName: definition.name,
            description: definition.description,
            toolSchema: definition.jsonSchema,
            domain: definition.domain,
            kind: definition.kind,
            version: definition.version,
            usageHints: definition.usageHints ?? [],
            translationStrategy: definition.translationStrategy,
            instructionBlock: definition.instructionBlock,
        };
    }
}

export const capabilityTranslationService = new CapabilityTranslationService();
