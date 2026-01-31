/**
 * ExtensionHost - Gestiona el ciclo de vida de extensiones UI
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * El ExtensionHost es el intermediario entre las extensiones y ChatCore.
 * Las extensiones declaran manifests, el ExtensionHost los valida y registra.
 * Las extensiones NO acceden directamente al ViewRegistry.
 */

import { viewRegistry } from '../registry/ViewRegistry';
import type {
  ExtensionUIManifest,
  ExtensionRegistrationResult,
  ExtensionUIActionResult,
  ExtensionUIPermission,
  IExtensionHost,
  IExtensionUIBridge,
  ManifestValidationResult,
} from './types';
import type { ExtensionViewProps } from '../registry/types';
import type { ComponentType } from 'react';

// ============================================================================
// Manifest Validation
// ============================================================================

function validateManifest(manifest: ExtensionUIManifest): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!manifest.extensionId) {
    errors.push('extensionId is required');
  }
  
  if (!manifest.displayName) {
    errors.push('displayName is required');
  }
  
  if (manifest.manifestVersion !== 1) {
    errors.push(`Unsupported manifest version: ${manifest.manifestVersion}. Only version 1 is supported.`);
  }
  
  if (!manifest.permissions || manifest.permissions.length === 0) {
    warnings.push('No permissions declared. Extension will have limited capabilities.');
  }
  
  // Validate permissions match capabilities
  if (manifest.sidebar && !manifest.permissions?.includes('ui:sidebar')) {
    errors.push('Extension declares sidebar but lacks ui:sidebar permission');
  }
  
  // Validate views
  if (!manifest.views || Object.keys(manifest.views).length === 0) {
    warnings.push('No views declared. Extension will not be able to render any content.');
  }
  
  // Validate limits
  if (manifest.limits) {
    if (manifest.limits.maxTabs !== undefined && manifest.limits.maxTabs < 1) {
      errors.push('maxTabs must be at least 1');
    }
    if (manifest.limits.maxContainers !== undefined && manifest.limits.maxContainers < 0) {
      errors.push('maxContainers cannot be negative');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Extension UI Bridge Implementation
// ============================================================================

class ExtensionUIBridgeImpl implements IExtensionUIBridge {
  private extensionId: string;
  private manifest: ExtensionUIManifest;
  
  constructor(
    extensionId: string,
    manifest: ExtensionUIManifest,
    _host: ExtensionHostImpl // Kept for future use
  ) {
    this.extensionId = extensionId;
    this.manifest = manifest;
  }
  
  requestOpenTab(
    extensionId: string,
    viewId: string,
    options?: {
      title?: string;
      icon?: string;
      context?: Record<string, unknown>;
    }
  ): ExtensionUIActionResult {
    // Verify this is the correct extension
    if (extensionId !== this.extensionId) {
      return {
        success: false,
        error: `Extension ${this.extensionId} cannot open tabs for ${extensionId}`,
      };
    }
    
    // Check permission
    if (!this.hasPermission(extensionId, 'ui:open_tab')) {
      return {
        success: false,
        error: `Extension ${extensionId} lacks ui:open_tab permission`,
      };
    }
    
    // Check if view exists
    const viewConfig = this.manifest.views[viewId];
    if (!viewConfig) {
      return {
        success: false,
        error: `View '${viewId}' not found in extension ${extensionId}`,
      };
    }
    
    // Check tab limits
    const currentTabs = this.getExtensionTabs(extensionId);
    const maxTabs = this.manifest.limits?.maxTabs ?? 10;
    if (currentTabs.length >= maxTabs) {
      return {
        success: false,
        error: `Extension ${extensionId} has reached maximum tabs (${maxTabs})`,
      };
    }
    
    // Request is valid - ChatCore will handle the actual opening
    // This is just validation, the actual opening happens via panelStore
    return {
      success: true,
      data: {
        extensionId,
        viewId,
        title: options?.title ?? viewConfig.defaultTitle ?? viewId,
        icon: options?.icon ?? viewConfig.defaultIcon ?? 'Puzzle',
        context: options?.context ?? {},
      },
    };
  }
  
  requestCloseTab(extensionId: string, tabId: string): ExtensionUIActionResult {
    if (extensionId !== this.extensionId) {
      return {
        success: false,
        error: `Extension ${this.extensionId} cannot close tabs for ${extensionId}`,
      };
    }
    
    // Validation only - actual closing happens via panelStore
    return { success: true, data: { tabId } };
  }
  
  getExtensionTabs(_extensionId: string): Array<{ tabId: string; viewId: string; title: string }> {
    // This would query panelStore for tabs belonging to this extension
    // For now, return empty array - will be connected to panelStore later
    return [];
  }
  
  hasPermission(extensionId: string, permission: ExtensionUIPermission): boolean {
    if (extensionId !== this.extensionId) {
      return false;
    }
    return this.manifest.permissions.includes(permission);
  }
}

// ============================================================================
// Extension Host Implementation
// ============================================================================

class ExtensionHostImpl implements IExtensionHost {
  private manifests = new Map<string, ExtensionUIManifest>();
  private bridges = new Map<string, ExtensionUIBridgeImpl>();
  
  registerExtension(manifest: ExtensionUIManifest): ExtensionRegistrationResult {
    const result: ExtensionRegistrationResult = {
      success: false,
      extensionId: manifest.extensionId,
      registeredViews: [],
      errors: [],
      warnings: [],
    };
    
    // Validate manifest
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      result.errors = validation.errors;
      result.warnings = validation.warnings;
      console.error(`[ExtensionHost] Failed to register ${manifest.extensionId}:`, validation.errors);
      return result;
    }
    result.warnings = validation.warnings;
    
    // Check if already registered
    if (this.manifests.has(manifest.extensionId)) {
      result.errors = [`Extension ${manifest.extensionId} is already registered`];
      return result;
    }
    
    // Check ViewRegistry phase
    if (viewRegistry.phase === 'bootstrap') {
      result.errors = ['Cannot register extensions during bootstrap phase. Wait for extension_init phase.'];
      return result;
    }
    
    if (viewRegistry.phase === 'sealed') {
      result.errors = ['Cannot register extensions after registry is sealed.'];
      return result;
    }
    
    // Build views map for ViewRegistry
    const viewsMap: Record<string, ComponentType<ExtensionViewProps>> = {};
    
    for (const [viewId, viewConfig] of Object.entries(manifest.views)) {
      viewsMap[viewId] = viewConfig.component;
      result.registeredViews.push(viewId);
    }
    
    // Add sidebar component if present
    if (manifest.sidebar) {
      viewsMap['sidebar'] = manifest.sidebar.component;
      result.registeredViews.push('sidebar');
    }
    
    // Register with ViewRegistry
    const registrationResult = viewRegistry.registerExtensionViews({
      extensionId: manifest.extensionId,
      views: viewsMap,
    });
    
    if (!registrationResult.success) {
      result.errors = [registrationResult.error ?? 'Unknown registration error'];
      return result;
    }
    
    // Store manifest and create bridge
    this.manifests.set(manifest.extensionId, manifest);
    this.bridges.set(manifest.extensionId, new ExtensionUIBridgeImpl(manifest.extensionId, manifest, this));
    
    result.success = true;
    console.log(`[ExtensionHost] Registered extension: ${manifest.extensionId} (${result.registeredViews.length} views)`);
    
    return result;
  }
  
  unregisterExtension(extensionId: string): boolean {
    if (!this.manifests.has(extensionId)) {
      console.warn(`[ExtensionHost] Extension ${extensionId} is not registered`);
      return false;
    }
    
    // Note: ViewRegistry doesn't support unregistration (by design)
    // The manifest and bridge are removed, but views remain in registry
    // This is intentional - prevents runtime issues with open tabs
    
    this.manifests.delete(extensionId);
    this.bridges.delete(extensionId);
    
    console.log(`[ExtensionHost] Unregistered extension: ${extensionId}`);
    return true;
  }
  
  getManifest(extensionId: string): ExtensionUIManifest | null {
    return this.manifests.get(extensionId) ?? null;
  }
  
  getRegisteredExtensions(): string[] {
    return Array.from(this.manifests.keys());
  }
  
  getBridge(extensionId: string): IExtensionUIBridge | null {
    return this.bridges.get(extensionId) ?? null;
  }
  
  isRegistered(extensionId: string): boolean {
    return this.manifests.has(extensionId);
  }
  
  // ========================================
  // Additional Helper Methods
  // ========================================
  
  /**
   * Get sidebar config for an extension
   */
  getSidebarConfig(extensionId: string) {
    const manifest = this.manifests.get(extensionId);
    return manifest?.sidebar ?? null;
  }
  
  /**
   * Get all extensions with sidebar
   */
  getExtensionsWithSidebar(): Array<{ extensionId: string; config: NonNullable<ExtensionUIManifest['sidebar']> }> {
    const result: Array<{ extensionId: string; config: NonNullable<ExtensionUIManifest['sidebar']> }> = [];
    
    for (const [extensionId, manifest] of this.manifests) {
      if (manifest.sidebar && manifest.permissions.includes('ui:sidebar')) {
        result.push({ extensionId, config: manifest.sidebar });
      }
    }
    
    // Sort by priority
    result.sort((a, b) => (a.config.priority ?? 100) - (b.config.priority ?? 100));
    
    return result;
  }
  
  /**
   * Check if an extension has a specific permission
   */
  hasPermission(extensionId: string, permission: ExtensionUIPermission): boolean {
    const manifest = this.manifests.get(extensionId);
    return manifest?.permissions.includes(permission) ?? false;
  }
  
  /**
   * Debug info
   */
  debug(): void {
    console.group('[ExtensionHost] Debug Info');
    console.log('Registered Extensions:', this.getRegisteredExtensions());
    for (const [id, manifest] of this.manifests) {
      console.log(`  ${id}:`, {
        views: Object.keys(manifest.views),
        permissions: manifest.permissions,
        hasSidebar: !!manifest.sidebar,
      });
    }
    console.groupEnd();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of the ExtensionHost.
 * 
 * Usage:
 * 
 * // Register an extension
 * import { extensionHost } from './core/extension-api/ExtensionHost';
 * 
 * extensionHost.registerExtension({
 *   extensionId: '@fluxcore/fluxcore',
 *   displayName: 'FluxCore AI',
 *   manifestVersion: 1,
 *   permissions: ['ui:sidebar', 'ui:open_tab'],
 *   views: { ... },
 * });
 */
export const extensionHost = new ExtensionHostImpl();

// Export type for testing/mocking
export type { ExtensionHostImpl };
