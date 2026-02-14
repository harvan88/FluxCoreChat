import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Settings2,
  GitBranch,
  Shield,
  Users,
  Bot,
  X,
  LayoutTemplate,
} from 'lucide-react';
import { DoubleConfirmationDeleteButton } from '../../ui';
import { AGENT_FLOW_TEMPLATES } from './flowTemplates';

interface AgentDetail {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  status: string;
  flow: { steps: any[]; entryPoint?: string };
  scopes: {
    allowedModels: string[];
    maxTotalTokens: number;
    maxExecutionTimeMs: number;
    allowedTools: string[];
    canCreateSubAgents: boolean;
  };
  triggerConfig: { type: string; filter?: string };
  assistants: Array<{ assistantId: string; role: string; stepId: string | null }>;
  createdAt: string;
  updatedAt: string;
}

interface AgentDetailProps {
  agent: AgentDetail;
  onUpdateField: (field: string, value: any) => void;
  onSaveFlow: (flow: any) => Promise<void>;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

const statusColors: Record<string, string> = {
  active: 'text-green-400',
  draft: 'text-yellow-400',
  archived: 'text-muted',
};

const triggerLabels: Record<string, string> = {
  message_received: 'Mensaje recibido',
  manual: 'Manual',
  scheduled: 'Programado',
  webhook: 'Webhook',
};

export function AgentDetailView({
  agent,
  onUpdateField,
  onSaveFlow,
  onActivate,
  onDeactivate,
  onDelete,
  onClose,
}: AgentDetailProps) {
  const [flowJson, setFlowJson] = useState(JSON.stringify(agent.flow, null, 2));
  const [flowError, setFlowError] = useState<string | null>(null);
  const [savingFlow, setSavingFlow] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const templatesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!templatesOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
        setTemplatesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [templatesOpen]);

  const handleSaveFlow = async () => {
    setFlowError(null);
    setSavingFlow(true);
    try {
      const parsed = JSON.parse(flowJson);
      await onSaveFlow(parsed);
      setFlowError(null);
    } catch (e: any) {
      setFlowError(e?.message || 'JSON inválido');
    } finally {
      setSavingFlow(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = AGENT_FLOW_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      if (confirm('¿Estás seguro? Esto reemplazará el flujo actual.')) {
        setFlowJson(JSON.stringify(template.flow, null, 2));
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-3 border-b border-subtle flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <GitBranch size={18} className="text-accent flex-shrink-0" />
          <input
            type="text"
            value={agent.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            onBlur={(e) => onUpdateField('name', e.target.value)}
            className="text-lg font-semibold text-primary bg-transparent border-none outline-none w-full hover:bg-hover/50 focus:bg-elevated px-1 -mx-1 rounded"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium ${statusColors[agent.status] || 'text-muted'}`}>
            {agent.status}
          </span>
          {agent.status === 'draft' ? (
            <button
              onClick={onActivate}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
              title="Activar"
            >
              <Play size={12} /> Activar
            </button>
          ) : agent.status === 'active' ? (
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 transition-colors"
              title="Pausar"
            >
              <Pause size={12} /> Pausar
            </button>
          ) : null}
          <DoubleConfirmationDeleteButton onConfirm={onDelete} size={16} />
          {onClose && (
            <button className="p-2 hover:bg-hover rounded" onClick={onClose} title="Cerrar">
              <X size={16} className="text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
        {/* Description */}
        <textarea
          value={agent.description || ''}
          onChange={(e) => onUpdateField('description', e.target.value)}
          onBlur={(e) => onUpdateField('description', e.target.value)}
          placeholder="Descripción del agente..."
          rows={2}
          className="w-full text-sm text-secondary bg-transparent border-none outline-none resize-none hover:bg-hover/50 focus:bg-elevated px-1 -mx-1 rounded"
        />

        {/* Trigger */}
        <section>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Settings2 size={13} /> Trigger
          </h3>
          <div className="bg-surface border border-subtle rounded-lg p-3">
            <div className="text-sm text-secondary">
              {triggerLabels[agent.triggerConfig?.type] || agent.triggerConfig?.type || 'message_received'}
            </div>
          </div>
        </section>

        {/* Assistants */}
        <section>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Users size={13} /> Asistentes vinculados ({agent.assistants?.length || 0})
          </h3>
          <div className="bg-surface border border-subtle rounded-lg p-3">
            {(!agent.assistants || agent.assistants.length === 0) ? (
              <div className="text-xs text-muted">
                Sin asistentes vinculados. Agrega asistentes existentes para usarlos en el flujo.
              </div>
            ) : (
              <div className="space-y-2">
                {agent.assistants.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Bot size={14} className="text-accent" />
                    <span className="text-primary font-mono text-xs">{a.assistantId.slice(0, 8)}...</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-elevated text-muted">{a.role}</span>
                    {a.stepId && (
                      <span className="text-[10px] text-muted">step: {a.stepId}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Flow Editor */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted uppercase tracking-wide flex items-center gap-1.5">
              <GitBranch size={13} /> Flujo ({agent.flow?.steps?.length || 0} pasos)
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative" ref={templatesRef}>
                <button
                  className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-medium text-secondary hover:text-primary hover:bg-elevated rounded transition-colors"
                  onClick={() => setTemplatesOpen(prev => !prev)}
                >
                  <LayoutTemplate size={12} /> Plantillas
                </button>
                {templatesOpen && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-elevated border border-subtle rounded-lg shadow-xl overflow-hidden z-20">
                    <div className="p-2 text-xs font-medium text-muted border-b border-subtle bg-surface">
                      Reemplazar flujo actual con:
                    </div>
                    {AGENT_FLOW_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          applyTemplate(t.id);
                          setTemplatesOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-hover transition-colors flex flex-col gap-0.5"
                      >
                        <span className="text-primary font-medium">{t.name}</span>
                        <span className="text-xs text-muted truncate">{t.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-surface border border-subtle rounded-lg overflow-hidden">
            {/* Flow visualization */}
            {agent.flow?.steps?.length > 0 && (
              <div className="px-3 py-2 border-b border-subtle flex items-center gap-1.5 overflow-x-auto">
                {agent.flow.steps.map((step: any, i: number) => (
                  <div key={step.id || i} className="flex items-center gap-1.5 flex-shrink-0">
                    {i > 0 && <span className="text-muted">→</span>}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-elevated text-secondary border border-subtle">
                      <span className="text-accent font-medium">{step.type}</span>
                      <span className="text-muted">{step.id}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* JSON editor */}
            <textarea
              value={flowJson}
              onChange={(e) => setFlowJson(e.target.value)}
              rows={12}
              className="w-full bg-base text-sm text-primary font-mono p-3 border-none outline-none resize-y"
              spellCheck={false}
            />
            {flowError && (
              <div className="px-3 py-1.5 text-xs text-red-400 bg-red-950/20 border-t border-subtle">
                {flowError}
              </div>
            )}
            <div className="px-3 py-2 border-t border-subtle flex justify-end">
              <button
                onClick={handleSaveFlow}
                disabled={savingFlow}
                className="px-3 py-1.5 rounded text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                {savingFlow ? 'Guardando...' : 'Guardar flujo'}
              </button>
            </div>
          </div>
        </section>

        {/* Scopes */}
        <section>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Shield size={13} /> Scopes de seguridad
          </h3>
          <div className="bg-surface border border-subtle rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Tokens máx.</span>
              <span className="text-primary font-mono">{agent.scopes?.maxTotalTokens || 5000}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Tiempo máx.</span>
              <span className="text-primary font-mono">{((agent.scopes?.maxExecutionTimeMs || 30000) / 1000).toFixed(0)}s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Modelos</span>
              <span className="text-primary font-mono text-xs">
                {agent.scopes?.allowedModels?.length > 0
                  ? agent.scopes.allowedModels.join(', ')
                  : 'todos'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Tools</span>
              <span className="text-primary font-mono text-xs">
                {agent.scopes?.allowedTools?.length > 0
                  ? agent.scopes.allowedTools.join(', ')
                  : 'todas'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Sub-agentes</span>
              <span className={agent.scopes?.canCreateSubAgents ? 'text-green-400' : 'text-muted'}>
                {agent.scopes?.canCreateSubAgents ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
        </section>

        {/* Metadata */}
        <section className="text-[11px] text-muted space-y-0.5">
          <div>ID: {agent.id}</div>
          <div>Creado: {new Date(agent.createdAt).toLocaleString()}</div>
          <div>Actualizado: {new Date(agent.updatedAt).toLocaleString()}</div>
        </section>
      </div>
    </div>
  );
}
