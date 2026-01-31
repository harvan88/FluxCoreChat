/**
 * Asset Monitor Store
 * 
 * Store para logs de monitoreo de assets en tiempo real.
 */

import { create } from 'zustand';

export interface AssetDebugLog {
    id: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
    source: 'gateway' | 'registry' | 'policy' | 'audit' | 'local';
    action: string;
    message: string;
    assetId?: string;
    sessionId?: string;
    accountId?: string;
    data?: Record<string, unknown>;
}

export interface AssetStats {
    totalAssets: number;
    totalSizeBytes: number;
    byStatus: Record<string, number>;
    byScope: Record<string, number>;
}

export interface AssetMonitorFilters {
    accountId?: string;
    assetId?: string;
    action?: string;
    source?: string;
    limit?: number;
}

interface AssetMonitorState {
    logs: AssetDebugLog[];
    stats: AssetStats | null;
    isFetchingLogs: boolean;
    isFetchingStats: boolean;
    fetchError: string | null;
    
    // Actions
    pushLog: (log: Omit<AssetDebugLog, 'id' | 'timestamp'>) => void;
    clearLogs: (accountId?: string) => void;
    fetchLogs: (filters: AssetMonitorFilters) => Promise<void>;
    fetchStats: (accountId: string) => Promise<void>;
}

const MAX_LOGS = 500;

const randomId = () => Math.random().toString(36).substring(2, 15);

export const useAssetMonitorStore = create<AssetMonitorState>((set, _get) => ({
    logs: [],
    stats: null,
    isFetchingLogs: false,
    isFetchingStats: false,
    fetchError: null,

    pushLog: (log) => {
        const entry: AssetDebugLog = {
            id: randomId(),
            timestamp: new Date(),
            ...log,
        };

        set((state) => {
            const newLogs = [entry, ...state.logs];
            if (newLogs.length > MAX_LOGS) {
                return { logs: newLogs.slice(0, MAX_LOGS) };
            }
            return { logs: newLogs };
        });
    },

    clearLogs: (accountId) => {
        if (accountId) {
            set((state) => ({
                logs: state.logs.filter((log) => log.accountId !== accountId),
            }));
        } else {
            set({ logs: [] });
        }
    },

    fetchLogs: async (filters) => {
        set({ isFetchingLogs: true, fetchError: null });

        try {
            const params = new URLSearchParams();
            if (filters.accountId) params.set('accountId', filters.accountId);
            if (filters.assetId) params.set('assetId', filters.assetId);
            if (filters.action) params.set('action', filters.action);
            if (filters.limit) params.set('limit', filters.limit.toString());

            const response = await fetch(`/api/assets/debug/logs?${params.toString()}`);
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                const logs: AssetDebugLog[] = result.data.map((log: any) => ({
                    id: log.id,
                    timestamp: new Date(log.timestamp),
                    type: log.success === 'false' ? 'error' : 'info',
                    source: mapActionToSource(log.action),
                    action: log.action,
                    message: formatLogMessage(log),
                    assetId: log.assetId,
                    sessionId: log.sessionId,
                    accountId: log.accountId,
                    data: log.metadata,
                }));

                set({ logs, isFetchingLogs: false });
            } else {
                set({ fetchError: result.error || 'Failed to fetch logs', isFetchingLogs: false });
            }
        } catch (error) {
            set({ fetchError: String(error), isFetchingLogs: false });
        }
    },

    fetchStats: async (accountId) => {
        set({ isFetchingStats: true });

        try {
            const response = await fetch(`/api/assets/debug/stats/${accountId}`);
            const result = await response.json();

            if (result.success && result.data) {
                set({ stats: result.data, isFetchingStats: false });
            } else {
                set({ isFetchingStats: false });
            }
        } catch (error) {
            set({ isFetchingStats: false });
        }
    },
}));

function mapActionToSource(action: string): AssetDebugLog['source'] {
    if (action.startsWith('upload')) return 'gateway';
    if (action.includes('state') || action === 'dedup_applied') return 'registry';
    if (action === 'url_signed' || action === 'access_denied' || action === 'policy_evaluated') return 'policy';
    return 'audit';
}

function formatLogMessage(log: any): string {
    const action = log.action || 'unknown';
    const assetId = log.assetId ? log.assetId.substring(0, 8) + '...' : '';
    const sessionId = log.sessionId ? log.sessionId.substring(0, 8) + '...' : '';

    switch (action) {
        case 'upload_started':
            return `Upload started${sessionId ? ` (session: ${sessionId})` : ''}`;
        case 'upload_completed':
            return `Upload completed${assetId ? ` → asset: ${assetId}` : ''}`;
        case 'upload_failed':
            return `Upload failed: ${log.errorMessage || 'unknown error'}`;
        case 'download':
            return `Download${assetId ? `: ${assetId}` : ''}`;
        case 'url_signed':
            return `URL signed${assetId ? ` for ${assetId}` : ''} (TTL: ${log.metadata?.ttlSeconds || '?'}s)`;
        case 'state_changed':
            return `State changed${assetId ? ` for ${assetId}` : ''}: ${log.metadata?.from || '?'} → ${log.metadata?.to || '?'}`;
        case 'dedup_applied':
            return `Dedup applied${assetId ? ` for ${assetId}` : ''} → existing: ${log.metadata?.existingAssetId?.substring(0, 8) || '?'}...`;
        case 'deleted':
            return `Asset deleted${assetId ? `: ${assetId}` : ''}`;
        case 'purged':
            return `Asset purged${assetId ? `: ${assetId}` : ''}`;
        case 'access_denied':
            return `Access denied${assetId ? ` for ${assetId}` : ''}: ${log.errorMessage || 'unknown'}`;
        case 'linked':
            return `Asset linked${assetId ? `: ${assetId}` : ''} to ${log.metadata?.entityType || 'entity'}`;
        default:
            return `${action}${assetId ? ` (${assetId})` : ''}`;
    }
}
