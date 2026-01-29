import { create } from 'zustand';
import { api } from '../services/api';
import type { AccountDeletionLog, AccountOrphanReference } from '../types';

const MAX_LOGS = 500;

export type LogSource = 'local' | 'backend';

type LogLevel = 'info' | 'error' | 'warn' | 'success';

export interface AccountDeletionDebugLog {
  id: string;
  accountId?: string;
  jobId?: string;
  source: LogSource;
  type: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
}

export interface AccountDeletionLogFilters {
  limit?: number;
  accountId?: string;
  jobId?: string;
  status?: string;
  createdAfter?: string;
  createdBefore?: string;
}

interface AccountDeletionMonitorState {
  logs: AccountDeletionDebugLog[];
  isFetchingLogs: boolean;
  fetchError: string | null;
  orphans: AccountOrphanReference[];
  isFetchingOrphans: boolean;
  orphanError: string | null;
  auditPrefillAccountId: string | null;
  pushLog: (log: Partial<AccountDeletionDebugLog> & { type: LogLevel; message: string }) => void;
  clearLogs: (accountId?: string) => void;
  fetchLogs: (filters?: AccountDeletionLogFilters) => Promise<void>;
  fetchOrphans: (sampleLimit?: number) => Promise<void>;
  setAuditPrefillAccountId: (accountId: string | null) => void;
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const statusToType = (status: string | undefined): LogLevel => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('fail') || normalized.includes('error')) return 'error';
  if (normalized.includes('warn')) return 'warn';
  if (normalized.includes('complete') || normalized.includes('success')) return 'success';
  return 'info';
};

const mapServerLogToDebug = (log: AccountDeletionLog): AccountDeletionDebugLog => ({
  id: log.id,
  accountId: log.accountId,
  jobId: log.jobId ?? undefined,
  source: 'backend',
  type: statusToType(log.status),
  message: log.reason || log.status,
  data: log.details,
  timestamp: new Date(log.createdAt),
});

const mergeBackendLogs = (
  existing: AccountDeletionDebugLog[],
  incoming: AccountDeletionDebugLog[],
  filters?: AccountDeletionLogFilters,
): AccountDeletionDebugLog[] => {
  const shouldDrop = (log: AccountDeletionDebugLog) => {
    if (log.source !== 'backend') return false;
    if (!filters || (!filters.accountId && !filters.jobId)) {
      return true;
    }
    if (filters.accountId && log.accountId !== filters.accountId) {
      return false;
    }
    if (filters.jobId && log.jobId !== filters.jobId) {
      return false;
    }
    return true;
  };

  const retained = existing.filter((log) => !shouldDrop(log));
  const merged = [...retained, ...incoming].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (merged.length > MAX_LOGS) {
    return merged.slice(merged.length - MAX_LOGS);
  }
  return merged;
};

export const useAccountDeletionMonitorStore = create<AccountDeletionMonitorState>((set, get) => ({
  logs: [],
  isFetchingLogs: false,
  fetchError: null,
  orphans: [],
  isFetchingOrphans: false,
  orphanError: null,
  auditPrefillAccountId: null,
  pushLog: (log) => {
    const entry: AccountDeletionDebugLog = {
      id: log.id ?? randomId(),
      accountId: log.accountId,
      jobId: log.jobId,
      source: log.source ?? 'local',
      type: log.type,
      message: log.message,
      data: log.data,
      timestamp: log.timestamp ?? new Date(),
    };

    set((state) => {
      const next = [...state.logs, entry];
      if (next.length > MAX_LOGS) {
        next.shift();
      }
      return { logs: next };
    });
  },
  clearLogs: (accountId) => {
    set((state) => ({
      logs: accountId ? state.logs.filter((log) => log.accountId !== accountId) : [],
    }));
  },
  fetchLogs: async (filters) => {
    set({ isFetchingLogs: true, fetchError: null });
    try {
      const response = await api.getAccountDeletionLogs(filters ?? {});
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudieron obtener los logs');
      }

      const mapped = response.data.map(mapServerLogToDebug);
      set((state) => ({
        logs: mergeBackendLogs(state.logs, mapped, filters),
        isFetchingLogs: false,
      }));
    } catch (error: any) {
      set({
        isFetchingLogs: false,
        fetchError: error?.message || 'Error al obtener logs',
      });
    }
  },
  fetchOrphans: async (sampleLimit) => {
    set({ isFetchingOrphans: true, orphanError: null });
    try {
      const response = await api.getAccountOrphanReferences(sampleLimit);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudieron obtener las referencias huérfanas');
      }

      set({ orphans: response.data, isFetchingOrphans: false });
    } catch (error: any) {
      set({
        isFetchingOrphans: false,
        orphanError: error?.message || 'Error al obtener referencias huérfanas',
      });
    }
  },
  setAuditPrefillAccountId: (accountId) => {
    set({ auditPrefillAccountId: accountId });
  },
}));
