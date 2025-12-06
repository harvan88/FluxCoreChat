/**
 * UI Store - Gestión del estado de la interfaz
 */

import { create } from 'zustand';
import type { ActivityType, Account, Conversation } from '../types';

interface UIStore {
  // Activity bar state
  activeActivity: ActivityType;
  sidebarOpen: boolean;

  // Selection state
  selectedAccountId: string | null;
  selectedConversationId: string | null;
  
  // Data cache
  accounts: Account[];
  conversations: Conversation[];

  // Actions
  setActiveActivity: (activity: ActivityType) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedAccount: (id: string | null) => void;
  setSelectedConversation: (id: string | null) => void;
  setAccounts: (accounts: Account[]) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeActivity: 'conversations',
  sidebarOpen: true,
  selectedAccountId: null,
  selectedConversationId: null,
  accounts: [],
  conversations: [],

  setActiveActivity: (activity) => set({ activeActivity: activity }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  setSelectedAccount: (id) => set({ selectedAccountId: id }),
  
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  
  setAccounts: (accounts) => set({ accounts }),
  
  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),
}));
