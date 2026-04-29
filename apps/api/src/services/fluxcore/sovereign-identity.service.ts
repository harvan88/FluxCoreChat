import type { RuntimeInput, ExecutionAction } from '../../core/fluxcore-types';

/**
 * SovereignIdentityService — FluxCore Phase 3
 * 
 * Standalone infrastructure element for identity masking.
 * Ensures no real UUIDs are exposed to cognitive runtimes.
 * 
 * CANON: First create, then validate, then integrate.
 */
export class SovereignIdentityService {
    /**
     * Algorithmic Mask Generation (Parity with AsistentesLocal v16.0)
     */
    generateMaskID(uuid: string): string {
        if (!uuid) return 'UNKNOWN';
        const cleanId = uuid.replace(/-/g, '');
        if (cleanId.length < 4) return cleanId.toUpperCase();
        return (cleanId.substring(0, 2) + cleanId.substring(cleanId.length - 2)).toUpperCase();
    }

    /**
     * Translates masks in execution actions back to real UUIDs.
     */
    unmaskActions(actions: ExecutionAction[], maskToIdMap: Map<string, string>): ExecutionAction[] {
        return actions.map(action => {
            if (action.type === 'send_template') {
                const mask = action.templateId.toUpperCase();
                const realId = maskToIdMap.get(mask);
                if (realId) {
                    return { ...action, templateId: realId };
                }
            }
            return action;
        });
    }

    /**
     * Creates a mapping context for a cognitive turn.
     * scans the input for sensitive IDs and projects masks.
     */
    createMappingContext(input: RuntimeInput): { 
        idToMask: Map<string, string>; 
        maskToId: Map<string, string> 
    } {
        const idToMask = new Map<string, string>();
        const maskToId = new Map<string, string>();

        const register = (id: string) => {
            const normalized = id.toLowerCase();
            if (idToMask.has(normalized)) return;
            const mask = this.generateMaskID(normalized);
            idToMask.set(normalized, mask);
            maskToId.set(mask, normalized);
        };

        // Scan authorized templates
        if (input.authorizedContext.authorizedTemplates) {
            input.authorizedContext.authorizedTemplates.forEach(register);
        }

        // Scan templates in business profile
        const templates = (input.authorizedContext.businessProfile as any)?.templates;
        if (Array.isArray(templates)) {
            templates.forEach((t: any) => {
                if (t.templateId) register(t.templateId);
            });
        }

        return { idToMask, maskToId };
    }
}

export const sovereignIdentityService = new SovereignIdentityService();
