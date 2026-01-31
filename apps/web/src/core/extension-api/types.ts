/**
 * Extension UI API Types - Contratos para extensiones que inyectan UI en ChatCore
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * Las extensiones NO acceden directamente al ViewRegistry.
 * En su lugar, declaran un manifest que ChatCore interpreta y registra.
 */

import type { ComponentType } from 'react';
import type { ExtensionViewProps } from '../registry/types';

// ============================================================================
// Extension Permissions
// ============================================================================

/**
 * Permisos UI que una extensión puede solicitar.
 * ChatCore valida estos permisos antes de permitir acciones.
 */
export type ExtensionUIPermission =
  | 'ui:sidebar'           // Puede aparecer en el sidebar
  | 'ui:open_tab'          // Puede solicitar apertura de tabs
  | 'ui:open_container'    // Puede solicitar apertura de containers
  | 'ui:save_layout'       // Puede persistir cambios de layout
  | 'ui:notifications';    // Puede mostrar notificaciones

// ============================================================================
// Extension UI Manifest
// ============================================================================

/**
 * Configuración del sidebar para una extensión
 */
export interface ExtensionSidebarConfig {
  /** Icono a mostrar en el ActivityBar (nombre de Lucide icon) */
  icon: string;
  /** Título del panel en el sidebar */
  title: string;
  /** Componente a renderizar en el sidebar */
  component: ComponentType<ExtensionViewProps>;
  /** Orden de prioridad (menor = más arriba) */
  priority?: number;
}

/**
 * Configuración de una vista de extensión
 */
export interface ExtensionViewConfig {
  /** Componente a renderizar */
  component: ComponentType<ExtensionViewProps>;
  /** Título por defecto para tabs */
  defaultTitle?: string;
  /** Icono por defecto (nombre de Lucide icon) */
  defaultIcon?: string;
}

/**
 * Manifest completo de UI para una extensión.
 * 
 * La extensión declara este manifest y ChatCore lo interpreta.
 * ChatCore decide qué registrar y cómo, basándose en permisos y validaciones.
 */
export interface ExtensionUIManifest {
  /** ID único de la extensión (ej: '@fluxcore/fluxcore') */
  extensionId: string;
  
  /** Nombre legible de la extensión */
  displayName: string;
  
  /** Versión del manifest (para compatibilidad futura) */
  manifestVersion: 1;
  
  /** Permisos UI requeridos */
  permissions: ExtensionUIPermission[];
  
  /** Configuración del sidebar (opcional) */
  sidebar?: ExtensionSidebarConfig;
  
  /** Vistas que la extensión provee */
  views: Record<string, ExtensionViewConfig>;
  
  /** Límites de recursos UI */
  limits?: {
    /** Máximo de tabs que la extensión puede tener abiertos simultáneamente */
    maxTabs?: number;
    /** Máximo de containers que la extensión puede crear */
    maxContainers?: number;
  };
  
  /** Si la extensión es confiable (extensiones oficiales) */
  trusted?: boolean;
}

// ============================================================================
// Extension Host Interface
// ============================================================================

/**
 * Resultado de registrar una extensión
 */
export interface ExtensionRegistrationResult {
  success: boolean;
  extensionId: string;
  registeredViews: string[];
  errors?: string[];
  warnings?: string[];
}

/**
 * Resultado de una acción UI solicitada por una extensión
 */
export interface ExtensionUIActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Interfaz que ChatCore expone a las extensiones para acciones UI.
 * Las extensiones NO acceden directamente a stores o registros.
 */
export interface IExtensionUIBridge {
  /** Solicita abrir un tab con una vista de la extensión */
  requestOpenTab(
    extensionId: string,
    viewId: string,
    options?: {
      title?: string;
      icon?: string;
      context?: Record<string, unknown>;
    }
  ): ExtensionUIActionResult;
  
  /** Solicita cerrar un tab */
  requestCloseTab(extensionId: string, tabId: string): ExtensionUIActionResult;
  
  /** Obtiene el estado de tabs de la extensión */
  getExtensionTabs(extensionId: string): Array<{ tabId: string; viewId: string; title: string }>;
  
  /** Verifica si la extensión tiene un permiso */
  hasPermission(extensionId: string, permission: ExtensionUIPermission): boolean;
}

/**
 * Interfaz del ExtensionHost - Gestiona el ciclo de vida de extensiones UI
 */
export interface IExtensionHost {
  /** Registra una extensión usando su manifest */
  registerExtension(manifest: ExtensionUIManifest): ExtensionRegistrationResult;
  
  /** Desregistra una extensión */
  unregisterExtension(extensionId: string): boolean;
  
  /** Obtiene el manifest de una extensión registrada */
  getManifest(extensionId: string): ExtensionUIManifest | null;
  
  /** Lista todas las extensiones registradas */
  getRegisteredExtensions(): string[];
  
  /** Obtiene el bridge UI para una extensión */
  getBridge(extensionId: string): IExtensionUIBridge | null;
  
  /** Verifica si una extensión está registrada */
  isRegistered(extensionId: string): boolean;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Resultado de validar un manifest
 */
export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Función de validación de manifest
 */
export type ManifestValidator = (manifest: ExtensionUIManifest) => ManifestValidationResult;
