import { create } from 'zustand';
import { generateUUID } from '../utils/uuid';

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

interface AccountDeletionMonitorState {
  logs: AccountDeletionDebugLog[];
  pushLog: (log: Partial<AccountDeletionDebugLog> & { type: LogLevel; message: string }) => void;
  clearLogs: (accountId?: string) => void;
}

const randomId = () => generateUUID();

export const useAccountDeletionMonitorStore = create<AccountDeletionMonitorState>((set, _get) => ({
  logs: [],
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
}));
