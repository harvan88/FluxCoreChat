/**
 * AgentView — Container for a single Agent detail tab.
 * Fetches data and manages state, rendering the dumb AgentDetailView component.
 */

import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { AgentDetailView } from '../agents/AgentDetail';

interface AgentViewProps {
  accountId: string;
  agentId: string;
  onClose?: () => void;
}

export function AgentView({ accountId, agentId, onClose }: AgentViewProps) {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgent = async () => {
    setLoading(true);
    try {
      const res = await api.getAgent(accountId, agentId);
      if (res.success && res.data) {
        setAgent(res.data);
      } else {
        setError(res.error || 'Error al cargar agente');
      }
    } catch (e: any) {
      setError(e?.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgent();
  }, [accountId, agentId]);

  const handleUpdateField = async (field: string, value: any) => {
    if (!agent) return;
    try {
      // Optimistic update
      setAgent({ ...agent, [field]: value });
      await api.updateAgent(accountId, agent.id, { [field]: value });
    } catch (e: any) {
      setError(e?.message);
    }
  };

  const handleSaveFlow = async (flow: any) => {
    if (!agent) return;
    try {
      const res = await api.updateAgentFlow(accountId, agent.id, flow);
      if (res.success && res.data) {
        setAgent(res.data);
      }
    } catch (e: any) {
      throw e;
    }
  };

  const handleActivate = async () => {
    if (!agent) return;
    try {
      const res = await api.activateAgent(accountId, agent.id);
      if (res.success) {
        setAgent({ ...agent, status: 'active' });
      }
    } catch (e: any) {
      setError(e?.message);
    }
  };

  const handleDeactivate = async () => {
    if (!agent) return;
    try {
      const res = await api.deactivateAgent(accountId, agent.id);
      if (res.success) {
        setAgent({ ...agent, status: 'draft' });
      }
    } catch (e: any) {
      setError(e?.message);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    try {
      await api.deleteAgent(accountId, agent.id);
      onClose?.();
    } catch (e: any) {
      setError(e?.message);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        Cargando agente...
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm flex-col gap-2">
        <p>{error || 'Agente no encontrado'}</p>
        <button onClick={loadAgent} className="text-accent hover:underline">Reintentar</button>
      </div>
    );
  }

  return (
    <AgentDetailView
      agent={agent}
      onUpdateField={handleUpdateField}
      onSaveFlow={handleSaveFlow}
      onActivate={handleActivate}
      onDeactivate={handleDeactivate}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
}
