export type FluxCoreCapabilityDomain = 'chatcore' | 'fluxcore' | 'external';

export type FluxCoreCapabilityKind = 'query' | 'command';

export type FluxCoreCapabilityTranslationStrategy = 'tool' | 'instruction' | 'tool_and_instruction';

export interface FluxCoreCapability {
    id: string;
    slug: string;
    version: string;
    domain: FluxCoreCapabilityDomain;
    kind: FluxCoreCapabilityKind;
    translationStrategy: FluxCoreCapabilityTranslationStrategy;
    name: string;
    description: string;
    jsonSchema: any;
    outputSchema?: any;
    usageHints?: string[];
    instructionBlock?: string;
    execute(context: Record<string, any>, args: any): Promise<any>;
}
export * from './templates.capability';
export * from './knowledge.capability';
export * from './platform.capability';
export * from './schedules.capability';
