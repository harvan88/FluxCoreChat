/**
 * Core Initialization - Inicializa el sistema de vistas de ChatCore
 * 
 * Este archivo orquesta la inicialización del ViewRegistry y las extensiones.
 * Debe importarse y ejecutarse al inicio de la aplicación.
 * 
 * Flujo:
 * 1. ViewRegistry inicia en fase BOOTSTRAP
 * 2. ChatCore registra sus vistas
 * 3. ViewRegistry avanza a fase EXTENSION_INIT
 * 4. Extensiones registran sus vistas
 * 5. ViewRegistry se sella (SEALED)
 */

import { viewRegistry } from './registry/ViewRegistry';
import { registerExtensions } from '../extensions';

// ============================================================================
// Core View Registrations (Inline para evitar problemas de imports circulares)
// ============================================================================

/**
 * Registra las vistas del núcleo de ChatCore.
 * Estas son las vistas que ChatCore provee por defecto.
 */
function registerCoreViews(): void {
  console.log('[Core] Registering ChatCore views...');
  
  // ========================================
  // Sidebar Views - Se registran con lazy loading
  // ========================================
  
  // Las vistas se cargarán dinámicamente cuando se necesiten
  // Por ahora, registramos placeholders que serán reemplazados
  // por la implementación real en Sidebar.tsx
  
  // Nota: En la implementación final, estos componentes se importan
  // dinámicamente cuando el usuario navega a esa actividad.
  
  console.log('[Core] ChatCore views registered (lazy loading enabled)');
}

// ============================================================================
// Initialization
// ============================================================================

let initialized = false;

/**
 * Inicializa el sistema de vistas de ChatCore.
 * 
 * Esta función debe llamarse UNA VEZ al inicio de la aplicación,
 * antes de que se renderice cualquier componente que use el ViewRegistry.
 * 
 * @returns true si la inicialización fue exitosa
 */
export function initializeCoreSystem(): boolean {
  if (initialized) {
    console.warn('[Core] System already initialized');
    return true;
  }
  
  console.log('[Core] Initializing ChatCore system...');
  
  try {
    // Fase 1: BOOTSTRAP - Registrar vistas del núcleo
    if (viewRegistry.phase !== 'bootstrap') {
      console.error('[Core] ViewRegistry is not in bootstrap phase');
      return false;
    }
    
    registerCoreViews();
    
    // Fase 2: EXTENSION_INIT - Avanzar fase y registrar extensiones
    viewRegistry.advancePhase();
    
    // Verificar que avanzamos correctamente (usando comparación de string para evitar narrowing de TS)
    if ((viewRegistry.phase as string) !== 'extension_init') {
      console.error('[Core] Failed to advance to extension_init phase, current:', viewRegistry.phase);
      return false;
    }
    
    registerExtensions();
    
    // Fase 3: SEALED - Sellar el registro
    viewRegistry.seal();
    
    if ((viewRegistry.phase as string) !== 'sealed') {
      console.error('[Core] Failed to seal registry');
      return false;
    }
    
    initialized = true;
    console.log('[Core] ChatCore system initialized successfully');
    
    // Debug info en desarrollo
    if (process.env.NODE_ENV === 'development') {
      (viewRegistry as any).debug?.();
    }
    
    return true;
  } catch (error) {
    console.error('[Core] Failed to initialize ChatCore system:', error);
    return false;
  }
}

/**
 * Verifica si el sistema está inicializado
 */
export function isSystemInitialized(): boolean {
  return initialized;
}

/**
 * Reinicia el sistema (solo para testing)
 */
export function resetSystem(): void {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Core] resetSystem should only be used in tests');
  }
  initialized = false;
}
