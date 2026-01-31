/**
 * Extension API - Exports públicos del sistema de extensiones UI
 */

export { extensionHost } from './ExtensionHost';
export type { ExtensionHostImpl } from './ExtensionHost';

export type {
  ExtensionUIPermission,
  ExtensionSidebarConfig,
  ExtensionViewConfig,
  ExtensionUIManifest,
  ExtensionRegistrationResult,
  ExtensionUIActionResult,
  IExtensionHost,
  IExtensionUIBridge,
  ManifestValidationResult,
  ManifestValidator,
} from './types';
