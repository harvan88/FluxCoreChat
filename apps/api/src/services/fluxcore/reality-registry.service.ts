import { type FluxPolicyContext } from '@fluxcore/db';

export interface RealityFact {
    domain: string;
    content: string;
}

export interface RealityProvider {
    domain: string;
    getFact(accountId: string, policyContext: FluxPolicyContext): Promise<RealityFact | null>;
}

class RealityRegistryService {
    private providers: Map<string, RealityProvider> = new Map();
    private initialized = false;

    async init() {
        if (this.initialized) return;
        // Registro diferido para evitar ciclos de importación
        const { ScheduleRealityProvider } = await import('./providers/schedule-reality.provider');
        this.registerProvider(new ScheduleRealityProvider());
        this.initialized = true;
    }

    registerProvider(provider: RealityProvider) {
        console.log(`[RealityRegistry] 🔌 Registering provider for domain: ${provider.domain}`);
        this.providers.set(provider.domain, provider);
    }

    async resolveFacts(requestedDomains: string[], accountId: string, policyContext: FluxPolicyContext): Promise<RealityFact[]> {
        const results: RealityFact[] = [];
        
        for (const domain of requestedDomains) {
            const provider = this.providers.get(domain);
            if (provider) {
                try {
                    const fact = await provider.getFact(accountId, policyContext);
                    if (fact && fact.content.trim().length > 0) {
                        results.push(fact);
                    }
                } catch (error) {
                    console.error(`[RealityRegistry] ❌ Error resolving facts for domain ${domain}:`, error);
                }
            }
        }
        
        return results;
    }
}

export const realityRegistryService = new RealityRegistryService();
