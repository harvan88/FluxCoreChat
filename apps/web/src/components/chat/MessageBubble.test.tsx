import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types';

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

describe('MessageBubble', () => {
  const baseMessage: Message = {
    id: 'm1',
    conversationId: 'c1',
    senderAccountId: 'a1',
    content: { text: 'hola' },
    type: 'outgoing',
    generatedBy: 'human',
    status: 'synced',
    createdAt: new Date().toISOString(),
  };

  it('should align own messages to the right', () => {
    const { container, unmount } = render(
      <MessageBubble message={baseMessage} isOwn={true} />
    );

    const wrapper = container.firstElementChild as HTMLElement | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain('justify-end');

    unmount();
  });

  it('should align received messages to the left', () => {
    const { container, unmount } = render(
      <MessageBubble message={baseMessage} isOwn={false} />
    );

    const wrapper = container.firstElementChild as HTMLElement | null;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain('justify-start');

    unmount();
  });

  it('should render reply preview using canonical background class', () => {
    const replyTo: Message = {
      ...baseMessage,
      id: 'm0',
      content: { text: 'mensaje original' },
    };

    const { container, unmount } = render(
      <MessageBubble message={baseMessage} isOwn={true} replyToMessage={replyTo} />
    );

    const replyButton = container.querySelector('button.bg-active');
    expect(replyButton).toBeTruthy();

    unmount();
  });
});
