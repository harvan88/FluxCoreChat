/**
 * useAssistantMode — FluxCore v8.3
 *
 * Single source of truth for the AI mode of the active assistant.
 * Reads/writes fluxcoreAssistants.timingConfig.mode via the new kernel endpoint.
 *
 * Replaces useAutomation for mode switching — automation_rules is the old architecture.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

export type AssistantMode = 'auto' | 'suggest' | 'off';

const MODE_UPDATE_EVENT = 'fluxcore:assistant-mode-update';

export function useAssistantMode(accountId: string | null) {
    const [mode, setModeState] = useState<AssistantMode>('off');
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const [assistantName, setAssistantName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadMode = useCallback(async () => {
        if (!accountId) return;
        try {
            const res = await api.getAssistantMode(accountId);
            if (res.success && res.data) {
                setModeState((res.data.mode as AssistantMode) ?? 'auto');
                setAssistantId(res.data.assistantId);
                setAssistantName(res.data.assistantName);
            }
        } catch (err) {
            console.warn('[useAssistantMode] Could not load mode:', err);
        }
    }, [accountId]);

    const setMode = useCallback(async (newMode: AssistantMode) => {
        if (!accountId) return;
        setIsLoading(true);
        try {
            const res = await api.setAssistantMode(accountId, newMode);
            if (res.success) {
                setModeState(newMode);
                window.dispatchEvent(new CustomEvent(MODE_UPDATE_EVENT, { detail: { accountId, mode: newMode } }));
            }
        } catch (err) {
            console.warn('[useAssistantMode] Could not set mode:', err);
        } finally {
            setIsLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        loadMode();

        const handler = (e: any) => {
            if (e.detail?.accountId === accountId) {
                setModeState(e.detail.mode as AssistantMode);
            }
        };
        window.addEventListener(MODE_UPDATE_EVENT, handler);
        return () => window.removeEventListener(MODE_UPDATE_EVENT, handler);
    }, [loadMode, accountId]);

    return { mode, assistantId, assistantName, isLoading, setMode, loadMode };
}
