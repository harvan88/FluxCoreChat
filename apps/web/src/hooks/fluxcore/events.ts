export const FLUXCORE_ASSISTANT_UPDATE_EVENT = 'fluxcore:assistant-update';

export type AssistantUpdateAction = 'create' | 'update' | 'delete' | 'activate';

export interface AssistantUpdateEventDetail {
  accountId: string;
  assistantId?: string;
  action: AssistantUpdateAction;
}

export function emitAssistantUpdateEvent(detail: AssistantUpdateEventDetail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AssistantUpdateEventDetail>(FLUXCORE_ASSISTANT_UPDATE_EVENT, {
      detail,
    }),
  );
}

export function subscribeAssistantUpdateEvent(handler: (detail: AssistantUpdateEventDetail) => void) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }

  const wrapped = (event: Event) => {
    const customEvent = event as CustomEvent<AssistantUpdateEventDetail>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  window.addEventListener(FLUXCORE_ASSISTANT_UPDATE_EVENT, wrapped);
  return () => window.removeEventListener(FLUXCORE_ASSISTANT_UPDATE_EVENT, wrapped);
}
