/**
 * ViewRegistry Types - Definiciones de tipos para el sistema de registro de vistas
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * Este archivo define los contratos que permiten a ChatCore mantener
 * control total sobre qué vistas se renderizan y cuándo.
 */

import type { ComponentType } from 'react';
import type { ActivityType } from '../../types';
import type { Tab, TabContextType } from '../../types/panels';

// ============================================================================
// Registry Phases - Control del ciclo de vida del registro
// ============================================================================

/**
 * Fases del ciclo de vida del ViewRegistry.
 * 
 * BOOTSTRAP: Solo ChatCore puede registrar vistas (vistas del núcleo)
 * EXTENSION_INIT: Las extensiones pueden registrar sus vistas
 * SEALED: Registro cerrado, solo lectura. No se permiten más registros.
 */
export type RegistryPhase = 'bootstrap' | 'extension_init' | 'sealed';

// ============================================================================
// Sidebar View Definitions
// ============================================================================

/**
 * Props que recibe un componente de sidebar view
 */
export interface SidebarViewProps {
  accountId?: string | null;
}

/**
 * Definición de una vista de sidebar (panel lateral)
 */
export interface SidebarViewDefinition {
  /** Tipo de actividad que activa esta vista */
  activityType: ActivityType;
  /** Componente React a renderizar */
  component: ComponentType<SidebarViewProps>;
  /** Título para mostrar en el header del sidebar */
  title: string;
  /** Icono opcional (nombre de Lucide icon) */
  icon?: string;
  /** Si es una vista del núcleo (ChatCore) o de extensión */
  isCore?: boolean;
}

// ============================================================================
// Tab View Definitions
// ============================================================================

/**
 * Props que recibe un componente de tab view
 */
export interface TabViewProps {
  tab: Tab;
  containerId: string;
  accountId?: string | null;
}

/**
 * Definición de una vista de tab (contenido de pestaña)
 */
export interface TabViewDefinition {
  /** Tipo de tab que activa esta vista */
  tabType: TabContextType;
  /** Componente React a renderizar */
  component: ComponentType<TabViewProps>;
  /** Matcher opcional para casos complejos (ej: extension tabs con diferentes views) */
  matcher?: (tab: Tab) => boolean;
  /** Si es una vista del núcleo (ChatCore) o de extensión */
  isCore?: boolean;
}

// ============================================================================
// Extension View Definitions
// ============================================================================

/**
 * Props que recibe un componente de vista de extensión
 */
export interface ExtensionViewProps {
  /** ID de la cuenta activa */
  accountId: string;
  /** ID de la extensión */
  extensionId: string;
  /** Contexto adicional pasado por la extensión */
  context: Record<string, unknown>;
  /** Callback para abrir un nuevo tab desde la extensión */
  onOpenTab?: (viewId: string, title: string, data?: Record<string, unknown>) => void;
  /** Callback para cerrar la vista */
  onClose?: () => void;
}

/**
 * Definición de vistas de una extensión
 */
export interface ExtensionViewDefinition {
  /** ID único de la extensión (ej: '@fluxcore/fluxcore') */
  extensionId: string;
  /** Mapa de viewId → componente */
  views: Record<string, ComponentType<ExtensionViewProps>>;
}

// ============================================================================
// ViewRegistry Interface
// ============================================================================

/**
 * Resultado de un intento de registro
 */
export interface RegistrationResult {
  success: boolean;
  error?: string;
}

/**
 * Interfaz pública del ViewRegistry
 * 
 * ChatCore usa esta interfaz para:
 * 1. Registrar sus propias vistas durante BOOTSTRAP
 * 2. Permitir que extensiones registren durante EXTENSION_INIT
 * 3. Obtener vistas para renderizar (siempre disponible)
 */
export interface IViewRegistry {
  // ========================================
  // Phase Management (solo ChatCore)
  // ========================================
  
  /** Fase actual del registro */
  readonly phase: RegistryPhase;
  
  /** Avanza a la siguiente fase. Solo ChatCore puede llamar esto. */
  advancePhase(): void;
  
  /** Sella el registro. Después de esto, no se permiten más registros. */
  seal(): void;
  
  // ========================================
  // Registration (fase-dependiente)
  // ========================================
  
  /** Registra una vista de sidebar */
  registerSidebarView(def: SidebarViewDefinition): RegistrationResult;
  
  /** Registra una vista de tab */
  registerTabView(def: TabViewDefinition): RegistrationResult;
  
  /** Registra vistas de una extensión */
  registerExtensionViews(def: ExtensionViewDefinition): RegistrationResult;
  
  // ========================================
  // Queries (siempre disponible)
  // ========================================
  
  /** Obtiene el componente de sidebar para una actividad */
  getSidebarView(activity: ActivityType): ComponentType<SidebarViewProps> | null;
  
  /** Obtiene el título de sidebar para una actividad */
  getSidebarTitle(activity: ActivityType): string | null;
  
  /** Obtiene el componente de tab para un tab */
  getTabView(tab: Tab): ComponentType<TabViewProps> | null;
  
  /** Obtiene una vista específica de una extensión */
  getExtensionView(extensionId: string, viewId: string): ComponentType<ExtensionViewProps> | null;
  
  /** Verifica si una vista es del núcleo (ChatCore) */
  isCoreView(viewId: string): boolean;
  
  /** Lista todas las actividades registradas */
  getRegisteredActivities(): ActivityType[];
  
  /** Lista todas las extensiones registradas */
  getRegisteredExtensions(): string[];
}

// ============================================================================
// Error Types
// ============================================================================

export class RegistryPhaseError extends Error {
  constructor(
    public readonly attemptedAction: string,
    public readonly currentPhase: RegistryPhase,
    public readonly requiredPhase: RegistryPhase | RegistryPhase[]
  ) {
    const required = Array.isArray(requiredPhase) ? requiredPhase.join(' or ') : requiredPhase;
    super(`Cannot ${attemptedAction} in phase '${currentPhase}'. Required phase: ${required}`);
    this.name = 'RegistryPhaseError';
  }
}

export class RegistryConflictError extends Error {
  constructor(
    public readonly type: 'sidebar' | 'tab' | 'extension',
    public readonly identifier: string,
    public readonly existingSource: string
  ) {
    super(`${type} view '${identifier}' already registered by '${existingSource}'`);
    this.name = 'RegistryConflictError';
  }
}
