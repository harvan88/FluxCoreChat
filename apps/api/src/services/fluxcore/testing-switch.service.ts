/**
 * Testing Switch Service
 * Permite cambiar entre legacy y new paths para testing paralelo
 */

export class TestingSwitchService {
    private static instance: TestingSwitchService;
    private useLegacyPath: boolean = false;

    static getInstance(): TestingSwitchService {
        if (!TestingSwitchService.instance) {
            TestingSwitchService.instance = new TestingSwitchService();
        }
        return TestingSwitchService.instance;
    }

    setUseLegacyPath(useLegacy: boolean): void {
        this.useLegacyPath = useLegacy;
        console.log(`[TestingSwitch] Path switched to: ${useLegacy ? 'LEGACY' : 'NEW'}`);
    }

    shouldUseLegacyPath(): boolean {
        return this.useLegacyPath;
    }

    /**
     * Ejecuta ambos paths y compara resultados
     */
    async executeBothPaths(params: {
        accountId: string;
        conversationId: string;
        message: any;
        policyContext: any;
    }): Promise<{
        legacy: any;
        new: any;
        identical: boolean;
        differences: string[];
    }> {
        // Ejecutar legacy path
        const legacyResult = await this.executeLegacyPath(params);
        
        // Ejecutar new path
        const newResult = await this.executeNewPath(params);
        
        // Comparar resultados
        const differences = this.compareResults(legacyResult, newResult);
        const identical = differences.length === 0;
        
        return {
            legacy: legacyResult,
            new: newResult,
            identical,
            differences
        };
    }

    private async executeLegacyPath(params: any): Promise<any> {
        // Simular legacy path execution
        console.log('[TestingSwitch] Executing LEGACY path...');
        // TODO: Implementar llamada a legacy path
        return { path: 'legacy', timestamp: Date.now() };
    }

    private async executeNewPath(params: any): Promise<any> {
        // Ejecutar new path
        console.log('[TestingSwitch] Executing NEW path...');
        // TODO: Implementar llamada a new path
        return { path: 'new', timestamp: Date.now() };
    }

    private compareResults(legacy: any, newResult: any): string[] {
        const differences: string[] = [];
        
        // Comparar campos clave
        if (legacy.actions?.length !== newResult?.actions?.length) {
            differences.push(`Actions count: ${legacy.actions?.length} vs ${newResult?.actions?.length}`);
        }
        
        // TODO: Comparación detallada de resultados
        
        return differences;
    }
}

export const testingSwitch = TestingSwitchService.getInstance();
