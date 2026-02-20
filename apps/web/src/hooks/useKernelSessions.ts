import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type { KernelSession, KernelSessionStatus } from '../types';
import { useUIStore } from '../store/uiStore';

interface UseKernelSessionsOptions {
  actorId?: string;
  statuses?: KernelSessionStatus[];
  pollIntervalMs?: number;
}

interface UseKernelSessionsResult {
  sessions: KernelSession[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => Promise<void>;
  hasSessions: boolean;
  selectedAccountId: string | null;
}

const DEFAULT_STATUSES: KernelSessionStatus[] = ['pending', 'active'];

export function useKernelSessions(options: UseKernelSessionsOptions = {}): UseKernelSessionsResult {
  const selectedAccountId = useUIStore((state) => state.selectedAccountId);
  const [sessions, setSessions] = useState<KernelSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const normalizedStatuses = useMemo<KernelSessionStatus[]>(() => {
    const source = options.statuses && options.statuses.length > 0 ? options.statuses : DEFAULT_STATUSES;
    return [...source].sort();
  }, [options.statuses]);

  const statusKey = useMemo(() => normalizedStatuses.join(','), [normalizedStatuses]);

  const fetchSessions = useCallback(async () => {
    if (!selectedAccountId) {
      setSessions([]);
      setError(null);
      setLastSyncedAt(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getKernelSessions({
        accountId: selectedAccountId,
        actorId: options.actorId,
        statuses: normalizedStatuses,
      });

      if (response.success && response.data) {
        setSessions(response.data.sessions ?? []);
        setLastSyncedAt(Date.now());
        setError(null);
      } else {
        setError(response.error || 'No se pudo obtener el estado de sesiones.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, options.actorId, normalizedStatuses]);

  const refresh = useCallback(async () => {
    await fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions, selectedAccountId, statusKey]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ accountId?: string }>).detail;
      if (!selectedAccountId) return;
      if (detail?.accountId && detail.accountId !== selectedAccountId) {
        return;
      }
      void refresh();
    };

    window.addEventListener('kernel:session_updated', handler);
    return () => window.removeEventListener('kernel:session_updated', handler);
  }, [refresh, selectedAccountId]);

  useEffect(() => {
    const handler = () => {
      void refresh();
    };

    window.addEventListener('account:changed', handler);
    return () => window.removeEventListener('account:changed', handler);
  }, [refresh]);

  useEffect(() => {
    if (!options.pollIntervalMs || options.pollIntervalMs <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, options.pollIntervalMs);

    return () => window.clearInterval(interval);
  }, [options.pollIntervalMs, refresh]);

  return {
    sessions,
    isLoading,
    error,
    lastSyncedAt,
    refresh,
    hasSessions: sessions.length > 0,
    selectedAccountId,
  };
}
