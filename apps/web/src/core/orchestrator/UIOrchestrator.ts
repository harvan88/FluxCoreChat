/**
 * UIOrchestrator - Autoridad única para navegación UI
 * 
 * PRINCIPIO: ChatCore gobierna, extensiones inyectan.
 * 
 * Este servicio centraliza todas las decisiones de navegación:
 * - Qué recurso abrir
 * - Dónde abrirlo (tab existente, nuevo tab, nuevo container)
 * - Validación de permisos para extensiones
 */

import { useUIStore } from '../../store/uiStore';
import { usePanelStore } from '../../store/panelStore';
import { extensionHost } from '../extension-api/ExtensionHost';
import type { ActivityType } from '../../types';
import type {
  IUIOrchestrator,
  ResourceURI,
  ResourceType,
  ParsedResource,
  OpenResourceOptions,
  OpenResourceResult,
  NavigateOptions,
  NavigationEvent,
  NavigationEventListener,
} from './types';

// ============================================================================
// UIOrchestrator Implementation
// ============================================================================

class UIOrchestatorImpl implements IUIOrchestrator {
  private eventListeners = new Set<NavigationEventListener>();
  
  // ========================================
  // Navigation
  // ========================================
  
  navigateTo(activity: ActivityType, options: NavigateOptions = {}): void {
    const { setActiveActivity, setSidebarOpen } = useUIStore.getState();
    
    setActiveActivity(activity);
    
    if (options.openSidebar) {
      setSidebarOpen(true);
    }
    
    this.emit('navigation.activity_changed', { activity });
  }
  
  openResource(uri: ResourceURI, options: OpenResourceOptions = {}): OpenResourceResult {
    const parsed = this.parseResourceURI(uri);
    
    switch (parsed.type) {
      case 'chat':
        return this.openChat(parsed.id, options);
      
      case 'contact':
        return this.openContact(parsed.id, options);
      
      case 'settings':
        return this.openSettings(parsed.id, options);
      
      case 'extension':
        return this.openExtensionView(parsed.extensionId!, parsed.viewId || 'default', options);
      
      case 'monitoring':
        return this.openMonitoring(parsed.id, options);
      
      default:
        return { success: false, error: `Unknown resource type: ${parsed.type}` };
    }
  }
  
  activateExtension(extensionId: string, viewId?: string): OpenResourceResult {
    // Verificar que la extensión está registrada
    if (!extensionHost.isRegistered(extensionId)) {
      return { success: false, error: `Extension ${extensionId} is not registered` };
    }
    
    // Verificar permisos
    if (!extensionHost.hasPermission(extensionId, 'ui:sidebar')) {
      return { success: false, error: `Extension ${extensionId} lacks ui:sidebar permission` };
    }
    
    // Activar en el sidebar
    const { setActiveActivity } = useUIStore.getState();
    setActiveActivity(`ext:${extensionId}` as ActivityType);
    
    // Si hay viewId, abrir también el tab
    if (viewId) {
      return this.requestOpenTab(extensionId, viewId);
    }
    
    this.emit('navigation.extension_activated', { extensionId, viewId });
    return { success: true };
  }
  
  // ========================================
  // Queries
  // ========================================
  
  canOpen(uri: ResourceURI): boolean {
    const parsed = this.parseResourceURI(uri);
    
    if (parsed.type === 'extension') {
      // Verificar que la extensión está registrada y tiene permisos
      if (!parsed.extensionId) return false;
      if (!extensionHost.isRegistered(parsed.extensionId)) return false;
      if (!extensionHost.hasPermission(parsed.extensionId, 'ui:open_tab')) return false;
    }
    
    return true;
  }
  
  getActiveResource(): ResourceURI | null {
    const { layout } = usePanelStore.getState();
    const { selectedAccountId: _selectedAccountId } = useUIStore.getState();
    
    // Obtener el container activo
    const activeContainer = layout.containers.find(c => c.id === layout.focusedContainerId);
    if (!activeContainer) return null;
    
    // Obtener el tab activo
    const activeTab = activeContainer.tabs.find(t => t.id === activeContainer.activeTabId);
    if (!activeTab) return null;
    
    // Construir URI basado en el tipo de tab
    switch (activeTab.type) {
      case 'chat':
        return activeTab.context?.chatId ? `chat:${activeTab.context.chatId}` : null;
      
      case 'contact':
        return activeTab.context?.contactId ? `contact:${activeTab.context.contactId}` : null;
      
      case 'settings':
        return activeTab.context?.section ? `settings:${activeTab.context.section}` : 'settings:general';
      
      case 'extension': {
        const extId = activeTab.context?.extensionId;
        const viewId = activeTab.context?.view || 'default';
        return extId ? `extension:${extId}:${viewId}` : null;
      }
      
      case 'monitoring':
        return activeTab.context?.view ? `monitoring:${activeTab.context.view}` : 'monitoring:hub';
      
      default:
        return null;
    }
  }
  
  parseResourceURI(uri: ResourceURI): ParsedResource {
    const parts = uri.split(':');
    const type = (parts[0] || 'unknown') as ResourceType;
    
    switch (type) {
      case 'extension': {
        // extension:@fluxcore/fluxcore:assistants
        const extensionId = parts[1] || '';
        const viewId = parts[2] || 'default';
        return { type, id: uri, extensionId, viewId };
      }
      
      default:
        return { type, id: parts[1] || '' };
    }
  }
  
  buildResourceURI(type: ResourceType, id: string, params?: Record<string, string>): ResourceURI {
    let uri = `${type}:${id}`;
    
    if (params) {
      const queryString = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      if (queryString) {
        uri += `?${queryString}`;
      }
    }
    
    return uri;
  }
  
  // ========================================
  // Extension Actions (controladas)
  // ========================================
  
  requestOpenTab(
    extensionId: string,
    viewId: string,
    options?: {
      title?: string;
      icon?: string;
      context?: Record<string, unknown>;
    }
  ): OpenResourceResult {
    // Verificar que la extensión está registrada
    if (!extensionHost.isRegistered(extensionId)) {
      return { success: false, error: `Extension ${extensionId} is not registered` };
    }
    
    // Verificar permisos
    if (!extensionHost.hasPermission(extensionId, 'ui:open_tab')) {
      return { success: false, error: `Extension ${extensionId} lacks ui:open_tab permission` };
    }
    
    // Obtener manifest para defaults
    const manifest = extensionHost.getManifest(extensionId);
    const viewConfig = manifest?.views[viewId];
    
    if (!viewConfig) {
      return { success: false, error: `View ${viewId} not found in extension ${extensionId}` };
    }
    
    // Abrir el tab
    const { selectedAccountId } = useUIStore.getState();
    const { openTab } = usePanelStore.getState();
    
    const result = openTab('extensions', {
      type: 'extension',
      identity: `extension:${extensionId}:${viewId}:${selectedAccountId}`,
      title: options?.title || viewConfig.defaultTitle || viewId,
      icon: options?.icon || viewConfig.defaultIcon || 'Puzzle',
      closable: true,
      context: {
        extensionId,
        extensionName: manifest?.displayName || extensionId,
        view: viewId,
        accountId: selectedAccountId,
        ...options?.context,
      },
    });
    
    this.emit('navigation.resource_opened', {
      uri: `extension:${extensionId}:${viewId}`,
      containerId: result.containerId,
      tabId: result.tabId,
    });
    
    return {
      success: true,
      containerId: result.containerId,
      tabId: result.tabId,
    };
  }
  
  // ========================================
  // Private Methods
  // ========================================
  
  private openChat(chatId: string, options: OpenResourceOptions): OpenResourceResult {
    const { selectedAccountId } = useUIStore.getState();
    const { openTab } = usePanelStore.getState();
    
    const result = openTab('chats', {
      type: 'chat',
      identity: `chat:${chatId}`,
      title: options.title || 'Chat',
      icon: options.icon || 'MessageSquare',
      closable: true,
      context: {
        chatId,
        accountId: selectedAccountId,
        ...options.context,
      },
    });
    
    this.emit('navigation.resource_opened', {
      uri: `chat:${chatId}`,
      containerId: result.containerId,
      tabId: result.tabId,
    });
    
    return {
      success: true,
      containerId: result.containerId,
      tabId: result.tabId,
    };
  }
  
  private openContact(contactId: string, options: OpenResourceOptions): OpenResourceResult {
    const { openTab } = usePanelStore.getState();
    
    const result = openTab('contacts', {
      type: 'contact',
      identity: `contact:${contactId}`,
      title: options.title || 'Contacto',
      icon: options.icon || 'User',
      closable: true,
      context: {
        contactId,
        ...options.context,
      },
    });
    
    this.emit('navigation.resource_opened', {
      uri: `contact:${contactId}`,
      containerId: result.containerId,
      tabId: result.tabId,
    });
    
    return {
      success: true,
      containerId: result.containerId,
      tabId: result.tabId,
    };
  }
  
  private openSettings(section: string, options: OpenResourceOptions): OpenResourceResult {
    const { openTab } = usePanelStore.getState();
    
    const sectionTitles: Record<string, string> = {
      profile: 'Perfil',
      accounts: 'Cuentas',
      credits: 'Créditos',
      appearance: 'Apariencia',
      notifications: 'Notificaciones',
      privacy: 'Privacidad',
    };
    
    const result = openTab('settings', {
      type: 'settings',
      identity: `settings:${section}`,
      title: options.title || sectionTitles[section] || 'Configuración',
      icon: options.icon || 'Settings',
      closable: true,
      context: {
        section,
        ...options.context,
      },
    });
    
    this.emit('navigation.resource_opened', {
      uri: `settings:${section}`,
      containerId: result.containerId,
      tabId: result.tabId,
    });
    
    return {
      success: true,
      containerId: result.containerId,
      tabId: result.tabId,
    };
  }
  
  private openExtensionView(
    extensionId: string,
    viewId: string,
    options: OpenResourceOptions
  ): OpenResourceResult {
    return this.requestOpenTab(extensionId, viewId, {
      title: options.title,
      icon: options.icon,
      context: options.context,
    });
  }
  
  private openMonitoring(view: string, options: OpenResourceOptions): OpenResourceResult {
    const { openTab } = usePanelStore.getState();
    
    const viewTitles: Record<string, string> = {
      hub: 'Monitoreo',
      audit: 'Auditoría',
      assets: 'Assets',
    };
    
    const result = openTab('dashboard', {
      type: 'monitoring',
      identity: `monitoring:${view}`,
      title: options.title || viewTitles[view] || 'Monitoreo',
      icon: options.icon || 'Activity',
      closable: true,
      context: {
        view,
        ...options.context,
      },
    });
    
    this.emit('navigation.resource_opened', {
      uri: `monitoring:${view}`,
      containerId: result.containerId,
      tabId: result.tabId,
    });
    
    return {
      success: true,
      containerId: result.containerId,
      tabId: result.tabId,
    };
  }
  
  // ========================================
  // Event System
  // ========================================
  
  subscribe(listener: NavigationEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }
  
  private emit(type: NavigationEvent['type'], data: Record<string, unknown>): void {
    const event: NavigationEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[UIOrchestrator] Event listener error:', error);
      }
    });
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of the UIOrchestrator.
 * 
 * Usage:
 * 
 * import { uiOrchestrator } from './core/orchestrator/UIOrchestrator';
 * 
 * // Navigate to an activity
 * uiOrchestrator.navigateTo('conversations');
 * 
 * // Open a resource
 * uiOrchestrator.openResource('chat:conversation-123');
 * 
 * // Activate an extension
 * uiOrchestrator.activateExtension('@fluxcore/fluxcore', 'assistants');
 * 
 * // Request tab from extension (with permission check)
 * uiOrchestrator.requestOpenTab('@fluxcore/fluxcore', 'usage');
 */
export const uiOrchestrator = new UIOrchestatorImpl();

// Export type for testing/mocking
export type { UIOrchestatorImpl };
