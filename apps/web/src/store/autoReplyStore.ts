import { create } from 'zustand';

type AutoReplyPhase = 'waiting' | 'typing' | 'sending';

interface ConversationAutoReplyState {
  status: AutoReplyPhase;
  suggestionId: string;
  eta?: number;
  message?: string;
  lastUpdatedAt: number;
  durationMs?: number;
}

interface AutoReplyStore {
  conversations: Record<string, ConversationAutoReplyState>;
  setWaiting: (conversationId: string, suggestionId: string, delayMs: number) => void;
  setTyping: (conversationId: string, suggestionId: string, delayMs: number) => void;
  setSending: (conversationId: string, suggestionId: string) => void;
  cancel: (conversationId: string) => void;
  setWaitingBySuggestion: (suggestionId: string, delayMs: number) => void;
  setTypingBySuggestion: (suggestionId: string, delayMs: number) => void;
  setSendingBySuggestion: (suggestionId: string) => void;
  cancelBySuggestion: (suggestionId: string) => void;
  complete: (conversationId: string) => void;
}

function buildState(
  status: AutoReplyPhase,
  suggestionId: string,
  delayMs?: number,
  message?: string
): ConversationAutoReplyState {
  return {
    status,
    suggestionId,
    eta: delayMs ? Date.now() + delayMs : undefined,
    durationMs: delayMs,
    message,
    lastUpdatedAt: Date.now(),
  };
}

export const useAutoReplyStore = create<AutoReplyStore>((set, get) => ({
  conversations: {},

  setWaiting: (conversationId, suggestionId, delayMs) => {
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: buildState('waiting', suggestionId, delayMs, 'Esperando actividad'),
      },
    }));
  },

  setTyping: (conversationId, suggestionId, delayMs) => {
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: buildState('typing', suggestionId, delayMs, 'Fluxi está redactando'),
      },
    }));
  },

  setSending: (conversationId, suggestionId) => {
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: buildState('sending', suggestionId, undefined, 'Enviando respuesta automática'),
      },
    }));
  },

  cancel: (conversationId) => {
    set((state) => {
      if (!state.conversations[conversationId]) return state;
      const next = { ...state.conversations };
      delete next[conversationId];
      return { conversations: next };
    });
  },

  setWaitingBySuggestion: (suggestionId, delayMs) => {
    set((state) => {
      let updated = false;
      const next = Object.entries(state.conversations).reduce<Record<string, ConversationAutoReplyState>>(
        (acc, [conversationId, value]) => {
          if (value.suggestionId === suggestionId) {
            acc[conversationId] = buildState('waiting', suggestionId, delayMs, 'Esperando para enviar respuesta automática');
            updated = true;
            return acc;
          }
          acc[conversationId] = value;
          return acc;
        },
        {}
      );
      return updated ? { conversations: next } : state;
    });
  },

  setTypingBySuggestion: (suggestionId, delayMs) => {
    set((state) => {
      let updated = false;
      const next = Object.entries(state.conversations).reduce<Record<string, ConversationAutoReplyState>>(
        (acc, [conversationId, value]) => {
          if (value.suggestionId === suggestionId) {
            acc[conversationId] = buildState('typing', suggestionId, delayMs, 'Fluxi está redactando');
            updated = true;
            return acc;
          }
          acc[conversationId] = value;
          return acc;
        },
        {}
      );
      return updated ? { conversations: next } : state;
    });
  },

  setSendingBySuggestion: (suggestionId) => {
    set((state) => {
      let updated = false;
      const next = Object.entries(state.conversations).reduce<Record<string, ConversationAutoReplyState>>(
        (acc, [conversationId, value]) => {
          if (value.suggestionId === suggestionId) {
            acc[conversationId] = buildState('sending', suggestionId, undefined, 'Enviando respuesta automática');
            updated = true;
            return acc;
          }
          acc[conversationId] = value;
          return acc;
        },
        {}
      );
      return updated ? { conversations: next } : state;
    });
  },

  cancelBySuggestion: (suggestionId) => {
    set((state) => {
      let removed = false;
      const nextEntries = Object.entries(state.conversations).filter(([_, value]) => {
        if (value.suggestionId === suggestionId) {
          removed = true;
          return false;
        }
        return true;
      });
      return removed ? { conversations: Object.fromEntries(nextEntries) } : state;
    });
  },

  complete: (conversationId) => {
    const { conversations } = get();
    if (!conversations[conversationId]) {
      return;
    }
    set((state) => {
      const next = { ...state.conversations };
      delete next[conversationId];
      return { conversations: next };
    });
  },
}));
