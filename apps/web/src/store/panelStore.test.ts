import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePanelStore } from './panelStore';

// Mock de persistencia de zustand
vi.mock('zustand/middleware', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        persist: (config: any) => (set: any, get: any, api: any) => config(set, get, api),
    };
});

describe('PanelStore - Identity & Tab Management', () => {
    beforeEach(() => {
        usePanelStore.getState().resetLayout();
    });

    it('should open a new tab when identity is unique', () => {
        const { openTab } = usePanelStore.getState();

        openTab('extensions', {
            type: 'extension',
            identity: 'assistant:1',
            title: 'Assistant 1',
            context: { assistantId: '1' },
            closable: true,
        });

        const state = usePanelStore.getState();
        expect(state.layout.containers[0].tabs).toHaveLength(1);
        expect(state.layout.containers[0].tabs[0].identity).toBe('assistant:1');
    });

    it('should focus existing tab instead of opening a duplicate when identity matches', () => {
        const { openTab } = usePanelStore.getState();

        // Abrir primer tab
        const firstResult = openTab('extensions', {
            type: 'extension',
            identity: 'assistant:unique',
            title: 'Assistant Unique',
            context: { assistantId: 'unique' },
            closable: true,
        });

        // Intentar abrir el mismo tab
        const secondResult = openTab('extensions', {
            type: 'extension',
            identity: 'assistant:unique',
            title: 'Assistant Unique (Duplicate)',
            context: { assistantId: 'unique' },
            closable: true,
        });

        const state = usePanelStore.getState();

        // Verificar que solo hay un tab
        expect(state.layout.containers[0].tabs).toHaveLength(1);
        // Verificar que el resultado indica que no es un nuevo container
        expect(secondResult.isNewContainer).toBe(false);
        // Verificar que el tabId es el mismo
        expect(secondResult.tabId).toBe(firstResult.tabId);
    });

    it('should allow opening multiple distinct identities', () => {
        const { openTab } = usePanelStore.getState();

        openTab('extensions', {
            type: 'extension',
            identity: 'assistant:1',
            title: 'Assistant 1',
            context: { assistantId: '1' },
            closable: true,
        });

        openTab('extensions', {
            type: 'extension',
            identity: 'assistant:2',
            title: 'Assistant 2',
            context: { assistantId: '2' },
            closable: true,
        });

        const state = usePanelStore.getState();
        expect(state.layout.containers[0].tabs).toHaveLength(2);
    });

    it('should handle legacy chat duplication check by chatId context', () => {
        const { openTab } = usePanelStore.getState();

        // Abrir chat (sin identity explícito)
        openTab('chats', {
            type: 'chat',
            title: 'Chat 1',
            context: { chatId: 'chat_abc' },
            closable: true,
        });

        // Abrir el mismo chat
        openTab('chats', {
            type: 'chat',
            title: 'Chat 1 Repetido',
            context: { chatId: 'chat_abc' },
            closable: true,
        });

        const state = usePanelStore.getState();
        expect(state.layout.containers[0].tabs).toHaveLength(1);
    });
});
