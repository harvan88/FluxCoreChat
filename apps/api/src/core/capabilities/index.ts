export interface FluxCoreCapability {
    name: string;
    description: string;
    jsonSchema: any;
    execute(context: Record<string, any>, args: any): Promise<any>;
}
export * from './templates.capability';
export * from './knowledge.capability';
