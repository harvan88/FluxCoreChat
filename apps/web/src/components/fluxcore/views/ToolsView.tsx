/**
 * Tools View - Biblioteca de Capacidades (Tools)
 * 
 * Una Tool representa una CAPACIDAD DECLARADA del sistema, no contenido ni código.
 * Una Tool describe QUÉ puede hacer un asistente, no CÓMO lo hace.
 * 
 * Componentes de una Tool:
 * - Entidad de Dominio: name, description, type, owner, visibility, status
 * - Interface Schema: Definición declarativa (JSON Schema) de inputs/outputs
 * - Executor: Implementación técnica (backend) - no visible al modelo
 * 
 * El schema NO ES la tool, es su contrato.
 * Muestra herramientas agrupadas por categoría con estado de conexión.
 */

import { useState, useEffect } from 'react';
import { Wrench, Calendar, Link2, CheckCircle, XCircle, Settings } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle size={14} />
            Conectado
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-red-500">
            <XCircle size={14} />
            Error
          </span>
        );
      default:
        return (
          <span className="text-muted">
            Desconectado
          </span>
        );
    }
  };

  const getToolIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'agenda':
      case 'calendar':
        return <Calendar size={18} className="text-accent" />;
      default:
        return <Wrench size={18} className="text-accent" />;
    }
  };

  // Agrupar herramientas por categoría
  const groupedTools = definitions.reduce((acc, tool) => {
    const category = tool.category || 'Otros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, ToolDefinition[]>);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-subtle">
        <h2 className="text-lg font-semibold text-primary">Herramientas</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">
            Cargando herramientas...
          </div>
        ) : definitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Wrench size={48} className="text-muted mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              No hay herramientas disponibles
            </h3>
            <p className="text-secondary">
              Las herramientas permiten a tus asistentes interactuar con servicios externos
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTools).map(([category, tools]) => (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  {getToolIcon(category)}
                  <h3 className="font-medium text-primary">{category}</h3>
                </div>

                {/* Tools list */}
                <div className="bg-surface rounded-lg border border-subtle">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-subtle">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Recurso</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((tool) => (
                        <tr
                          key={tool.id}
                          className="group border-b border-subtle last:border-b-0 hover:bg-hover"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link2 size={16} className="text-muted" />
                              <span className="font-medium text-primary">{tool.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(getConnectionStatus(tool.id))}
                          </td>
                          <td className="px-4 py-3">
                            <button className="p-1 hover:bg-elevated rounded opacity-0 group-hover:opacity-100">
                              <Settings size={16} className="text-muted" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolsView;
