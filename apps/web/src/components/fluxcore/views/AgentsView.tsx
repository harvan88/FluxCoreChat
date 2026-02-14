/**
 * AgentsView — Fase 3: Agent Runtime Engine (multi-agente)
 *
 * List view for FluxCore Agents.
 * Clicking an agent opens a new tab via onOpenTab.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import { api } from '../../../services/api';
import { DoubleConfirmationDeleteButton } from '../../ui';
import { CollectionView, StatusBadge } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';
import { formatDate } from '../../../lib/fluxcore';

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface AgentsViewProps {
  accountId: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
}

// ─── Status helpers ─────────────────────────────────────────────────────────

const triggerLabels: Record<string, string> = {
  message_received: 'Mensaje recibido',
  manual: 'Manual',
  scheduled: 'Programado',
  webhook: 'Webhook',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AgentsView({ accountId, onOpenTab }: AgentsViewProps) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [_creating, setCreating] = useState(false);

  // ─── Load agents ──────────────────────────────────────────────────────────

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgents(accountId);
      if (res.success && res.data) {
        setAgents(res.data);
      } else {
        setError(res.error || 'Error al cargar agentes');
      }
    } catch (e: any) {
      setError(e?.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadAgents();
  }, [accountId, loadAgents]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await api.createAgent({
        accountId,
        name: `Agente ${agents.length + 1}`,
        description: '',
        status: 'draft',
      });
      if (res.success && res.data) {
        await loadAgents();
        if (onOpenTab) {
          handleOpenAgent(res.data.id, res.data.name);
        }
      }
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    try {
      await api.deleteAgent(accountId, agentId);
      await loadAgents();
    } catch (e: any) {
      setError(e?.message);
    }
  };

  const handleOpenAgent = (agentId: string, name: string) => {
    if (onOpenTab) {
      onOpenTab(agentId, name, {
        type: 'agent',
        agentId,
        identity: `extension:fluxcore:agent:${accountId}:${agentId}`
      });
    }
  };

  // ─── Columns ──────────────────────────────────────────────────────────────

  const columns: CollectionColumn<AgentSummary>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Nombre',
      accessor: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={16} className="text-accent flex-shrink-0" />
          <span className="font-medium text-primary truncate">{row.name}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'trigger',
      header: 'Trigger',
      hideBelow: 'md',
      accessor: (row) => (
        <span className="text-secondary text-sm">
          {triggerLabels[row.triggerType] || row.triggerType}
        </span>
      ),
    },
    {
      id: 'assistants',
      header: 'Asistentes',
      hideBelow: 'md',
      accessor: (row) => (
        <span className="text-secondary text-sm">{row.assistantCount}</span>
      ),
    },
    {
      id: 'updatedAt',
      header: 'Última modificación',
      hideBelow: 'lg',
      accessor: (row) => (
        <span className="text-secondary text-sm">{formatDate(row.updatedAt)}</span>
      ),
    },
  ], []);

  // ─── Render: List (CollectionView) ────────────────────────────────────────

  return (
    <CollectionView<AgentSummary>
      icon={GitBranch}
      title="Agentes"
      createLabel="Crear agente"
      onCreate={handleCreate}
      data={agents}
      getRowKey={(row) => row.id}
      columns={columns}
      loading={loading}
      onRowClick={(row) => handleOpenAgent(row.id, row.name)}
      emptyDescription="Los agentes permiten orquestar múltiples asistentes en flujos complejos"
      renderActions={(row) => (
        <DoubleConfirmationDeleteButton
          onConfirm={() => handleDelete(row.id)}
          size={14}
        />
      )}
    />
  );
}
