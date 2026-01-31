/**
 * ViewRegistry - Registro centralizado de vistas para ChatCore
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * Este es el SINGLE SOURCE OF TRUTH para todas las vistas del sistema.
 * ChatCore controla qué se renderiza y cuándo, las extensiones solo
 * pueden registrar sus vistas durante la fase de inicialización.
 * 
 * Ciclo de vida:
 * 1. BOOTSTRAP: ChatCore registra vistas del núcleo (conversations, contacts, etc.)
 * 2. EXTENSION_INIT: Extensiones registran sus vistas
 * 3. SEALED: Registro cerrado, solo lectura
 */

import type { ComponentType } from 'react';
import type { ActivityType } from '../../types';
import type { Tab, TabContextType } from '../../types/panels';
import type {
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
import { RegistryPhaseError, RegistryConflictError } from './types';

// ============================================================================
// Internal Storage Types
// ============================================================================

interface SidebarViewEntry extends SidebarViewDefinition {
  registeredBy: string;
  registeredAt: number;
}

interface TabViewEntry extends TabViewDefinition {
  registeredBy: string;
  registeredAt: number;
}

interface ExtensionViewEntry {
  extensionId: string;
  views: Map<string, ComponentType<ExtensionViewProps>>;
  registeredAt: number;
}

// ============================================================================
// ViewRegistry Implementation
// ============================================================================

class ViewRegistryImpl implements IViewRegistry {
  private _phase: RegistryPhase = 'bootstrap';
  
  private sidebarViews = new Map<ActivityType, SidebarViewEntry>();
  private tabViews = new Map<TabContextType, TabViewEntry>();
  private tabViewMatchers: Array<{ matcher: (tab: Tab) => boolean; entry: TabViewEntry }> = [];
  private extensionViews = new Map<string, ExtensionViewEntry>();
  
  private coreViewIds = new Set<string>();
  
  // ========================================
  // Phase Management
  // ========================================
  
  get phase(): RegistryPhase {
    return this._phase;
  }
  
  advancePhase(): void {
    switch (this._phase) {
      case 'bootstrap':
        this._phase = 'extension_init';
        console.log('[ViewRegistry] Phase advanced to: extension_init');
        break;
      case 'extension_init':
        this._phase = 'sealed';
        console.log('[ViewRegistry] Phase advanced to: sealed (registry is now read-only)');
        break;
      case 'sealed':
        console.warn('[ViewRegistry] Registry is already sealed');
        break;
    }
  }
  
  seal(): void {
    if (this._phase !== 'sealed') {
      this._phase = 'sealed';
      console.log('[ViewRegistry] Registry sealed');
    }
  }
  
  // ========================================
  // Registration Methods
  // ========================================
  
  registerSidebarView(def: SidebarViewDefinition): RegistrationResult {
    // Validate phase
    if (this._phase === 'sealed') {
      const error = new RegistryPhaseError('register sidebar view', this._phase, ['bootstrap', 'extension_init']);
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Core views can only be registered during bootstrap
    if (def.isCore && this._phase !== 'bootstrap') {
      const error = new RegistryPhaseError('register core sidebar view', this._phase, 'bootstrap');
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Check for conflicts
    const existing = this.sidebarViews.get(def.activityType);
    if (existing) {
      const error = new RegistryConflictError('sidebar', def.activityType, existing.registeredBy);
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Register
    const entry: SidebarViewEntry = {
      ...def,
      registeredBy: def.isCore ? 'chatcore' : `extension:${def.activityType}`,
      registeredAt: Date.now(),
    };
    
    this.sidebarViews.set(def.activityType, entry);
    
    if (def.isCore) {
      this.coreViewIds.add(`sidebar:${def.activityType}`);
    }
    
    console.log(`[ViewRegistry] Registered sidebar view: ${def.activityType} (${def.isCore ? 'core' : 'extension'})`);
    return { success: true };
  }
  
  registerTabView(def: TabViewDefinition): RegistrationResult {
    // Validate phase
    if (this._phase === 'sealed') {
      const error = new RegistryPhaseError('register tab view', this._phase, ['bootstrap', 'extension_init']);
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Core views can only be registered during bootstrap
    if (def.isCore && this._phase !== 'bootstrap') {
      const error = new RegistryPhaseError('register core tab view', this._phase, 'bootstrap');
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // If has matcher, add to matchers list (no conflict check for matchers)
    if (def.matcher) {
      const entry: TabViewEntry = {
        ...def,
        registeredBy: def.isCore ? 'chatcore' : `extension:${def.tabType}`,
        registeredAt: Date.now(),
      };
      this.tabViewMatchers.push({ matcher: def.matcher, entry });
      console.log(`[ViewRegistry] Registered tab view with matcher: ${def.tabType}`);
      return { success: true };
    }
    
    // Check for conflicts (only for non-matcher registrations)
    const existing = this.tabViews.get(def.tabType);
    if (existing) {
      const error = new RegistryConflictError('tab', def.tabType, existing.registeredBy);
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Register
    const entry: TabViewEntry = {
      ...def,
      registeredBy: def.isCore ? 'chatcore' : `extension:${def.tabType}`,
      registeredAt: Date.now(),
    };
    
    this.tabViews.set(def.tabType, entry);
    
    if (def.isCore) {
      this.coreViewIds.add(`tab:${def.tabType}`);
    }
    
    console.log(`[ViewRegistry] Registered tab view: ${def.tabType} (${def.isCore ? 'core' : 'extension'})`);
    return { success: true };
  }
  
  registerExtensionViews(def: ExtensionViewDefinition): RegistrationResult {
    // Validate phase - extensions can only register during extension_init
    if (this._phase === 'bootstrap') {
      const error = new RegistryPhaseError('register extension views', this._phase, 'extension_init');
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    if (this._phase === 'sealed') {
      const error = new RegistryPhaseError('register extension views', this._phase, 'extension_init');
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Check for conflicts
    const existing = this.extensionViews.get(def.extensionId);
    if (existing) {
      const error = new RegistryConflictError('extension', def.extensionId, def.extensionId);
      console.error('[ViewRegistry]', error.message);
      return { success: false, error: error.message };
    }
    
    // Register
    const entry: ExtensionViewEntry = {
      extensionId: def.extensionId,
      views: new Map(Object.entries(def.views)),
      registeredAt: Date.now(),
    };
    
    this.extensionViews.set(def.extensionId, entry);
    
    console.log(`[ViewRegistry] Registered extension views: ${def.extensionId} (${Object.keys(def.views).length} views)`);
    return { success: true };
  }
  
  // ========================================
  // Query Methods
  // ========================================
  
  getSidebarView(activity: ActivityType): ComponentType<SidebarViewProps> | null {
    const entry = this.sidebarViews.get(activity);
    return entry?.component ?? null;
  }
  
  getSidebarTitle(activity: ActivityType): string | null {
    const entry = this.sidebarViews.get(activity);
    return entry?.title ?? null;
  }
  
  getTabView(tab: Tab): ComponentType<TabViewProps> | null {
    // First, check matchers (more specific)
    for (const { matcher, entry } of this.tabViewMatchers) {
      if (matcher(tab)) {
        return entry.component;
      }
    }
    
    // Then, check by type
    const entry = this.tabViews.get(tab.type);
    return entry?.component ?? null;
  }
  
  getExtensionView(extensionId: string, viewId: string): ComponentType<ExtensionViewProps> | null {
    const entry = this.extensionViews.get(extensionId);
    if (!entry) return null;
    
    return entry.views.get(viewId) ?? null;
  }
  
  isCoreView(viewId: string): boolean {
    return this.coreViewIds.has(viewId);
  }
  
  getRegisteredActivities(): ActivityType[] {
    return Array.from(this.sidebarViews.keys());
  }
  
  getRegisteredExtensions(): string[] {
    return Array.from(this.extensionViews.keys());
  }
  
  // ========================================
  // Debug Methods
  // ========================================
  
  debug(): void {
    console.group('[ViewRegistry] Debug Info');
    console.log('Phase:', this._phase);
    console.log('Sidebar Views:', Array.from(this.sidebarViews.keys()));
    console.log('Tab Views:', Array.from(this.tabViews.keys()));
    console.log('Tab View Matchers:', this.tabViewMatchers.length);
    console.log('Extension Views:', Array.from(this.extensionViews.keys()));
    console.log('Core View IDs:', Array.from(this.coreViewIds));
    console.groupEnd();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of the ViewRegistry.
 * 
 * Usage:
 * 
 * // During app initialization (ChatCore)
 * import { viewRegistry } from './core/registry/ViewRegistry';
 * 
 * // Register core views during bootstrap
 * viewRegistry.registerSidebarView({ ... });
 * 
 * // Advance to extension phase
 * viewRegistry.advancePhase();
 * 
 * // Extensions register their views
 * viewRegistry.registerExtensionViews({ ... });
 * 
 * // Seal the registry
 * viewRegistry.seal();
 * 
 * // Query views (always available)
 * const SidebarComponent = viewRegistry.getSidebarView('conversations');
 */
export const viewRegistry = new ViewRegistryImpl();

// Export type for testing/mocking
export type { ViewRegistryImpl };
