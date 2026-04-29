import type { RuntimeConfig } from '@fluxcore/db';
import type { AuthorizedRuntimeContext } from '../core/fluxcore-types';
import type { FluxCoreCapability } from '../core/capabilities';
import { capabilityRegistryService } from './capability-registry.service';
import { capabilityTranslationService, type CapabilityToolTranslation } from './capability-translation.service';

export type CapabilityExecutionMode = 'inference_query' | 'declarative_action';

export interface CapabilityOffer extends CapabilityToolTranslation {
    availability: 'available';
    executionMode: CapabilityExecutionMode;
}

interface ResolveCapabilityOfferParams {
    runtimeConfig: RuntimeConfig;
    authorizedContext: AuthorizedRuntimeContext;
}

class CapabilityOfferService {
    resolveForExecution(params: ResolveCapabilityOfferParams): CapabilityOffer[] {
        return capabilityRegistryService
            .listDefinitions()
            .filter(definition => this.isAvailable(definition, params))
            .map(definition => this.buildOffer(definition))
            .filter((offer): offer is CapabilityOffer => offer !== null);
    }

    getOfferForExecution(toolName: string, params: ResolveCapabilityOfferParams): CapabilityOffer | null {
        return this.resolveForExecution(params).find(offer => offer.toolName === toolName) ?? null;
    }

    getToolIdsForExecution(params: ResolveCapabilityOfferParams): string[] {
        return this.resolveForExecution(params).map(offer => offer.toolName);
    }

    getToolDefinitionForExecution(toolName: string, params: ResolveCapabilityOfferParams): any | null {
        return this.resolveForExecution(params).find(offer => offer.toolName === toolName)?.toolSchema ?? null;
    }

    isAuthorizedForExecution(toolName: string, params: ResolveCapabilityOfferParams): boolean {
        return this.resolveForExecution(params).some(offer => offer.toolName === toolName);
    }

    private buildOffer(definition: FluxCoreCapability): CapabilityOffer | null {
        const translation = capabilityTranslationService.translateToTool(definition.name);
        if (!translation) {
            return null;
        }

        return {
            ...translation,
            availability: 'available',
            executionMode: definition.kind === 'command' ? 'declarative_action' : 'inference_query',
        };
    }

    private isAvailable(definition: FluxCoreCapability, params: ResolveCapabilityOfferParams): boolean {
        const { runtimeConfig, authorizedContext } = params;
        const authorizedToolIds = runtimeConfig.authorizedTools ?? [];

        if (definition.slug === 'send_template' || definition.slug === 'list_available_templates') {
            return authorizedContext.authorizedTemplates.length > 0;
        }

        // 🔒 SEGURIDAD DE PLATAFORMA: Herramientas del dominio 'fluxcore' (administrativas)
        // solo son visibles para la cuenta de soporte oficial de FluxCore.
        if (definition.domain === 'fluxcore') {
            const isSupportAccount = authorizedContext.accountId === '5f96c4c5-473b-4574-93ce-53f54225dd18';
            
            // search_knowledge es la única herramienta de fluxcore permitida para todos
            if (definition.slug === 'search_knowledge') {
                return (runtimeConfig.vectorStoreIds?.length ?? 0) > 0;
            }

            return isSupportAccount;
        }

        if (!authorizedToolIds.includes(definition.name)) {
            return false;
        }

        return true;
    }
}

export const capabilityOfferService = new CapabilityOfferService();
