/**
 * Extensions - Registro centralizado de extensiones UI
 * 
 * Este archivo inicializa todas las extensiones UI del sistema.
 * Se llama durante la fase EXTENSION_INIT del ViewRegistry.
 */

import { extensionHost } from '../core/extension-api/ExtensionHost';
import { fluxcoreManifest } from './fluxcore/manifest';

// ============================================================================
// Extension Registration
// ============================================================================

/**
 * Registra todas las extensiones UI conocidas.
 * 
 * DEBE llamarse después de que ChatCore haya registrado sus vistas
 * y el ViewRegistry esté en fase EXTENSION_INIT.
 */
export function registerExtensions(): void {
  console.log('[Extensions] Registering extensions...');
  
  // FluxCore - Extensión de IA
  const fluxcoreResult = extensionHost.registerExtension(fluxcoreManifest);
  if (!fluxcoreResult.success) {
    console.error('[Extensions] Failed to register FluxCore:', fluxcoreResult.errors);
  } else {
    console.log('[Extensions] FluxCore registered:', fluxcoreResult.registeredViews);
  }
  
  // Aquí se pueden agregar más extensiones en el futuro
  // extensionHost.registerExtension(otherExtensionManifest);
  
  console.log('[Extensions] Extension registration complete');
}

/**
 * Lista de extensiones disponibles para registro dinámico
 */
export const availableExtensions = {
  '@fluxcore/fluxcore': fluxcoreManifest,
} as const;

/**
 * Registra una extensión específica por ID
 */
export function registerExtensionById(extensionId: string): boolean {
  const manifest = availableExtensions[extensionId as keyof typeof availableExtensions];
  if (!manifest) {
    console.error(`[Extensions] Unknown extension: ${extensionId}`);
    return false;
  }
  
  const result = extensionHost.registerExtension(manifest);
  return result.success;
}
