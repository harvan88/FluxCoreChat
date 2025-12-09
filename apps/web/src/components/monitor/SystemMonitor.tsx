/**
 * SystemMonitor - Dashboard de monitoreo en tiempo real
 * Muestra estado de PostgreSQL, IndexedDB, endpoints y sincronización
 */

import { useEffect, useState, useCallback } from 'react';
import { db } from '../../db';
import { RefreshCw, Database, HardDrive, Wifi, WifiOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PostgresState {
  status: 'loading' | 'healthy' | 'degraded' | 'error';
  tables: Record<string, number>;
  totalRecords: number;
  responseTimeMs: number;
  errors?: string[];
  timestamp: string;
}

interface IndexedDBState {
  status: 'loading' | 'healthy' | 'error';
  tables: {
    messages: number;
    conversations: number;
    relationships: number;
    syncQueue: number;
  };
  pendingSync: number;
  timestamp: string;
}

interface EndpointStatus {
  name: string;
  url: string;
  status: 'loading' | 'ok' | 'error';
  responseTimeMs?: number;
  error?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function SystemMonitor() {
  const [postgres, setPostgres] = useState<PostgresState>({
    status: 'loading',
    tables: {},
    totalRecords: 0,
    responseTimeMs: 0,
    timestamp: '',
  });

  const [indexedDB, setIndexedDB] = useState<IndexedDBState>({
    status: 'loading',
    tables: { messages: 0, conversations: 0, relationships: 0, syncQueue: 0 },
    pendingSync: 0,
    timestamp: '',
  });

  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Check PostgreSQL
  const checkPostgres = useCallback(async () => {
    try {
      const start = Date.now();
      const res = await fetch(`${API_BASE}/health/diagnostic`);
      const data = await res.json();
      
      setPostgres({
        status: data.status || 'healthy',
        tables: data.tables || {},
        totalRecords: data.totalRecords || 0,
        responseTimeMs: data.responseTimeMs || (Date.now() - start),
        errors: data.errors,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      setPostgres(prev => ({
        ...prev,
        status: 'error',
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      }));
    }
  }, []);

  // Check IndexedDB
  const checkIndexedDB = useCallback(async () => {
    try {
      const [messages, conversations, relationships, syncQueue] = await Promise.all([
        db.messages.count(),
        db.conversations.count(),
        db.relationships.count(),
        db.syncQueue.count(),
      ]);

      const pendingSync = await db.syncQueue.where('status').equals('pending').count();

      setIndexedDB({
        status: 'healthy',
        tables: { messages, conversations, relationships, syncQueue },
        pendingSync,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setIndexedDB(prev => ({
        ...prev,
        status: 'error',
        timestamp: new Date().toISOString(),
      }));
    }
  }, []);

  // Check Endpoints
  const checkEndpoints = useCallback(async () => {
    const endpointList = [
      { name: 'Health', url: '/health' },
      { name: 'Health Ready', url: '/health/ready' },
      { name: 'Accounts', url: '/accounts' },
      { name: 'Relationships', url: '/relationships' },
    ];

    const results: EndpointStatus[] = [];

    for (const ep of endpointList) {
      try {
        const start = Date.now();
        const res = await fetch(`${API_BASE}${ep.url}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        
        results.push({
          name: ep.name,
          url: ep.url,
          status: res.ok ? 'ok' : 'error',
          responseTimeMs: Date.now() - start,
          error: res.ok ? undefined : `HTTP ${res.status}`,
        });
      } catch (error) {
        results.push({
          name: ep.name,
          url: ep.url,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    setEndpoints(results);
  }, []);

  // Full refresh
  const refresh = useCallback(async () => {
    setLastUpdate(new Date());
    await Promise.all([
      checkPostgres(),
      checkIndexedDB(),
      checkEndpoints(),
    ]);
  }, [checkPostgres, checkIndexedDB, checkEndpoints]);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    refresh();

    if (autoRefresh) {
      const interval = setInterval(refresh, 5000); // Every 5 seconds
      return () => clearInterval(interval);
    }
  }, [refresh, autoRefresh]);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-base p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">🔍 System Monitor</h1>
          <div className="flex items-center gap-4">
            {isOnline ? (
              <span className="flex items-center gap-2 text-green-500">
                <Wifi className="w-5 h-5" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-500">
                <WifiOff className="w-5 h-5" /> Offline
              </span>
            )}
            <label className="flex items-center gap-2 text-secondary">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (5s)
            </label>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-blue-600"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        <p className="text-muted text-sm">
          Last update: {lastUpdate.toLocaleTimeString()}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PostgreSQL Card */}
          <div className="bg-surface border border-subtle rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-primary">PostgreSQL</h2>
              <StatusIcon status={postgres.status} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Response Time</span>
                <span className="text-primary font-mono">{postgres.responseTimeMs}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Total Records</span>
                <span className="text-primary font-mono">{postgres.totalRecords}</span>
              </div>

              <hr className="border-subtle" />

              <div className="text-sm font-medium text-secondary mb-2">Tables:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(postgres.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between bg-elevated px-3 py-2 rounded">
                    <span className="text-secondary">{table}</span>
                    <span className={`font-mono ${count === 0 ? 'text-muted' : 'text-primary'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              {postgres.errors && postgres.errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                  {postgres.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* IndexedDB Card */}
          <div className="bg-surface border border-subtle rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-semibold text-primary">IndexedDB (Local)</h2>
              <StatusIcon status={indexedDB.status} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Pending Sync</span>
                <span className={`font-mono ${indexedDB.pendingSync > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {indexedDB.pendingSync}
                </span>
              </div>

              <hr className="border-subtle" />

              <div className="text-sm font-medium text-secondary mb-2">Tables:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(indexedDB.tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between bg-elevated px-3 py-2 rounded">
                    <span className="text-secondary">{table}</span>
                    <span className={`font-mono ${count === 0 ? 'text-muted' : 'text-primary'}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Comparison */}
        <div className="bg-surface border border-subtle rounded-lg p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">🔄 Sync Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle">
                  <th className="text-left py-2 px-4 text-secondary">Entity</th>
                  <th className="text-right py-2 px-4 text-secondary">PostgreSQL</th>
                  <th className="text-right py-2 px-4 text-secondary">IndexedDB</th>
                  <th className="text-right py-2 px-4 text-secondary">Diff</th>
                  <th className="text-center py-2 px-4 text-secondary">Status</th>
                </tr>
              </thead>
              <tbody>
                {['messages', 'conversations', 'relationships'].map((entity) => {
                  const pgCount = postgres.tables[entity] ?? 0;
                  const idbCount = indexedDB.tables[entity as keyof typeof indexedDB.tables] ?? 0;
                  const diff = pgCount - idbCount;
                  const isMatch = diff === 0;

                  return (
                    <tr key={entity} className="border-b border-subtle/50">
                      <td className="py-2 px-4 text-primary capitalize">{entity}</td>
                      <td className="text-right py-2 px-4 font-mono text-primary">{pgCount}</td>
                      <td className="text-right py-2 px-4 font-mono text-primary">{idbCount}</td>
                      <td className={`text-right py-2 px-4 font-mono ${diff === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="text-center py-2 px-4">
                        {isMatch ? (
                          <span className="text-green-500">✓ Match</span>
                        ) : (
                          <span className="text-yellow-500">⚠ Sync needed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Endpoints Status */}
        <div className="bg-surface border border-subtle rounded-lg p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">🌐 API Endpoints</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {endpoints.map((ep) => (
              <div
                key={ep.url}
                className={`p-4 rounded-lg border ${
                  ep.status === 'ok'
                    ? 'bg-green-500/10 border-green-500/30'
                    : ep.status === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-gray-500/10 border-gray-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon status={ep.status} />
                  <span className="font-medium text-primary">{ep.name}</span>
                </div>
                <div className="text-xs text-muted font-mono">{ep.url}</div>
                {ep.responseTimeMs && (
                  <div className="text-xs text-secondary mt-1">{ep.responseTimeMs}ms</div>
                )}
                {ep.error && (
                  <div className="text-xs text-red-400 mt-1">{ep.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface border border-subtle rounded-lg p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">⚡ Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={async () => {
                await db.syncQueue.clear();
                await db.messages.clear();
                await db.conversations.clear();
                await db.relationships.clear();
                refresh();
              }}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30"
            >
              🗑️ Clear IndexedDB
            </button>
            <a
              href={`${API_BASE}/swagger`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30"
            >
              📖 Swagger UI
            </a>
            <a
              href={`${API_BASE}/health/diagnostic`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30"
            >
              🔍 Raw Diagnostic JSON
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemMonitor;
