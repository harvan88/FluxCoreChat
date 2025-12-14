/**
 * UI Store - Gestión del estado de la interfaz
 * TOTEM: Especificación Canónica de Comportamiento de Interfaz
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

import type { ActivityType, Account, Conversation } from '../types';

interface UIStore {
  // Activity bar state
  activeActivity: ActivityType;
  activityBarExpanded: boolean;
  
  // Sidebar state
  sidebarOpen: boolean;
  sidebarPinned: boolean;
  
  // Mobile state
  isMobile: boolean;
  mobileMenuOpen: boolean;

  // Selection state
  selectedAccountId: string | null;
  selectedConversationId: string | null;
  
  // Data cache
  accounts: Account[];
  conversations: Conversation[];

  // ActivityBar Actions
  setActiveActivity: (activity: ActivityType) => void;
  toggleActivityBar: () => void;
  setActivityBarExpanded: (expanded: boolean) => void;
  
  // Sidebar Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarPinned: () => void;
  setSidebarPinned: (pinned: boolean) => void;
  
  // Mobile Actions
  setIsMobile: (isMobile: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Selection Actions
  setSelectedAccount: (id: string | null) => void;
  setSelectedConversation: (id: string | null) => void;
  
  // Data Actions
  setAccounts: (accounts: Account[]) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  loadConversations: () => Promise<void>;
  
  // Account-specific data reset
  resetAccountData: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      activeActivity: 'conversations',
      activityBarExpanded: false,
      sidebarOpen: true,
      sidebarPinned: false,
      isMobile: false,
      mobileMenuOpen: false,
      selectedAccountId: null,
      selectedConversationId: null,
      accounts: [],
      conversations: [],

      // ActivityBar Actions
      setActiveActivity: (activity) => {
        const { activeActivity, sidebarOpen, sidebarPinned } = get();
        
        // Si hacemos click en la misma actividad y sidebar está abierto → toggle sidebar
        if (activity === activeActivity && sidebarOpen && !sidebarPinned) {
          set({ sidebarOpen: false });
          return;
        }
        
        // Si hacemos click en actividad diferente → abrir sidebar, colapsar ActivityBar
        set({ 
          activeActivity: activity,
          sidebarOpen: true,
          // Auto-collapse ActivityBar al seleccionar (según especificación)
          activityBarExpanded: false,
        });
      },
      
      toggleActivityBar: () => set((state) => ({ 
        activityBarExpanded: !state.activityBarExpanded 
      })),
      
      setActivityBarExpanded: (expanded) => set({ activityBarExpanded: expanded }),
      
      // Sidebar Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      toggleSidebarPinned: () => set((state) => ({ 
        sidebarPinned: !state.sidebarPinned 
      })),
      
      setSidebarPinned: (pinned) => set({ sidebarPinned: pinned }),
      
      // Mobile Actions
      setIsMobile: (isMobile) => set({ 
        isMobile,
        // En móvil, cerrar sidebar por defecto
        sidebarOpen: isMobile ? false : true,
      }),
      
      toggleMobileMenu: () => set((state) => ({ 
        mobileMenuOpen: !state.mobileMenuOpen 
      })),
      
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      
      // Selection Actions
      setSelectedAccount: (id) => set({ selectedAccountId: id }),
      
      setSelectedConversation: (id) => set({ selectedConversationId: id }),
      
      // Data Actions
      setAccounts: (accounts) => set({ accounts }),
      
      setConversations: (conversations) => set({ conversations }),
      
      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
        })),
      
      // Cargar conversaciones desde API
      loadConversations: async () => {
        const accountId = get().selectedAccountId;
        if (!accountId) {
          console.log('[UIStore] No account selected, skipping load conversations');
          return;
        }
        
        try {
          // MA-203: Pasar accountId para filtrar por cuenta específica
          const response = await api.getConversations(accountId);
          if (response.success && response.data) {
            set({ conversations: response.data });
          }
        } catch (error) {
          console.error('[UIStore] Failed to load conversations:', error);
        }
      },

      // Resetear datos específicos de cuenta
      resetAccountData: () => {
        console.log('[UIStore] Resetting account-specific data');
        set({
          conversations: [],
          selectedConversationId: null,
          // Mantener selectedAccountId ya que se actualiza externamente
        });
      },
    }),
    {
      name: 'fluxcore-ui',
      partialize: (state) => ({
        // Persistir preferencias de UI y selección de cuenta
        activityBarExpanded: state.activityBarExpanded,
        sidebarPinned: state.sidebarPinned,
        selectedAccountId: state.selectedAccountId, // VER-001: Persistir cuenta seleccionada
      }),
    }
  )
);
