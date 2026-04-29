/**
 * Tools View - Biblioteca de Capacidades (Tools)
 * 
 * Uses CollectionView for unified header/empty/loading states.
 * Tools are grouped by category, each group rendered as a consistent table.
 */

import { useState, useEffect, useMemo } from 'react';
import { Wrench, Link2, Settings, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { CollectionView } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';
import { Badge, Switch } from '../../ui';
import { WESStudio } from '../WESStudio';

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
  onOpenTab?: (id: string, title: string, data: any) => void;
  definitionId?: string; // <--- Añadido para el patrón de detalle
}

const getConnectionBadge = (status: string, onToggle?: () => void, disabled?: boolean) => {
  const isConnected = status === 'connected';
  
  return (
    <div className="flex items-center gap-3">
      <Switch 
        checked={isConnected} 
        onCheckedChange={onToggle || (() => {})} 
        disabled={disabled}
      />
      {status === 'connected' ? (
        <Badge variant="success">Conectado</Badge>
      ) : status === 'error' ? (
        <Badge variant="error">Error</Badge>
      ) : (
        <Badge variant="warning">Desconectado</Badge>
      )}
    </div>
  );
};

export function ToolsView({ accountId, onOpenTab, definitionId }: ToolsViewProps) {
  const { token } = useAuthStore();
  const [definitions, setDefinitions] = useState<ToolDefinition[]>([]);
  const [connections, setConnections] = useState<ToolConnection[]>([]);
  const [wesDefinitions, setWesDefinitions] = useState<any[]>([]); // <--- Almacén silencioso de WES
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountId && token) loadTools();
  }, [accountId, token]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [defsResponse, connsResponse] = await Promise.all([
        fetch(`/api/fluxcore/tools/definitions?accountId=${accountId}`, { headers }),
        fetch(`/api/fluxcore/tools/connections?accountId=${accountId}`, { headers }),
      ]);
      
      const defsData = await defsResponse.json();
      const connsData = await connsResponse.json();
      
      if (defsData.success) {
        setDefinitions(defsData.data || []);
      }

      // 🛡️ Carga de WES para vinculación - EXPOSICIÓN DE ERRORES
      try {
        console.log(`[ToolsView] Cargando definiciones WES para cuenta: ${accountId}`);
        const wesResponse = await fetch(`/api/fluxcore/definitions?accountId=${accountId}`, { headers });
        const wesData = await wesResponse.json();
        
        if (wesData.success) {
          console.log(`[ToolsView] ${wesData.data?.length || 0} definiciones WES cargadas:`, 
            wesData.data?.map((d: any) => ({ id: d.id, typeId: d.typeId }))
          );
          setWesDefinitions(wesData.data || []);
        } else {
          console.error('[ToolsView] Error en respuesta WES:', wesData.message);
        }
      } catch (wesErr: any) {
        console.error('[ToolsView] FALLO CRÍTICO cargando WES:', wesErr.message);
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

  const handleToggleConnection = async (toolId: string) => {
    const currentStatus = getConnectionStatus(toolId);
    const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
    
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const connection = connections.find(c => c.toolDefinitionId === toolId);
      
      if (connection) {
        // Update existing
        const response = await fetch(`/api/fluxcore/tools/connections/${connection.id}?accountId=${accountId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) loadTools();
      } else {
        // Create new
        const response = await fetch(`/api/fluxcore/tools/connections`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            accountId, 
            toolDefinitionId: toolId, 
            status: newStatus 
          })
        });
        if (response.ok) loadTools();
      }
    } catch (error) {
      console.error('Error toggling connection:', error);
    }
  };

  const columns: CollectionColumn<ToolDefinition>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Recurso',
      accessor: (row) => {
        const isWes = wesDefinitions.some(w => w.typeId === row.slug);
        return (
          <div className="flex items-center gap-2">
            <Wrench size={14} className={isWes ? "text-accent" : "text-muted"} />
            <div className="flex flex-col">
              <span className="font-medium">{row.name}</span>
              {isWes && (
                <span className="text-[10px] text-accent uppercase tracking-tighter font-bold flex items-center gap-0.5">
                  <Link2 size={10} /> Motor de IA
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Estado',
      accessor: (row) => getConnectionBadge(
        getConnectionStatus(row.id), 
        () => handleToggleConnection(row.id)
      ),
    },
  ], [connections, handleToggleConnection, wesDefinitions]);

  // PATRÓN DETALLE: Si hay un ID seleccionado, mostrar las "entrañas" (WESStudio)
  if (definitionId) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-subtle flex items-center gap-4 bg-surface">
          <button 
            onClick={() => onOpenTab?.(definitionId, 'Herramientas', { type: 'tools' })}
            className="p-2 hover:bg-hover rounded-lg text-secondary transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-primary">Detalle de Herramienta</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <WESStudio accountId={accountId} definitionId={definitionId} />
        </div>
      </div>
    );
  }

  // CollectionView handles header + empty + loading
  // For tools we render grouped tables inside the content area
  return (
    <CollectionView<ToolDefinition>
      icon={Wrench}
      title="Herramientas Fluxcore"
      createLabel="Añadir Recurso"
      onCreate={() => {}}
      data={definitions}
      getRowKey={(row) => row.id}
      columns={columns}
      loading={loading}
      className={loading ? 'opacity-50' : ''}
      emptyDescription="Las herramientas permiten a tus asistentes interactuar con servicios externos"
      onRowClick={(row) => {
        // DETERMINISMO: Vinculación por Contrato (Slug == TypeId)
        const wesMatch = wesDefinitions.find(w => 
          w.typeId === row.slug || 
          w.id === row.id
        );

        console.log(`[ToolsView] Identity Resolution: "${row.name}"`, { 
          rowSlug: row.slug, 
          availableTypeIds: wesDefinitions.map(w => w.typeId),
          isLinked: !!wesMatch,
          matchId: wesMatch?.id
        });

        if (wesMatch && onOpenTab) {
          onOpenTab(row.id, row.name, { 
            type: 'wes-studio', 
            definitionId: wesMatch.id, 
            icon: 'Settings' 
          });
        }
      }}
      renderActions={(row) => {
        const wesMatch = wesDefinitions.find(w => 
          w.typeId === row.slug || 
          w.id === row.id
        );
        return (
          <button 
            className="p-1 hover:bg-elevated rounded" 
            onClick={(e) => {
              e.stopPropagation();
              if (wesMatch && onOpenTab) {
                onOpenTab(row.id, row.name, { type: 'wes-studio', definitionId: wesMatch.id, icon: 'Settings' });
              }
            }}
          >
            <Settings size={16} className={wesMatch ? "text-accent animate-pulse-subtle" : "text-muted"} />
          </button>
        );
      }}
    />
  );
}

export default ToolsView;
