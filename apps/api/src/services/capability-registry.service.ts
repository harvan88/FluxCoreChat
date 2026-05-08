import type { FluxCoreCapability } from '../core/capabilities';
import {
    SYSTEM_LIST_TEMPLATES,
    SYSTEM_SEARCH_KNOWLEDGE,
    SYSTEM_SEND_TEMPLATE,
    SYSTEM_IS_BUSINESS_OPEN,
} from '../core/capabilities';
import {
    PLATFORM_UPDATE_ACCOUNT_INSTRUCTIONS,
    PLATFORM_MANAGE_TEMPLATE,
    PLATFORM_AUTHORIZE_AI_TEMPLATE,
} from '../core/capabilities';

export type CapabilityDefinition = FluxCoreCapability;

class CapabilityRegistryService {
    private readonly definitions: CapabilityDefinition[] = [
        SYSTEM_SEARCH_KNOWLEDGE,
        SYSTEM_SEND_TEMPLATE,
        SYSTEM_LIST_TEMPLATES,
        PLATFORM_UPDATE_ACCOUNT_INSTRUCTIONS,
        PLATFORM_MANAGE_TEMPLATE,
        PLATFORM_AUTHORIZE_AI_TEMPLATE,
        SYSTEM_IS_BUSINESS_OPEN,
    ];

    listDefinitions(): CapabilityDefinition[] {
        return [...this.definitions];
    }

    getById(id: string): CapabilityDefinition | null {
        return this.definitions.find(definition => definition.id === id) ?? null;
    }

    getBySlug(slug: string): CapabilityDefinition | null {
        return this.definitions.find(definition => definition.slug === slug) ?? null;
    }

    getByToolName(toolName: string): CapabilityDefinition | null {
        return this.definitions.find(definition => definition.name === toolName) ?? null;
    }
}

export const capabilityRegistryService = new CapabilityRegistryService();
