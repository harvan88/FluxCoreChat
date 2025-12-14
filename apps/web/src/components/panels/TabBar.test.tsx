import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { TabBar } from './TabBar';
import { usePanelStore } from '../../store/panelStore';
import type { DynamicContainer } from '../../types/panels';

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('TabBar', () => {
  beforeEach(() => {
    usePanelStore.setState((state) => ({
      layout: {
        ...state.layout,
        containers: [],
        focusedContainerId: null,
      },
    }));
  });

  it('should truncate chat tab title and expose full title via tooltip', () => {
    const containerData: DynamicContainer = {
      id: 'c1',
      type: 'chats',
      tabs: [
        {
          id: 't1',
          type: 'chat',
          title: 'Alexander',
          context: { chatId: 'conv-1' },
          closable: true,
          createdAt: Date.now(),
        },
      ],
      activeTabId: 't1',
      pinned: false,
      parentId: null,
      childIds: [],
      position: { order: 0 },
      minimized: false,
      createdAt: Date.now(),
    };

    usePanelStore.setState((state) => ({
      layout: {
        ...state.layout,
        containers: [containerData],
        focusedContainerId: 'c1',
      },
    }));

    const { container, unmount } = render(<TabBar container={containerData} />);

    const titleSpan = container.querySelector('span.truncate');
    expect(titleSpan).toBeTruthy();
    expect(titleSpan?.textContent).toBe('Alexa…');
    expect(titleSpan?.getAttribute('title')).toBe('Alexander');

    const iconSpan = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '✉️'
    );
    expect(iconSpan).toBeTruthy();

    unmount();
  });
});
