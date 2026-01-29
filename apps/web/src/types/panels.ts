/**
 * Panel Stack Manager Types
 * TOTEM PARTE 11: Panel & Tab System
 */

// ============================================================================
// Core Types
// ============================================================================

export type ContainerType =
  | 'chats'           // Conversaciones y mensajes
  | 'contacts'        // Lista de contactos
  | 'settings'        // Configuración
  | 'extensions'      // Panel de extensiones
  | 'editor'          // Editor (prompts, templates)
  | 'dashboard'       // Dashboard/analytics
  | 'custom';         // Extensiones custom

export type TabContextType =
  | 'chat'            // Chat individual
  | 'contact'         // Detalle de contacto
  | 'settings'        // Sección de settings
  | 'extension'       // Extensión específica
  | 'editor'          // Editor específico
  | 'openai-assistant-editor' // Editor dedicado para asistentes OpenAI
  | 'monitoring'
  | 'custom';         // Custom

export type SplitDirection = 'horizontal' | 'vertical';

// ============================================================================
// Tab Interface
// ============================================================================

export interface Tab {
  id: string;                    // Identificador único de instancia
  identity?: string;            // Identificador de recurso (ej: assistant:123, chat:456)
  type: TabContextType;
  title: string;
  icon?: string;
  context: Record<string, any>;  // chatId, contactId, etc.
  metadata?: Record<string, any>; // Información extra para identificación
  closable: boolean;
  dirty?: boolean;               // Indica cambios sin guardar
  createdAt: number;
}

// ============================================================================
// Dynamic Container Interface
// ============================================================================

export interface DynamicContainer {
  id: string;
  type: ContainerType;
  tabs: Tab[];
  activeTabId: string | null;
  pinned: boolean;
  parentId: string | null;       // Para jerarquías padre-hijo
  childIds: string[];            // IDs de containers hijos
  position: {
    order: number;               // Orden en el layout (0, 1, 2)
    width?: number;              // Porcentaje o px
    height?: number;
  };
  minimized: boolean;
  createdAt: number;
}

// ============================================================================
// Layout State
// ============================================================================

export interface LayoutState {
  containers: DynamicContainer[];
  splitDirection: SplitDirection;
  maxContainers: number;         // Default: 3
  focusedContainerId: string | null;
  version: number;               // Para sincronización
}

// ============================================================================
// Panel Stack Manager Events
// ============================================================================

export type PanelEventType =
  | 'panel.opened'
  | 'panel.closed'
  | 'panel.pinned'
  | 'panel.resized'
  | 'panel.focused'
  | 'tab.opened'
  | 'tab.closed'
  | 'tab.moved'
  | 'tab.activated'
  | 'layout.changed';

export interface PanelEvent {
  type: PanelEventType;
  containerId?: string;
  tabId?: string;
  source?: string;
  reason?: string;
  data?: Record<string, any>;
  timestamp: number;
}

// ============================================================================
// Commands (API)
// ============================================================================

export interface OpenTabOptions {
  focus?: boolean;               // Default: true
  position?: 'start' | 'end' | number;
  forceNewContainer?: boolean;   // Ignorar smart priority
}

export interface OpenContainerOptions {
  position?: number;
  parentId?: string;
  pinned?: boolean;
  initialTabs?: Omit<Tab, 'id' | 'createdAt'>[];
}

export interface OpenTabResult {
  containerId: string;
  tabId: string;
  isNewContainer: boolean;
}

export interface OpenContainerResult {
  containerId: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Panel Stack Manager API Interface
// ============================================================================

export interface PanelStackManagerAPI {
  // Queries
  getLayout(): LayoutState;
  getContainer(containerId: string): DynamicContainer | undefined;
  getTab(containerId: string, tabId: string): Tab | undefined;
  getActiveContainer(): DynamicContainer | undefined;
  getContainerByType(type: ContainerType): DynamicContainer | undefined;

  // Commands - Tabs
  openTab(
    containerType: ContainerType,
    tabContext: Omit<Tab, 'id' | 'createdAt'>,
    options?: OpenTabOptions
  ): OpenTabResult;
  closeTab(containerId: string, tabId: string): boolean;
  activateTab(containerId: string, tabId: string): void;
  moveTab(tabId: string, fromContainerId: string, toContainerId: string): boolean;

  // Commands - Containers
  openContainer(
    containerType: ContainerType,
    options?: OpenContainerOptions
  ): OpenContainerResult;
  closeContainer(containerId: string, force?: boolean): boolean;
  pinContainer(containerId: string, pinned: boolean): void;
  focusContainer(containerId: string): void;
  duplicateContainer(containerId: string): OpenContainerResult;

  // Commands - Layout
  resizeContainer(containerId: string, width?: number, height?: number): void;
  reorderContainers(containerIds: string[]): void;
  setSplitDirection(direction: SplitDirection): void;
  resetLayout(): void;

  // Events
  subscribe(callback: (event: PanelEvent) => void): () => void;

  // Persistence
  saveLayout(): void;
  loadLayout(): boolean;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface PersistedLayout {
  layout: LayoutState;
  accountId: string;
  deviceId: string;
  savedAt: number;
}

// ============================================================================
// Constants
// ============================================================================

export const PANEL_CONSTANTS = {
  MAX_CONTAINERS: 3,
  MIN_CONTAINER_WIDTH: 200,
  DEFAULT_SPLIT: 'horizontal' as SplitDirection,
  STORAGE_KEY: 'fluxcore_panel_layout',
  DEFAULT_TAB_TITLE: 'Nueva pestaña',
} as const;

// ============================================================================
// Utility Types
// ============================================================================

export type ContainerPosition = 'primary' | 'secondary' | 'tertiary';

export function getContainerPosition(order: number): ContainerPosition {
  switch (order) {
    case 0: return 'primary';
    case 1: return 'secondary';
    case 2: return 'tertiary';
    default: return 'primary';
  }
}
