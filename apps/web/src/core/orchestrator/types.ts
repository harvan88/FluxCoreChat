/**
 * UIOrchestrator Types - Tipos para el orquestador de navegación UI
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * El UIOrchestrator es la autoridad única para decisiones de navegación.
 * Centraliza la lógica de apertura de recursos, tabs y containers.
 */

import type { ActivityType } from '../../types';
// ContainerType and TabContextType kept for future use
// import type { ContainerType, TabContextType } from '../../types/panels';

// ============================================================================
// Resource URI - Identificador único de recursos
// ============================================================================

/**
 * URI de recurso para navegación.
 * 
 * Formato: {type}:{id}
 * 
 * Ejemplos:
 * - "chat:conversation-123"
 * - "contact:contact-456"
 * - "extension:@fluxcore/fluxcore:assistants"
 * - "settings:profile"
 * - "monitoring:hub"
 */
export type ResourceURI = string;

/**
 * Tipo de recurso extraído de un URI
 */
export type ResourceType = 
  | 'chat'
  | 'contact'
  | 'settings'
  | 'extension'
  | 'monitoring'
  | 'editor'
  | 'unknown';

/**
 * Recurso parseado de un URI
 */
export interface ParsedResource {
  type: ResourceType;
  id: string;
  extensionId?: string;
  viewId?: string;
  params?: Record<string, string>;
}

// ============================================================================
// Navigation Actions
// ============================================================================

/**
 * Opciones para abrir un recurso
 */
export interface OpenResourceOptions {
  /** Forzar apertura en nuevo tab (ignorar tab existente) */
  forceNew?: boolean;
  /** Forzar apertura en nuevo container */
  newContainer?: boolean;
  /** Título personalizado para el tab */
  title?: string;
  /** Icono personalizado para el tab */
  icon?: string;
  /** Contexto adicional */
  context?: Record<string, unknown>;
}

/**
 * Resultado de abrir un recurso
 */
export interface OpenResourceResult {
  success: boolean;
  containerId?: string;
  tabId?: string;
  error?: string;
  /** Si se reutilizó un tab existente */
  reused?: boolean;
}

/**
 * Opciones para navegar a una actividad
 */
export interface NavigateOptions {
  /** Si debe abrir el sidebar automáticamente */
  openSidebar?: boolean;
}

// ============================================================================
// UIOrchestrator Interface
// ============================================================================

/**
 * Interfaz del UIOrchestrator - Autoridad única para navegación UI
 * 
 * Responsabilidades:
 * - Decidir dónde abrir recursos (tab existente, nuevo tab, nuevo container)
 * - Validar permisos de extensiones antes de abrir
 * - Centralizar lógica de navegación dispersa
 * 
 * NO es responsable de:
 * - Renderizar contenido (eso es del ViewRegistry)
 * - Persistir estado (eso es del panelStore)
 * - Manejar eventos de usuario (eso es de los componentes)
 */
export interface IUIOrchestrator {
  // ========================================
  // Navigation
  // ========================================
  
  /** Navega a una actividad (cambia el sidebar) */
  navigateTo(activity: ActivityType, options?: NavigateOptions): void;
  
  /** Abre un recurso (chat, contacto, extensión, etc.) */
  openResource(uri: ResourceURI, options?: OpenResourceOptions): OpenResourceResult;
  
  /** Activa una extensión en el sidebar */
  activateExtension(extensionId: string, viewId?: string): OpenResourceResult;
  
  // ========================================
  // Queries
  // ========================================
  
  /** Verifica si un recurso puede ser abierto */
  canOpen(uri: ResourceURI): boolean;
  
  /** Obtiene el recurso activo actual */
  getActiveResource(): ResourceURI | null;
  
  /** Parsea un URI de recurso */
  parseResourceURI(uri: ResourceURI): ParsedResource;
  
  /** Construye un URI de recurso */
  buildResourceURI(type: ResourceType, id: string, params?: Record<string, string>): ResourceURI;
  
  // ========================================
  // Extension Actions (controladas)
  // ========================================
  
  /** 
   * Solicita apertura de tab desde una extensión.
   * El orquestador valida permisos antes de abrir.
   */
  requestOpenTab(
    extensionId: string,
    viewId: string,
    options?: {
      title?: string;
      icon?: string;
      context?: Record<string, unknown>;
    }
  ): OpenResourceResult;
}

// ============================================================================
// Navigation Events
// ============================================================================

export type NavigationEventType =
  | 'navigation.activity_changed'
  | 'navigation.resource_opened'
  | 'navigation.resource_closed'
  | 'navigation.extension_activated';

export interface NavigationEvent {
  type: NavigationEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export type NavigationEventListener = (event: NavigationEvent) => void;
