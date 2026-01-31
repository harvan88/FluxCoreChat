/**
 * Asset Monitoring Panel
 * 
 * Panel de monitoreo de assets con logs en tiempo real.
 * Integrado en MonitoringHub.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Copy, Trash2, Loader2, HardDrive, Upload, FileCheck, Shield } from 'lucide-react';
import { useAssetMonitorStore, type AssetMonitorFilters } from '../../store/assetMonitorStore';
import { useUIStore } from '../../store/uiStore';
import { useAccounts } from '../../store/accountStore';

interface FilterState {
    accountId: string;
    assetId: string;
    action: string;
    source: string;
}

const DEFAULT_FILTERS: FilterState = {
    accountId: '',
    assetId: '',
    action: '',
    source: '',
};

const ACTION_OPTIONS = [
    { value: '', label: 'Todas' },
    { value: 'upload_started', label: 'Upload Started' },
    { value: 'upload_completed', label: 'Upload Completed' },
    { value: 'upload_failed', label: 'Upload Failed' },
    { value: 'download', label: 'Download' },
    { value: 'url_signed', label: 'URL Signed' },
    { value: 'state_changed', label: 'State Changed' },
    { value: 'dedup_applied', label: 'Dedup Applied' },
    { value: 'deleted', label: 'Deleted' },
    { value: 'access_denied', label: 'Access Denied' },
];

const SOURCE_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'gateway', label: 'Gateway' },
    { value: 'registry', label: 'Registry' },
    { value: 'policy', label: 'Policy' },
    { value: 'audit', label: 'Audit' },
];

const copyViaFallback = (content: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!succeeded) {
        throw new Error('Fallback copy failed');
    }
};

export function AssetMonitoringPanel() {
    const { accounts } = useAccounts();
    const selectedAccountId = useUIStore((state) => state.selectedAccountId);

    const {
        logs,
        stats,
        isFetchingLogs,
        isFetchingStats: _isFetchingStats,
        fetchError,
        fetchLogs,
        fetchStats,
        pushLog,
        clearLogs,
    } = useAssetMonitorStore();
    void _isFetchingStats;

    const [filters, setFilters] = useState<FilterState>(() => ({
        ...DEFAULT_FILTERS,
        accountId: selectedAccountId ?? '',
    }));
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const filteredLogs = useMemo(() => {
        let result = [...logs];
        
        if (filters.source) {
            result = result.filter((log) => log.source === filters.source);
        }
        
        return result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [logs, filters.source]);

    const convertFilters = useCallback((): AssetMonitorFilters => {
        return {
            accountId: filters.accountId || undefined,
            assetId: filters.assetId || undefined,
            action: filters.action || undefined,
            limit: 200,
        };
    }, [filters]);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, accountId: selectedAccountId ?? '' }));
    }, [selectedAccountId]);

    useEffect(() => {
        if (selectedAccountId) {
            fetchLogs({ accountId: selectedAccountId, limit: 200 }).catch(() => undefined);
            fetchStats(selectedAccountId).catch(() => undefined);
        }
    }, [selectedAccountId, fetchLogs, fetchStats]);

    const handleRefresh = useCallback(async () => {
        await fetchLogs(convertFilters());
        if (filters.accountId) {
            await fetchStats(filters.accountId);
        }
    }, [fetchLogs, fetchStats, convertFilters, filters.accountId]);

    const handleCopy = useCallback(async (payload: unknown) => {
        const content = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(content);
            } else {
                copyViaFallback(content);
            }
            setCopyFeedback('Copiado al portapapeles');
        } catch (error) {
            console.warn('[AssetMonitoringPanel] clipboard copy failed', error);
            try {
                copyViaFallback(content);
                setCopyFeedback('Copiado al portapapeles');
            } catch (fallbackError) {
                setCopyFeedback('No se pudo copiar');
            }
        } finally {
            setTimeout(() => setCopyFeedback(null), 2000);
        }
    }, []);

    const handleDownload = useCallback(() => {
        const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'asset-logs.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [filteredLogs]);

    const handleClearLocalLogs = useCallback(() => {
        clearLogs(filters.accountId || undefined);
        pushLog({
            type: 'info',
            source: 'local',
            action: 'logs_cleared',
            message: 'Logs locales limpiados',
            accountId: filters.accountId || undefined,
        });
    }, [clearLogs, pushLog, filters.accountId]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getLogTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-400';
            case 'warning': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            default: return 'text-secondary';
        }
    };

    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'gateway': return <Upload size={14} className="text-blue-400" />;
            case 'registry': return <FileCheck size={14} className="text-green-400" />;
            case 'policy': return <Shield size={14} className="text-yellow-400" />;
            case 'audit': return <HardDrive size={14} className="text-purple-400" />;
            default: return <HardDrive size={14} className="text-secondary" />;
        }
    };

    return (
        <div className="h-full w-full bg-base text-primary flex flex-col">
            {/* Header */}
            <div className="border-b border-subtle px-5 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <HardDrive size={20} />
                        Asset Monitoring
                    </h2>
                    <p className="text-sm text-secondary">Logs de operaciones de assets en tiempo real.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm hover:bg-hover"
                        onClick={handleClearLocalLogs}
                    >
                        <Trash2 size={14} /> Limpiar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm hover:bg-hover"
                        onClick={handleDownload}
                    >
                        <Download size={14} /> Descargar
                    </button>
                    <button
                        className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-3 py-2 text-sm hover:opacity-90"
                        onClick={handleRefresh}
                        disabled={isFetchingLogs}
                    >
                        {isFetchingLogs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Actualizar
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="border border-subtle rounded-xl p-4 bg-surface">
                            <div className="text-2xl font-bold">{stats.totalAssets}</div>
                            <div className="text-sm text-secondary">Total Assets</div>
                        </div>
                        <div className="border border-subtle rounded-xl p-4 bg-surface">
                            <div className="text-2xl font-bold">{formatBytes(stats.totalSizeBytes)}</div>
                            <div className="text-sm text-secondary">Storage Usado</div>
                        </div>
                        <div className="border border-subtle rounded-xl p-4 bg-surface">
                            <div className="text-2xl font-bold text-green-400">{stats.byStatus?.ready || 0}</div>
                            <div className="text-sm text-secondary">Assets Ready</div>
                        </div>
                        <div className="border border-subtle rounded-xl p-4 bg-surface">
                            <div className="text-2xl font-bold text-yellow-400">{stats.byStatus?.pending || 0}</div>
                            <div className="text-sm text-secondary">Assets Pending</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <section className="border border-subtle rounded-xl p-4 bg-surface">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold">Filtros</h3>
                            <p className="text-sm text-secondary">Filtra logs por cuenta, acción o fuente.</p>
                        </div>
                        {copyFeedback && <span className="text-xs text-secondary">{copyFeedback}</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div>
                            <label className="text-xs uppercase text-secondary">Cuenta</label>
                            <select
                                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                                value={filters.accountId}
                                onChange={(e) => setFilters((prev) => ({ ...prev, accountId: e.target.value }))}
                            >
                                <option value="">Todas</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.displayName || account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-secondary">Asset ID</label>
                            <input
                                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                                value={filters.assetId}
                                onChange={(e) => setFilters((prev) => ({ ...prev, assetId: e.target.value }))}
                                placeholder="UUID del asset"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-secondary">Acción</label>
                            <select
                                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                                value={filters.action}
                                onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
                            >
                                {ACTION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs uppercase text-secondary">Fuente</label>
                            <select
                                className="w-full mt-1 rounded-lg border border-subtle bg-base px-3 py-2 text-sm"
                                value={filters.source}
                                onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
                            >
                                {SOURCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white py-2 text-sm hover:opacity-90"
                                onClick={handleRefresh}
                                disabled={isFetchingLogs}
                            >
                                {isFetchingLogs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Buscar
                            </button>
                        </div>
                    </div>
                    {fetchError && <p className="text-xs text-error mt-2">{fetchError}</p>}
                </section>

                {/* Logs Table */}
                <section className="border border-subtle rounded-xl bg-surface">
                    <div className="p-4 border-b border-subtle flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Logs ({filteredLogs.length})</h3>
                            <p className="text-sm text-secondary">Eventos de assets ordenados por fecha.</p>
                        </div>
                        <button
                            className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-xs hover:bg-hover"
                            onClick={() => handleCopy(filteredLogs)}
                        >
                            <Copy size={14} /> Copiar todo
                        </button>
                    </div>
                    <div className="overflow-auto max-h-[50vh]">
                        {filteredLogs.length === 0 ? (
                            <div className="text-sm text-secondary p-4">No hay logs disponibles.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-secondary text-xs uppercase border-b border-subtle">
                                        <th className="px-4 py-2">Fecha</th>
                                        <th className="px-4 py-2">Fuente</th>
                                        <th className="px-4 py-2">Acción</th>
                                        <th className="px-4 py-2">Asset</th>
                                        <th className="px-4 py-2">Mensaje</th>
                                        <th className="px-4 py-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-subtle/60 hover:bg-hover/50">
                                            <td className="px-4 py-2 whitespace-nowrap text-secondary text-xs">
                                                {log.timestamp.toLocaleTimeString()}
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center gap-1">
                                                    {getSourceIcon(log.source)}
                                                    <span className="capitalize text-xs">{log.source}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`text-xs font-mono ${getLogTypeColor(log.type)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs font-mono">
                                                {log.assetId ? log.assetId.slice(0, 8) + '…' : '—'}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="text-sm">{log.message}</div>
                                                {log.data && (
                                                    <pre className="mt-1 text-xs text-secondary bg-base rounded-lg p-2 overflow-auto max-h-20">
                                                        {JSON.stringify(log.data, null, 2)}
                                                    </pre>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    className="inline-flex items-center gap-1 rounded-lg border border-subtle px-2 py-1 text-xs hover:bg-hover"
                                                    onClick={() => handleCopy(log)}
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
