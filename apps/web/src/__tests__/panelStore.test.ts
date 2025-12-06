/**
 * Panel Stack Manager Tests
 * TOTEM PARTE 11 Compliance Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { usePanelStore } from '../store/panelStore';

// Reset store between tests
beforeEach(() => {
  usePanelStore.setState({
    layout: {
      containers: [],
      splitDirection: 'horizontal',
      maxContainers: 3,
      focusedContainerId: null,
      version: 1,
    },
    eventListeners: new Set(),
  });
});

describe('Panel Stack Manager', () => {
  // ===========================================================================
  // Container Tests
  // ===========================================================================
  
  describe('Container Management', () => {
    it('should open a new container', () => {
      const { openContainer, layout } = usePanelStore.getState();
      
      const result = openContainer('chats');
      
      expect(result.success).toBe(true);
      expect(result.containerId).toBeTruthy();
      expect(usePanelStore.getState().layout.containers).toHaveLength(1);
    });

    it('should respect max containers limit (3)', () => {
      const { openContainer } = usePanelStore.getState();
      
      // Open 3 containers
      openContainer('chats');
      openContainer('contacts');
      openContainer('settings');
      
      // Try to open 4th
      const result = openContainer('extensions');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum');
      expect(usePanelStore.getState().layout.containers).toHaveLength(3);
    });

    it('should close a container', () => {
      const { openContainer, closeContainer } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      expect(usePanelStore.getState().layout.containers).toHaveLength(1);
      
      const closed = closeContainer(containerId);
      
      expect(closed).toBe(true);
      expect(usePanelStore.getState().layout.containers).toHaveLength(0);
    });

    it('should not close pinned container without force', () => {
      const { openContainer, closeContainer, pinContainer } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      pinContainer(containerId, true);
      
      const closed = closeContainer(containerId);
      
      expect(closed).toBe(false);
      expect(usePanelStore.getState().layout.containers).toHaveLength(1);
    });

    it('should close pinned container with force=true', () => {
      const { openContainer, closeContainer, pinContainer } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      pinContainer(containerId, true);
      
      const closed = closeContainer(containerId, true);
      
      expect(closed).toBe(true);
      expect(usePanelStore.getState().layout.containers).toHaveLength(0);
    });

    it('should duplicate a container', () => {
      const { openContainer, duplicateContainer, openTab } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      openTab('chats', {
        type: 'chat',
        title: 'Chat 1',
        context: { chatId: '123' },
        closable: true,
      });
      
      const result = duplicateContainer(containerId);
      
      expect(result.success).toBe(true);
      expect(usePanelStore.getState().layout.containers).toHaveLength(2);
      
      const duplicate = usePanelStore.getState().layout.containers[1];
      expect(duplicate.tabs).toHaveLength(1);
      expect(duplicate.tabs[0].title).toContain('copia');
    });

    it('should focus a container', () => {
      const { openContainer, focusContainer } = usePanelStore.getState();
      
      const { containerId: id1 } = openContainer('chats');
      const { containerId: id2 } = openContainer('contacts');
      
      focusContainer(id1);
      
      expect(usePanelStore.getState().layout.focusedContainerId).toBe(id1);
    });
  });

  // ===========================================================================
  // Tab Tests
  // ===========================================================================

  describe('Tab Management', () => {
    it('should open a tab in existing container', () => {
      const { openContainer, openTab } = usePanelStore.getState();
      
      openContainer('chats');
      
      const result = openTab('chats', {
        type: 'chat',
        title: 'Chat Test',
        context: { chatId: '123' },
        closable: true,
      });
      
      expect(result.tabId).toBeTruthy();
      expect(result.isNewContainer).toBe(false);
      
      const container = usePanelStore.getState().layout.containers[0];
      expect(container.tabs).toHaveLength(1);
      expect(container.activeTabId).toBe(result.tabId);
    });

    it('should open tab in new container if type not exists', () => {
      const { openTab } = usePanelStore.getState();
      
      const result = openTab('contacts', {
        type: 'contact',
        title: 'Contact',
        context: { contactId: '456' },
        closable: true,
      });
      
      expect(result.isNewContainer).toBe(true);
      expect(usePanelStore.getState().layout.containers).toHaveLength(1);
    });

    it('should close a tab', () => {
      const { openContainer, openTab, closeTab } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      const { tabId } = openTab('chats', {
        type: 'chat',
        title: 'Chat 1',
        context: {},
        closable: true,
      });
      
      const closed = closeTab(containerId, tabId);
      
      expect(closed).toBe(true);
      expect(usePanelStore.getState().layout.containers[0].tabs).toHaveLength(0);
    });

    it('should not close non-closable tab', () => {
      const { openContainer, openTab, closeTab } = usePanelStore.getState();
      
      const { containerId } = openContainer('settings');
      const { tabId } = openTab('settings', {
        type: 'settings',
        title: 'Settings',
        context: {},
        closable: false,
      });
      
      const closed = closeTab(containerId, tabId);
      
      expect(closed).toBe(false);
      expect(usePanelStore.getState().layout.containers[0].tabs).toHaveLength(1);
    });

    it('should activate a tab', () => {
      const { openContainer, openTab, activateTab } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      const { tabId: tab1 } = openTab('chats', {
        type: 'chat',
        title: 'Chat 1',
        context: {},
        closable: true,
      });
      const { tabId: tab2 } = openTab('chats', {
        type: 'chat',
        title: 'Chat 2',
        context: {},
        closable: true,
      });
      
      activateTab(containerId, tab1);
      
      const container = usePanelStore.getState().layout.containers[0];
      expect(container.activeTabId).toBe(tab1);
    });

    it('should move tab between containers', () => {
      const { openContainer, openTab, moveTab } = usePanelStore.getState();
      
      const { containerId: container1 } = openContainer('chats');
      const { containerId: container2 } = openContainer('contacts');
      
      const { tabId } = openTab('chats', {
        type: 'chat',
        title: 'Chat 1',
        context: {},
        closable: true,
      });
      
      const moved = moveTab(tabId, container1, container2);
      
      expect(moved).toBe(true);
      
      const containers = usePanelStore.getState().layout.containers;
      expect(containers[0].tabs).toHaveLength(0);
      expect(containers[1].tabs).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Layout Tests
  // ===========================================================================

  describe('Layout Management', () => {
    it('should change split direction', () => {
      const { setSplitDirection } = usePanelStore.getState();
      
      setSplitDirection('vertical');
      
      expect(usePanelStore.getState().layout.splitDirection).toBe('vertical');
    });

    it('should reorder containers', () => {
      const { openContainer, reorderContainers } = usePanelStore.getState();
      
      const { containerId: id1 } = openContainer('chats');
      const { containerId: id2 } = openContainer('contacts');
      const { containerId: id3 } = openContainer('settings');
      
      reorderContainers([id3, id1, id2]);
      
      const containers = usePanelStore.getState().layout.containers;
      expect(containers[0].id).toBe(id3);
      expect(containers[1].id).toBe(id1);
      expect(containers[2].id).toBe(id2);
    });

    it('should reset layout', () => {
      const { openContainer, resetLayout } = usePanelStore.getState();
      
      openContainer('chats');
      openContainer('contacts');
      
      resetLayout();
      
      expect(usePanelStore.getState().layout.containers).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Event System Tests
  // ===========================================================================

  describe('Event System', () => {
    it('should emit events when opening container', () => {
      const events: any[] = [];
      const { subscribe, openContainer } = usePanelStore.getState();
      
      const unsubscribe = subscribe((event) => {
        events.push(event);
      });
      
      openContainer('chats');
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('panel.opened');
      
      unsubscribe();
    });

    it('should emit events when closing tab', () => {
      const events: any[] = [];
      const { subscribe, openContainer, openTab, closeTab } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      const { tabId } = openTab('chats', {
        type: 'chat',
        title: 'Test',
        context: {},
        closable: true,
      });
      
      const unsubscribe = subscribe((event) => {
        events.push(event);
      });
      
      closeTab(containerId, tabId);
      
      expect(events.some(e => e.type === 'tab.closed')).toBe(true);
      
      unsubscribe();
    });

    it('should allow unsubscribing from events', () => {
      const events: any[] = [];
      const { subscribe, openContainer } = usePanelStore.getState();
      
      const unsubscribe = subscribe((event) => {
        events.push(event);
      });
      
      unsubscribe();
      
      openContainer('chats');
      
      expect(events).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Smart Priority Tests (TOTEM 11.4)
  // ===========================================================================

  describe('Smart Priority', () => {
    it('should prefer opening tab in existing container of same type', () => {
      const { openContainer, openTab } = usePanelStore.getState();
      
      openContainer('chats');
      
      // Open multiple tabs - should reuse container
      openTab('chats', { type: 'chat', title: 'Chat 1', context: {}, closable: true });
      openTab('chats', { type: 'chat', title: 'Chat 2', context: {}, closable: true });
      openTab('chats', { type: 'chat', title: 'Chat 3', context: {}, closable: true });
      
      expect(usePanelStore.getState().layout.containers).toHaveLength(1);
      expect(usePanelStore.getState().layout.containers[0].tabs).toHaveLength(3);
    });

    it('should open in active container when max reached', () => {
      const { openContainer, openTab } = usePanelStore.getState();
      
      openContainer('chats');
      openContainer('contacts');
      openContainer('settings');
      
      // Try to open a new type - should go to first container
      const result = openTab('extensions', {
        type: 'extension',
        title: 'Extension',
        context: {},
        closable: true,
      });
      
      expect(result.isNewContainer).toBe(false);
      expect(usePanelStore.getState().layout.containers).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Getter Tests
  // ===========================================================================

  describe('Getters', () => {
    it('should get container by id', () => {
      const { openContainer, getContainer } = usePanelStore.getState();
      
      const { containerId } = openContainer('chats');
      const container = getContainer(containerId);
      
      expect(container).toBeDefined();
      expect(container?.type).toBe('chats');
    });

    it('should get container by type', () => {
      const { openContainer, getContainerByType } = usePanelStore.getState();
      
      openContainer('chats');
      const container = getContainerByType('chats');
      
      expect(container).toBeDefined();
      expect(container?.type).toBe('chats');
    });

    it('should get active container', () => {
      const { openContainer, focusContainer, getActiveContainer } = usePanelStore.getState();
      
      const { containerId: id1 } = openContainer('chats');
      const { containerId: id2 } = openContainer('contacts');
      
      focusContainer(id2);
      
      const active = getActiveContainer();
      expect(active?.id).toBe(id2);
    });

    it('should check if can open new container', () => {
      const { openContainer, canOpenNewContainer } = usePanelStore.getState();
      
      expect(canOpenNewContainer()).toBe(true);
      
      openContainer('chats');
      openContainer('contacts');
      openContainer('settings');
      
      expect(usePanelStore.getState().canOpenNewContainer()).toBe(false);
    });
  });
});
