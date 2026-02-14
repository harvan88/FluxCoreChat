/**
 * Tools View - Biblioteca de Capacidades (Tools)
 * 
 * Uses CollectionView for unified header/empty/loading states.
 * Tools are grouped by category, each group rendered as a consistent table.
 */

import { useState, useEffect, useMemo } from 'react';
import { Wrench, Link2, Settings } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { CollectionView } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';
import { Badge } from '../../ui';

interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  authType: 'oauth2' | 'api_key' | 'none';
}

interface ToolConnection {
  id: string;
  toolDefinitionId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastUsedAt?: string;
}

interface ToolsViewProps {
  accountId: string;
}

const getConnectionBadge = (status: string) => {
  switch (status) {
    case 'connected':
      return <Badge variant="success">Conectado</Badge>;
    case 'error':
      return <Badge variant="error">Error</Badge>;
    default:
      return <Badge variant="warning">Desconectado</Badge>;
  }
};

export function ToolsView({ accountId }: ToolsViewProps) {
  const { token } = useAuthStore();
  const [definitions, setDefinitions] = useState<ToolDefinition[]>([]);
  const [connections, setConnections] = useState<ToolConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId && token) loadTools();
  }, [accountId, token]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [defsResponse, connsResponse] = await Promise.all([
        fetch('/api/fluxcore/tools/definitions', { headers }),
        fetch(`/api/fluxcore/tools/connections?accountId=${accountId}`, { headers }),
      ]);
      
      const defsData = await defsResponse.json();
      const connsData = await connsResponse.json();
      
      if (defsData.success) {
        setDefinitions(defsData.data || []);
      }
      if (connsData.success) {
        setConnections(connsData.data || []);
      }
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = (toolId: string) => {
    const connection = connections.find(c => c.toolDefinitionId === toolId);
    return connection?.status || 'disconnected';
  };

  const columns: CollectionColumn<ToolDefinition>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Recurso',
      accessor: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          <Link2 size={16} className="text-accent flex-shrink-0" />
          <span className="font-medium text-primary truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      accessor: (row) => getConnectionBadge(getConnectionStatus(row.id)),
    },
  ], [connections]);

  // CollectionView handles header + empty + loading
  // For tools we render grouped tables inside the content area
  return (
    <CollectionView<ToolDefinition>
      icon={Wrench}
      title="Herramientas"
      createLabel="Nueva herramienta"
      onCreate={() => {}}
      data={definitions}
      getRowKey={(row) => row.id}
      columns={columns}
      loading={loading}
      emptyDescription="Las herramientas permiten a tus asistentes interactuar con servicios externos"
      renderActions={() => (
        <button className="p-1 hover:bg-elevated rounded" onClick={(e) => e.stopPropagation()}>
          <Settings size={16} className="text-muted" />
        </button>
      )}
    />
  );
}

export default ToolsView;
