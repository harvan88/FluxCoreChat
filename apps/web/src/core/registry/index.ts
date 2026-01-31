/**
 * ViewRegistry - Exports públicos del sistema de registro de vistas
 */

export { viewRegistry } from './ViewRegistry';
export type { ViewRegistryImpl } from './ViewRegistry';

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
} from './types';

export { RegistryPhaseError, RegistryConflictError } from './types';
