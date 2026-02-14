import { GitBranch, Plus, Share2, RotateCcw } from 'lucide-react';
import { Button, Badge, DoubleConfirmationDeleteButton } from '../../ui';
import { formatDate } from '../../../lib/fluxcore';

interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  assistantCount: number;
  triggerType: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentListProps {
  agents: AgentSummary[];
  loading: boolean;
  onCreate: () => void;
  onSelect: (agent: AgentSummary) => void;
  onDelete: (agentId: string) => void;
  onRefresh: () => void;
}

const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Activo</Badge>;
    case 'archived':
      return <Badge variant="warning">Archivado</Badge>;
    default:
      return <Badge variant="info">Borrador</Badge>;
  }
};

const triggerLabels: Record<string, string> = {
  message_received: 'Mensaje recibido',
  manual: 'Manual',
  scheduled: 'Programado',
  webhook: 'Webhook',
};

export function AgentList({ agents, loading, onCreate, onSelect, onDelete, onRefresh }: AgentListProps) {
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <GitBranch size={48} className="text-muted mb-4" />
      <h3 className="text-lg font-medium text-primary mb-2">No hay agentes configurados</h3>
      <p className="text-secondary mb-4">Crea un agente para orquestar flujos multi-asistente</p>
      <Button onClick={onCreate}>
        <Plus size={16} className="mr-1" />
        Crear agente
      </Button>
    </div>
  );

  const renderTable = () => (
    <div className="bg-surface rounded-lg border border-subtle">
      <table className="w-full">
        <thead>
          <tr className="border-b border-subtle">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Nombre</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Trigger</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Asistentes</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Última modificación</th>
            <th className="px-4 py-3 sticky right-0 bg-surface" />
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.id}
              className="group border-b border-subtle last:border-b-0 hover:bg-hover cursor-pointer"
              onClick={() => onSelect(agent)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch size={16} className="text-accent flex-shrink-0 min-w-[16px] min-h-[16px]" />
                    <span className="font-medium text-primary truncate">{agent.name}</span>
                  </div>

                  <div className="flex items-center gap-1 md:hidden">
                    <div className="flex items-center gap-3 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <DoubleConfirmationDeleteButton onConfirm={() => onDelete(agent.id)} size={16} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-secondary text-sm hidden md:table-cell">
                {triggerLabels[agent.triggerType] || agent.triggerType || '-'}
              </td>
              <td className="px-4 py-3">{renderStatusBadge(agent.status)}</td>
              <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                {agent.assistantCount} asistente{agent.assistantCount !== 1 ? 's' : ''}
              </td>
              <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                {formatDate(agent.updatedAt)}
              </td>
              <td className="px-4 py-3 hidden md:table-cell sticky right-0 bg-surface group-hover:bg-hover">
                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-elevated rounded" title="Compartir" onClick={(e) => e.stopPropagation()}>
                    <Share2 size={16} className="text-muted flex-shrink-0" />
                  </button>
                  <button className="p-1 hover:bg-elevated rounded" title="Recargar" onClick={(e) => { e.stopPropagation(); onRefresh(); }}>
                    <RotateCcw size={16} className="text-muted flex-shrink-0" />
                  </button>
                  <DoubleConfirmationDeleteButton onConfirm={() => onDelete(agent.id)} size={16} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Agentes</h2>
        <Button size="sm" onClick={onCreate}>
          <Plus size={16} className="mr-1" />
          Crear agente
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">Cargando agentes...</div>
        ) : agents.length === 0 ? (
          renderEmptyState()
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
}
