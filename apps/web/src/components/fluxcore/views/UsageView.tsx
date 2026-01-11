/**
 * Usage View (Dashboard)
 * 
 * Panel de métricas y uso de FluxCore.
 * Muestra estadísticas de consumo, tokens utilizados, etc.
 */

import { useState, useEffect } from 'react';
import { Bot, FileText, Database, Zap } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

interface UsageStats {
  assistantsCount: number;
  instructionsCount: number;
  vectorStoresCount: number;
  totalTokensUsed: number;
  totalStorageBytes: number;
}

interface UsageViewProps {
  accountId: string;
}

export function UsageView({ accountId }: UsageViewProps) {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<UsageStats>({
    assistantsCount: 0,
    instructionsCount: 0,
    vectorStoresCount: 0,
    totalTokensUsed: 0,
    totalStorageBytes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId && token) loadStats();
  }, [accountId, token]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Cargar datos de cada entidad
      const [assistantsRes, instructionsRes, storesRes] = await Promise.all([
        fetch(`/api/fluxcore/assistants?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/instructions?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/vector-stores?accountId=${accountId}`, { headers }),
      ]);

      const [assistantsData, instructionsData, storesData] = await Promise.all([
        assistantsRes.json(),
        instructionsRes.json(),
        storesRes.json(),
      ]);

      const assistants = assistantsData.success ? assistantsData.data : [];
      const instructions = instructionsData.success ? instructionsData.data : [];
      const stores = storesData.success ? storesData.data : [];

      setStats({
        assistantsCount: assistants.length,
        instructionsCount: instructions.length,
        vectorStoresCount: stores.length,
        totalTokensUsed: assistants.reduce((acc: number, a: any) => acc + (a.tokensUsed || 0), 0),
        totalStorageBytes: stores.reduce((acc: number, s: any) => acc + (s.sizeBytes || 0), 0),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const StatCard = ({ 
    icon, 
    label, 
    value, 
    subvalue 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    subvalue?: string;
  }) => (
    <div className="bg-surface border border-subtle rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-accent">{icon}</span>
        <span className="text-secondary text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-primary">{value}</div>
      {subvalue && (
        <div className="text-xs text-muted mt-1">{subvalue}</div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-subtle">
        <h2 className="text-lg font-semibold text-primary">Dashboard de Uso</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">
            Cargando estadísticas...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Bot size={20} />}
                label="Asistentes"
                value={stats.assistantsCount}
                subvalue="Configurados"
              />
              <StatCard
                icon={<FileText size={20} />}
                label="Instrucciones"
                value={stats.instructionsCount}
                subvalue="System prompts"
              />
              <StatCard
                icon={<Database size={20} />}
                label="Vector Stores"
                value={stats.vectorStoresCount}
                subvalue="Bases de conocimiento"
              />
              <StatCard
                icon={<Zap size={20} />}
                label="Tokens Usados"
                value={formatNumber(stats.totalTokensUsed)}
                subvalue="Este mes"
              />
            </div>

            {/* Storage usage */}
            <div className="bg-surface border border-subtle rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-primary">Almacenamiento</h3>
                <span className="text-secondary text-sm">
                  {formatBytes(stats.totalStorageBytes)} usado
                </span>
              </div>
              <div className="h-2 bg-elevated rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${Math.min((stats.totalStorageBytes / (100 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted">
                <span>0 MB</span>
                <span>100 MB</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-surface border border-subtle rounded-lg p-6">
              <h3 className="font-medium text-primary mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="flex items-center gap-2 px-4 py-3 bg-elevated hover:bg-hover rounded-lg text-left transition-colors">
                  <Bot size={18} className="text-accent" />
                  <span className="text-primary text-sm">Crear asistente</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-3 bg-elevated hover:bg-hover rounded-lg text-left transition-colors">
                  <FileText size={18} className="text-accent" />
                  <span className="text-primary text-sm">Nueva instrucción</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-3 bg-elevated hover:bg-hover rounded-lg text-left transition-colors">
                  <Database size={18} className="text-accent" />
                  <span className="text-primary text-sm">Subir conocimiento</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsageView;
