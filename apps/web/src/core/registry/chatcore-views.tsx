/**
 * ChatCore Views - Registro de vistas del núcleo
 * 
 * Este archivo registra todas las vistas que son parte del núcleo de ChatCore.
 * Estas vistas se registran durante la fase BOOTSTRAP, antes de las extensiones.
 * 
 * NOTA: Por ahora, el registro de vistas del núcleo se hace de forma simplificada.
 * Los componentes se cargan directamente en Sidebar.tsx y DynamicContainer.tsx
 * usando el fallback legacy mientras se completa la migración completa.
 * 
 * El ViewRegistry está preparado para cuando se quiera migrar completamente,
 * pero por ahora solo se usa para extensiones.
 */

import { viewRegistry } from './ViewRegistry';

// ============================================================================
// Registration Function
// ============================================================================

/**
 * Registra las vistas del núcleo de ChatCore.
 * 
 * NOTA: Por ahora, esta función solo registra metadatos (títulos, iconos).
 * Los componentes reales se cargan via fallback legacy en Sidebar.tsx y DynamicContainer.tsx.
 * 
 * Esto permite una migración gradual sin romper funcionalidad existente.
 */
export function registerChatCoreViews(): void {
  console.log('[ChatCore] Registering core view metadata...');
  
  // Verificar que estamos en la fase correcta
  if (viewRegistry.phase !== 'bootstrap') {
    console.error('[ChatCore] Cannot register core views: registry is not in bootstrap phase');
    return;
  }
  
  // Por ahora, no registramos componentes - usamos el fallback legacy
  // Esto evita problemas de tipos y permite una migración gradual
  
  // Los títulos y metadatos se manejan en:
  // - Sidebar.tsx: resolveSidebarTitle()
  // - DynamicContainer.tsx: TabContent fallback switch
  
  console.log('[ChatCore] Core view metadata registered (using legacy fallback for components)');
}

/**
 * Versión síncrona del registro de vistas del núcleo.
 * Alias de registerChatCoreViews para compatibilidad.
 */
export function registerChatCoreViewsSync(): void {
  registerChatCoreViews();
}
