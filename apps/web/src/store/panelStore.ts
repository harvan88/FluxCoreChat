/**
 * Panel Stack Manager Store
 * TOTEM PARTE 11: Panel & Tab System Implementation
 * 
 * Gestiona:
 * - Dynamic Containers (hasta 3 simultáneos)
 * - Tabs dentro de cada container
 * - Jerarquías padre-hijo
 * - Persistencia del layout
 * - Eventos y comandos API
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ContainerType,
  Tab,
  DynamicContainer,
  LayoutState,
  SplitDirection,
  PanelEvent,
  PanelEventType,
  OpenTabOptions,
  OpenContainerOptions,
  OpenTabResult,
  OpenContainerResult,
} from '../types/panels';

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createTab = (
  partial: Omit<Tab, 'id' | 'createdAt'>
): Tab => ({
  ...partial,
  id: generateId(),
  createdAt: Date.now(),
});

const createContainer = (
  type: ContainerType,
  options?: Partial<DynamicContainer>
): DynamicContainer => ({
  id: generateId(),
  type,
  tabs: [],
  activeTabId: null,
  pinned: false,
  parentId: null,
  childIds: [],
  position: { order: 0 },
  minimized: false,
  createdAt: Date.now(),
  ...options,
});

// ============================================================================
// Store Interface
// ============================================================================

interface PanelStore {
  // State
  layout: LayoutState;
  eventListeners: Set<(event: PanelEvent) => void>;

  // Getters
  getContainer: (containerId: string) => DynamicContainer | undefined;
  getContainerByType: (type: ContainerType) => DynamicContainer | undefined;
  getActiveContainer: () => DynamicContainer | undefined;
  getTab: (containerId: string, tabId: string) => Tab | undefined;
  canOpenNewContainer: () => boolean;

  // Tab Actions
  openTab: (
    containerType: ContainerType,
    tabContext: Omit<Tab, 'id' | 'createdAt'>,
    options?: OpenTabOptions
  ) => OpenTabResult;
  closeTab: (containerId: string, tabId: string) => boolean;
  activateTab: (containerId: string, tabId: string) => void;
  moveTab: (tabId: string, fromContainerId: string, toContainerId: string) => boolean;
  updateTabContext: (containerId: string, tabId: string, context: Record<string, any>) => void;

  // Container Actions
  openContainer: (
    containerType: ContainerType,
    options?: OpenContainerOptions
  ) => OpenContainerResult;
  closeContainer: (containerId: string, force?: boolean) => boolean;
  pinContainer: (containerId: string, pinned: boolean) => void;
  focusContainer: (containerId: string) => void;
  duplicateContainer: (containerId: string) => OpenContainerResult;
  minimizeContainer: (containerId: string, minimized: boolean) => void;

  // Layout Actions
  resizeContainer: (containerId: string, width?: number, height?: number) => void;
  reorderContainers: (containerIds: string[]) => void;
  setSplitDirection: (direction: SplitDirection) => void;
  resetLayout: () => void;

  // Event System
  subscribe: (callback: (event: PanelEvent) => void) => () => void;
  emit: (type: PanelEventType, data?: Partial<PanelEvent>) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialLayout: LayoutState = {
  containers: [],
  splitDirection: 'horizontal',
  maxContainers: 3,
  focusedContainerId: null,
  version: 1,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const usePanelStore = create<PanelStore>()(
  persist(
    (set, get) => ({
      // ========================================
      // State
      // ========================================
      layout: initialLayout,
      eventListeners: new Set(),

      // ========================================
      // Getters
      // ========================================

      getContainer: (containerId) => {
        return get().layout.containers.find(c => c.id === containerId);
      },

      getContainerByType: (type) => {
        return get().layout.containers.find(c => c.type === type);
      },

      getActiveContainer: () => {
        const { layout } = get();
        if (layout.focusedContainerId) {
          return layout.containers.find(c => c.id === layout.focusedContainerId);
        }
        return layout.containers[0];
      },

      getTab: (containerId, tabId) => {
        const container = get().getContainer(containerId);
        return container?.tabs.find(t => t.id === tabId);
      },

      canOpenNewContainer: () => {
        const { layout } = get();
        return layout.containers.length < layout.maxContainers;
      },

      // ========================================
      // Tab Actions
      // ========================================

      openTab: (containerType, tabContext, options = {}) => {
        const { layout, openContainer, emit, activateTab, focusContainer } = get();
        const { focus = true, position = 'end', forceNewContainer = false } = options;

        // 1. Verificar identidad (Pattern matching tipo VS Code URI)
        const identity = tabContext.identity;
        if (identity && !forceNewContainer) {
          for (const container of layout.containers) {
            const existingTab = container.tabs.find(t => t.identity === identity);
            if (existingTab) {
              if (focus) {
                activateTab(container.id, existingTab.id);
                focusContainer(container.id);
              }
              return { containerId: container.id, tabId: existingTab.id, isNewContainer: false };
            }
          }
        }

        // 2. Legacy Check: Chats (se mantiene por compatibilidad si no usan identity)
        if (tabContext.type === 'chat' && tabContext.context?.chatId && !identity) {
          for (const container of layout.containers) {
            const existingTab = container.tabs.find(
              t => t.type === 'chat' && t.context?.chatId === tabContext.context?.chatId
            );
            if (existingTab) {
              if (focus) {
                activateTab(container.id, existingTab.id);
                focusContainer(container.id);
              }
              return { containerId: container.id, tabId: existingTab.id, isNewContainer: false };
            }
          }
        }

        // 3. Obtener o crear container destino
        let targetContainer = get().getContainerByType(containerType);
        let isNewContainer = false;

        if (!targetContainer || forceNewContainer) {
          if (layout.containers.length >= layout.maxContainers) {
            targetContainer = layout.containers[0];
            if (!targetContainer) {
              const result = openContainer(containerType);
              if (!result.success) return { containerId: '', tabId: '', isNewContainer: false };
              targetContainer = get().getContainer(result.containerId)!;
              isNewContainer = true;
            }
          } else {
            const result = openContainer(containerType);
            if (!result.success) return { containerId: '', tabId: '', isNewContainer: false };
            targetContainer = get().getContainer(result.containerId)!;
            isNewContainer = true;
          }
        }

        // 4. Crear y agregar nuevo tab
        const newTab = createTab(tabContext);

        set((state) => {
          const containers = state.layout.containers.map(c => {
            if (c.id === targetContainer!.id) {
              const tabs = [...c.tabs];
              if (position === 'start') {
                tabs.unshift(newTab);
              } else if (typeof position === 'number') {
                tabs.splice(position, 0, newTab);
              } else {
                tabs.push(newTab);
              }
              return {
                ...c,
                tabs,
                activeTabId: focus ? newTab.id : c.activeTabId,
              };
            }
            return c;
          });

          return {
            layout: {
              ...state.layout,
              containers,
              focusedContainerId: focus ? targetContainer!.id : state.layout.focusedContainerId,
            },
          };
        });

        emit('tab.opened', {
          containerId: targetContainer.id,
          tabId: newTab.id,
          data: { context: tabContext },
        });

        return {
          containerId: targetContainer.id,
          tabId: newTab.id,
          isNewContainer,
        };
      },

      closeTab: (containerId, tabId) => {
        const { getContainer, emit } = get();
        const container = getContainer(containerId);

        if (!container) return false;

        const tab = container.tabs.find(t => t.id === tabId);
        if (!tab || !tab.closable) return false;

        set((state) => {
          const containers = state.layout.containers.map(c => {
            if (c.id === containerId) {
              const tabs = c.tabs.filter(t => t.id !== tabId);
              let activeTabId = c.activeTabId;

              // Si cerramos el tab activo, activar otro
              if (activeTabId === tabId) {
                const closedIndex = c.tabs.findIndex(t => t.id === tabId);
                activeTabId = tabs[closedIndex]?.id || tabs[closedIndex - 1]?.id || null;
              }

              return { ...c, tabs, activeTabId };
            }
            return c;
          });

          // Si el container queda sin tabs, cerrarlo (si no está pinned)
          const updatedContainer = containers.find(c => c.id === containerId);
          if (updatedContainer && updatedContainer.tabs.length === 0 && !updatedContainer.pinned) {
            return {
              layout: {
                ...state.layout,
                containers: containers.filter(c => c.id !== containerId),
              },
            };
          }

          return {
            layout: { ...state.layout, containers },
          };
        });

        emit('tab.closed', { containerId, tabId });
        return true;
      },

      activateTab: (containerId, tabId) => {
        const { emit } = get();

        const { layout } = get();
        const container = layout.containers.find(c => c.id === containerId);
        const isAlreadyActive = container?.activeTabId === tabId;
        const isAlreadyFocused = layout.focusedContainerId === containerId;

        if (isAlreadyActive && isAlreadyFocused) return;

        set((state) => ({
          layout: {
            ...state.layout,
            containers: state.layout.containers.map(c =>
              c.id === containerId
                ? { ...c, activeTabId: tabId }
                : c
            ),
            focusedContainerId: containerId,
          },
        }));

        emit('tab.activated', { containerId, tabId });
      },

      moveTab: (tabId, fromContainerId, toContainerId) => {
        const { getContainer, emit } = get();

        const fromContainer = getContainer(fromContainerId);
        const toContainer = getContainer(toContainerId);

        if (!fromContainer || !toContainer) return false;

        const tab = fromContainer.tabs.find(t => t.id === tabId);
        if (!tab) return false;

        set((state) => {
          const containers = state.layout.containers.map(c => {
            if (c.id === fromContainerId) {
              const tabs = c.tabs.filter(t => t.id !== tabId);
              let activeTabId = c.activeTabId;
              if (activeTabId === tabId) {
                activeTabId = tabs[0]?.id || null;
              }
              return { ...c, tabs, activeTabId };
            }
            if (c.id === toContainerId) {
              return {
                ...c,
                tabs: [...c.tabs, tab],
                activeTabId: tab.id,
              };
            }
            return c;
          });

          return {
            layout: { ...state.layout, containers },
          };
        });

        emit('tab.moved', {
          tabId,
          data: { fromContainerId, toContainerId },
        });

        return true;
      },

      updateTabContext: (containerId, tabId, context) => {
        set((state) => ({
          layout: {
            ...state.layout,
            containers: state.layout.containers.map(c =>
              c.id === containerId
                ? {
                  ...c,
                  tabs: c.tabs.map(t =>
                    t.id === tabId
                      ? { ...t, context: { ...t.context, ...context } }
                      : t
                  ),
                }
                : c
            ),
          },
        }));
      },

      // ========================================
      // Container Actions
      // ========================================

      openContainer: (containerType, options = {}) => {
        const { layout, canOpenNewContainer, emit } = get();
        const { position, parentId, pinned = false, initialTabs = [] } = options;

        if (!canOpenNewContainer()) {
          return {
            containerId: '',
            success: false,
            error: 'Maximum containers reached (3)',
          };
        }

        const order = position ?? layout.containers.length;
        const newContainer = createContainer(containerType, {
          pinned,
          parentId: parentId || null,
          position: { order },
          tabs: initialTabs.map(t => createTab(t)),
        });

        // Si hay tabs iniciales, activar el primero
        if (newContainer.tabs.length > 0) {
          newContainer.activeTabId = newContainer.tabs[0].id;
        }

        set((state) => ({
          layout: {
            ...state.layout,
            containers: [...state.layout.containers, newContainer],
            focusedContainerId: newContainer.id,
          },
        }));

        // Si tiene parent, actualizar childIds del parent
        if (parentId) {
          set((state) => ({
            layout: {
              ...state.layout,
              containers: state.layout.containers.map(c =>
                c.id === parentId
                  ? { ...c, childIds: [...c.childIds, newContainer.id] }
                  : c
              ),
            },
          }));
        }

        emit('panel.opened', {
          containerId: newContainer.id,
          data: { type: containerType, options },
        });

        return {
          containerId: newContainer.id,
          success: true,
        };
      },

      closeContainer: (containerId, force = false) => {
        const { getContainer, emit, closeContainer: closeChild } = get();
        const container = getContainer(containerId);

        if (!container) return false;

        // No cerrar si está pinned (a menos que force)
        if (container.pinned && !force) return false;

        // Cerrar containers hijos primero
        container.childIds.forEach(childId => {
          closeChild(childId, true);
        });

        set((state) => {
          // Remover de childIds del parent
          let containers = state.layout.containers;
          if (container.parentId) {
            containers = containers.map(c =>
              c.id === container.parentId
                ? { ...c, childIds: c.childIds.filter(id => id !== containerId) }
                : c
            );
          }

          // Remover container
          containers = containers.filter(c => c.id !== containerId);

          // Reordenar posiciones
          containers = containers.map((c, index) => ({
            ...c,
            position: { ...c.position, order: index },
          }));

          // Actualizar focusedContainerId
          let focusedContainerId = state.layout.focusedContainerId;
          if (focusedContainerId === containerId) {
            focusedContainerId = containers[0]?.id || null;
          }

          return {
            layout: { ...state.layout, containers, focusedContainerId },
          };
        });

        emit('panel.closed', { containerId, reason: force ? 'forced' : 'user' });
        return true;
      },

      pinContainer: (containerId, pinned) => {
        const { emit } = get();

        set((state) => ({
          layout: {
            ...state.layout,
            containers: state.layout.containers.map(c =>
              c.id === containerId ? { ...c, pinned } : c
            ),
          },
        }));

        emit('panel.pinned', { containerId, data: { pinned } });
      },

      focusContainer: (containerId) => {
        const { emit } = get();

        set((state) => ({
          layout: {
            ...state.layout,
            focusedContainerId: containerId,
          },
        }));

        emit('panel.focused', { containerId });
      },

      duplicateContainer: (containerId) => {
        const { getContainer, openContainer } = get();
        const container = getContainer(containerId);

        if (!container) {
          return { containerId: '', success: false, error: 'Container not found' };
        }

        return openContainer(container.type, {
          initialTabs: container.tabs.map(t => ({
            type: t.type,
            title: `${t.title} (copia)`,
            icon: t.icon,
            context: { ...t.context },
            closable: t.closable,
          })),
        });
      },

      minimizeContainer: (containerId, minimized) => {
        set((state) => ({
          layout: {
            ...state.layout,
            containers: state.layout.containers.map(c =>
              c.id === containerId ? { ...c, minimized } : c
            ),
          },
        }));
      },

      // ========================================
      // Layout Actions
      // ========================================

      resizeContainer: (containerId, width, height) => {
        const { emit } = get();

        set((state) => ({
          layout: {
            ...state.layout,
            containers: state.layout.containers.map(c =>
              c.id === containerId
                ? {
                  ...c,
                  position: {
                    ...c.position,
                    ...(width !== undefined && { width }),
                    ...(height !== undefined && { height }),
                  },
                }
                : c
            ),
          },
        }));

        emit('panel.resized', { containerId, data: { width, height } });
      },

      reorderContainers: (containerIds) => {
        const { emit } = get();

        set((state) => ({
          layout: {
            ...state.layout,
            containers: containerIds
              .map((id, index) => {
                const container = state.layout.containers.find(c => c.id === id);
                return container
                  ? { ...container, position: { ...container.position, order: index } }
                  : null;
              })
              .filter(Boolean) as DynamicContainer[],
          },
        }));

        emit('layout.changed', { data: { containerIds } });
      },

      setSplitDirection: (direction) => {
        const { emit } = get();

        set((state) => ({
          layout: { ...state.layout, splitDirection: direction },
        }));

        emit('layout.changed', { data: { splitDirection: direction } });
      },

      resetLayout: () => {
        const { emit } = get();

        set({ layout: initialLayout });

        emit('layout.changed', { data: { reset: true } });
      },

      // ========================================
      // Event System
      // ========================================

      subscribe: (callback) => {
        const { eventListeners } = get();
        eventListeners.add(callback);

        return () => {
          eventListeners.delete(callback);
        };
      },

      emit: (type, data = {}) => {
        const { eventListeners } = get();
        const event: PanelEvent = {
          type,
          timestamp: Date.now(),
          ...data,
        };

        eventListeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('[PanelStore] Event listener error:', error);
          }
        });
      },
    }),
    {
      name: 'fluxcore-panel-layout',
      partialize: (state) => ({
        layout: state.layout,
      }),
    }
  )
);

// ============================================================================
// Helper Hooks
// ============================================================================

export const useActiveContainer = () => {
  const layout = usePanelStore(state => state.layout);
  return layout.containers.find(c => c.id === layout.focusedContainerId) || layout.containers[0];
};

export const useContainers = () => {
  return usePanelStore(state => state.layout.containers);
};

export const useContainer = (containerId: string) => {
  return usePanelStore(state => state.layout.containers.find(c => c.id === containerId));
};

export const useTabs = (containerId: string) => {
  const container = useContainer(containerId);
  return container?.tabs || [];
};

export const useActiveTab = (containerId: string) => {
  const container = useContainer(containerId);
  if (!container?.activeTabId) return null;
  return container.tabs.find(t => t.id === container.activeTabId);
};
