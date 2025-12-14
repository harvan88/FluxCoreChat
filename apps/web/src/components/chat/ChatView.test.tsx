import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../../hooks/useOfflineFirst', () => ({
  useOfflineMessages: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: vi.fn().mockResolvedValue({}),
    refresh: vi.fn(),
  }),
  useConnectionStatus: () => 'online',
}));

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: 'connected',
    lastError: null,
    reconnectAttempts: 0,
    connect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock('../extensions', () => ({
  AISuggestionCard: () => null,
  useAISuggestions: () => ({
    suggestions: [],
    isGenerating: false,
    addSuggestion: vi.fn(),
    removeSuggestion: vi.fn(),
  }),
}));

import { ChatView } from './ChatView';

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const renderAsync = async () => {
    await act(async () => {
      root.render(ui);
    });
  };

  return {
    container,
    renderAsync,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('ChatView', () => {
  const originalRaf = window.requestAnimationFrame;

  beforeEach(() => {
    (HTMLElement.prototype as any).scrollTo = vi.fn();
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
    vi.restoreAllMocks();
  });

  it('should auto-scroll the messages container on mount', () => {
    const rendered = render(<ChatView conversationId="conv-123" accountId="acc-1" />);
    return rendered.renderAsync().then(() => {
      expect((HTMLElement.prototype as any).scrollTo).toHaveBeenCalled();
      rendered.unmount();
    });
  });
});
