/**
 * Fluxi Dependency Injection Service
 * 
 * Proporciona servicios necesarios para FluxiRuntime en la nueva arquitectura
 * Resuelve el problema de que FluxiRuntime no puede acceder directamente a WorkEngineService
 * 
 * CONSOLIDATION v9.0:
 * - Removed messageCore (Fluxi no longer bypasses Kernel — all messages go through ActionExecutor)
 * - workEngineService provides: resolveSemanticMatch(), commitSemanticConfirmation(), 
 *   proposeWork(), openWork(), commitDelta(), ingestMessage()
 */

import { workEngineService } from '../work-engine.service';

export function createFluxiRuntimeConfig(accountId: string): any {
    return {
        // Core service: WorkEngine handles all transactional operations
        // Provides: proposeWork, openWork, commitDelta, ingestMessage,
        //           resolveSemanticMatch, commitSemanticConfirmation (Phase 0)
        workEngineService,
        
        // Configuración por defecto para LLM
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 512,
        temperature: 0.1,
        
        // WorkDefinitions se resolverán dinámicamente por CognitiveDispatcher
        workDefinitions: [],
    };
}

/**
 * Verifica que los servicios necesarios estén disponibles
 */
export function validateFluxiServices(): boolean {
    try {
        // Verificar que WorkEngineService esté disponible
        if (!workEngineService) {
            console.error('[FluxiDI] WorkEngineService not available');
            return false;
        }
        
        // Verificar que MessageCore esté disponible
        if (!messageCore) {
            console.error('[FluxiDI] MessageCore not available');
            return false;
        }
        
        console.log('[FluxiDI] ✅ All required services available');
        return true;
    } catch (error) {
        console.error('[FluxiDI] Service validation failed:', error);
        return false;
    }
}
