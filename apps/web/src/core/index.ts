/**
 * Core - Exports públicos del núcleo de ChatCore
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * Este módulo contiene:
 * - ViewRegistry: Registro centralizado de vistas
 * - Extension API: Sistema de extensiones UI
 * - UIOrchestrator: Autoridad única para navegación
 */

// Registry
export {
  viewRegistry,
  RegistryPhaseError,
  RegistryConflictError,
} from './registry';

export type {
  RegistryPhase,
  IViewRegistry,
  SidebarViewDefinition,
  SidebarViewProps,
  TabViewDefinition,
  TabViewProps,
  ExtensionViewDefinition,
  ExtensionViewProps,
  RegistrationResult,
} from './registry';

// Extension API
export {
  extensionHost,
} from './extension-api';

export type {
  ExtensionUIPermission,
  ExtensionSidebarConfig,
  ExtensionViewConfig,
  ExtensionUIManifest,
  ExtensionRegistrationResult,
  ExtensionUIActionResult,
  IExtensionHost,
  IExtensionUIBridge,
} from './extension-api';

// UIOrchestrator
export {
  uiOrchestrator,
} from './orchestrator';

export type {
  ResourceURI,
  ResourceType,
  ParsedResource,
  OpenResourceOptions,
  OpenResourceResult,
  NavigateOptions,
  IUIOrchestrator,
  NavigationEvent,
  NavigationEventType,
  NavigationEventListener,
} from './orchestrator';

// Initialization
export { initializeCoreSystem, isSystemInitialized } from './init';

// Core Components
export {
  EmptyState,
  LoadingState,
  ErrorState,
  ViewContainer,
} from './components';

export type {
  EmptyStateProps,
  LoadingStateProps,
  ErrorStateProps,
  ViewContainerProps,
} from './components';
