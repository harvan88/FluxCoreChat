/**
 * Fluxi Dependency Injection Service
 * 
 * Proporciona servicios necesarios para FluxiRuntime en la nueva arquitectura
 * Resuelve el problema de que FluxiRuntime no puede acceder directamente a WorkEngineService
 */

import { workEngineService } from '../work-engine.service';
import { messageCore } from '../../core/message-core';

export function createFluxiRuntimeConfig(accountId: string): any {
    return {
        // Servicios principales que FluxiRuntime necesita
        workEngineService,
        messageCore,
        
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
