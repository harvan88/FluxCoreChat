import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Copy, RefreshCw, Download, AlertTriangle, Check, Brain, Database, Zap, Sparkles, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';
// Import removed to avoid duplication with local declaration

type TraceSummary = {
  id: string;
  createdAt: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  mode: 'suggest' | 'auto';
  model: string;
  maxTokens: number;
  temperature: number;
  final?: {
    provider: string;
    baseUrl: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
  attempts: number;
};

type TraceDetail = {
  id: string;
  createdAt: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  mode: 'suggest' | 'auto';
  model: string;
  maxTokens: number;
  temperature: number;
  context: any;
  builtPrompt: {
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    messagesWithCurrent: Array<{ role: string; content: string }>;
  };
  attempts: Array<{
    provider: string;
    baseUrl: string;
    keySource?: string;
    attempt: number;
    startedAt: string;
    durationMs?: number;
    requestBody: any;
    ok: boolean;
    error?: any;
    response?: any;
  }>;
  final?: any;
  toolsUsed?: ToolExecutionRecord[];
};

type ToolExecutionRecord = {
  id?: string;
  name?: string;
  connectionId?: string;
  status: 'not_invoked' | 'success' | 'error';
  startedAt?: string;
  durationMs?: number;
  input?: any;
  output?: any;
  error?: any;
};

function shortId(id: string) {
  if (!id) return '';
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function FluxCorePromptInspectorPanel({ accountId }: { accountId?: string }) {
  const selectedAccountId = useUIStore((s) => s.selectedAccountId);
  const effectiveAccountId = accountId || selectedAccountId;

  const [conversationFilter, setConversationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [isExporting, setIsExporting] = useState(false);


  
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const showCopyFeedback = (sectionId: string) => {
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const effectiveConversationFilter = useMemo(() => {
    const trimmed = conversationFilter.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [conversationFilter]);

  const loadTraces = async () => {
    if (!effectiveAccountId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAITraces({
        accountId: effectiveAccountId,
        conversationId: effectiveConversationFilter || undefined,
        limit: 50,
      });
      if (!res.success) {
        setError(res.error || 'Error al cargar trazas');
        setTraces([]);
        return;
      }
      setTraces((res.data || []) as any);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar trazas');
      setTraces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTraceMarkdown = (d: any) => {
    if (d.error) return `# Trace ${d.id}\n\n**Error:** ${d.error}\n\n---\n`;

    const usageFinal = d.final?.usage
      ? `${d.final.usage.prompt_tokens} + ${d.final.usage.completion_tokens} = ${d.final.usage.total_tokens}`
      : '—';

    const messagesText = JSON.stringify(d.builtPrompt?.messagesWithCurrent || [], null, 2);
    
    // 🎯 RECONSTRUCCIÓN FORENSE (FASES 0-3)
    let cognitivePhasesMd = '';
    const contextAny = d.context || d.requestBody?.contextSnapshot || d.requestContext || {};
    const cognitiveData = contextAny._cognitiveSteps || contextAny.steps || contextAny.contextSnapshot?._cognitiveSteps || {};
    
    if (Object.keys(cognitiveData).length > 0) {
        cognitivePhasesMd = `\n## AUDITORÍA FORENSE: PIPELINE COGNITIVO (REALIDAD FÍSICA)\n\n`;
        // Ordenar por nombre de fase (0, 1, 2, 3) si es posible
        const sortedEntries = Object.entries(cognitiveData).sort((a, b) => a[0].localeCompare(b[0]));
        
        sortedEntries.forEach(([key, val]: [string, any]) => {
            cognitivePhasesMd += `### [${key}]\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\`\n\n`;
        });
    }

    return `FLUXCORE FORENSIC AUDIT REPORT - ${d.id}
======================================================
Generated: ${new Date().toLocaleString()}
Trace Date: ${new Date(d.createdAt).toLocaleString()}
Conversation: ${d.conversationId}
Model: ${d.model}
Usage: ${usageFinal}

SYSTEM PROMPT (PRIMARY INSTRUCTIONS)
------------------------------------
${d.builtPrompt?.systemPrompt || '—'}

MESSAGES HISTORY (JSON)
-----------------------
${messagesText}

${cognitivePhasesMd}

FULL CONTEXT DATA (SNAPSHOT)
----------------------------
${JSON.stringify(contextAny, null, 2)}
`;
  };

  const handleCopyAnalysis = async () => {
    if (!detail) return;
    const report = generateTraceMarkdown(detail);
    if (await copyToClipboard(report)) {
      showCopyFeedback('main-analysis');
    }
  };

  const loadTraceDetail = async (traceId: string) => {
    if (!effectiveAccountId) return;
    setDetailLoading(true);
    setError(null);
    try {
      const res = await api.getAITrace({ accountId: effectiveAccountId, traceId });
      if (!res.success) {
        setError(res.error || 'Error al cargar detalle');
        setDetail(null);
        return;
      }
      setDetail(res.data as any);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar detalle');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    setSelectedTraceId(null);
    setDetail(null);
    setTraces([]);
    setError(null);
    if (effectiveAccountId) {
      loadTraces();
    }
  }, [effectiveAccountId, effectiveConversationFilter]);

  useEffect(() => {
    if (!selectedTraceId) {
      setDetail(null);
      return;
    }
    loadTraceDetail(selectedTraceId);
  }, [selectedTraceId]);

  const handleExport = async () => {
    if (!effectiveAccountId || isExporting) return;
    setIsExporting(true);
    try {
      const res = await api.downloadAITraces({
        accountId: effectiveAccountId,
        conversationId: effectiveConversationFilter || undefined,
        limit: 200,
      });
      if (!res.success || !res.data) {
        setError(res.error || 'Error al exportar trazas');
        return;
      }
      const blob = new Blob([res.data || ''], { type: 'application/jsonl;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traces-${Date.now()}.jsonl`;
      a.click();
    } catch (e: any) {
      setError(e?.message || 'Error al exportar trazas');
    } finally {
      setIsExporting(false);
    }
  };

  if (!effectiveAccountId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted gap-4">
        <Terminal size={48} className="opacity-20" />
        <p>Selecciona una cuenta para auditar el pipeline.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between gap-4 bg-gradient-to-r from-surface to-elevated">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-primary tracking-tight">FluxCore Forensic Auditor</h2>
            <div className="text-[10px] text-muted uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="text-accent">•</span> Realidad Física & Telemetría Cognitiva
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ButtonIcon icon={Download} onClick={handleExport} loading={isExporting} title="Exportar JSONL" />
          <ButtonIcon icon={RefreshCw} onClick={loadTraces} loading={isLoading} title="Actualizar" />
          <DoubleConfirmationDeleteButton onConfirm={async () => {}} size={18} />
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
        {/* LISTA */}
        <div className="col-span-3 border-r border-subtle flex flex-col bg-base/50 min-h-0">
          <div className="px-4 py-3">
            <input
              value={conversationFilter}
              onChange={(e) => setConversationFilter(e.target.value)}
              placeholder="Buscar conversación..."
              className="w-full bg-surface border border-subtle rounded-lg px-3 py-1.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 pb-4">
            {traces.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">No hay ejecuciones registradas.</div>
            ) : (
              traces.map((t) => (
                <TraceCard 
                  key={t.id} 
                  trace={t} 
                  isActive={t.id === selectedTraceId} 
                  onClick={() => setSelectedTraceId(t.id)} 
                />
              ))
            )}
          </div>
        </div>

        {/* DETALLE */}
        <div className="col-span-9 flex flex-col bg-surface min-h-0">
          {!selectedTraceId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted gap-2 opacity-40">
              <Zap size={32} />
              <p className="text-sm font-medium">Selecciona una ejecución para auditar</p>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="animate-spin text-accent" />
            </div>
          ) : !detail ? (
            <div className="flex-1 flex items-center justify-center text-error">Sin datos disponibles.</div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-surface/90 backdrop-blur-sm pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-accent/20 text-accent rounded text-[10px] font-bold uppercase tracking-wider">
                    {detail.mode}
                  </span>
                  <span className="text-xs text-muted font-mono">{detail.id}</span>
                </div>
                <button
                  onClick={handleCopyAnalysis}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm",
                    copiedSection === 'main-analysis' 
                      ? "bg-success/20 border-success text-success" 
                      : "bg-accent text-inverse border-accent hover:shadow-accent/20 hover:scale-[1.02]"
                  )}
                >
                  {copiedSection === 'main-analysis' ? <Check size={14} /> : <Copy size={14} />}
                  COPIAR PARA ANÁLISIS (MARKDOWN)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard icon={Brain} label="Inferencia" value={detail.model} subValue={detail.attempts.length > 1 ? `${detail.attempts.length} intentos` : 'Exitoso'} />
                <MetricCard icon={Zap} label="Uso de Tokens" value={detail.final?.usage?.total_tokens ?? '—'} subValue={`${detail.final?.usage?.prompt_tokens ?? 0} in / ${detail.final?.usage?.completion_tokens ?? 0} out`} />
              </div>

              <CognitiveStepsInspector detail={detail} />

              <ExpandableSection 
                title="Sovereign Identity & Instructions" 
                icon={Terminal} 
                content={detail.builtPrompt?.systemPrompt} 
                subTitle="Instruction set final proyectado al runtime"
                sectionId="system-prompt"
              />

              <div className="bg-elevated border border-subtle rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-subtle bg-base/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <Terminal size={16} className="text-accent" />
                        Historial de Mensajes (ConversationHistory)
                    </div>
                    <CopyButton text={JSON.stringify(detail.builtPrompt?.messagesWithCurrent || [], null, 2)} />
                </div>
                <div className="p-4 bg-black/20 font-mono text-[11px] leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">
                    {detail.builtPrompt?.messagesWithCurrent.map((m, i) => (
                        <div key={i} className="mb-4 last:mb-0">
                            <div className={clsx("font-bold mb-1 uppercase tracking-tighter", m.role === 'user' ? "text-accent" : "text-success")}>
                                {m.role}
                            </div>
                            <div className="text-secondary pl-3 border-l border-subtle/50 whitespace-pre-wrap">
                                {m.content}
                            </div>
                        </div>
                    ))}
                </div>
              </div>

              <ExpandableSection 
                title="Full Trace Logic (Raw Context)" 
                icon={Database} 
                content={JSON.stringify(detail.context, null, 2)} 
                isJson 
                defaultExpanded={false}
                sectionId="raw-context"
              />

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceCard({ trace, isActive, onClick }: { trace: TraceSummary, isActive: boolean, onClick: () => void }) {
  const usage = trace.final?.usage?.total_tokens;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full p-3 rounded-xl text-left transition-all border group relative overflow-hidden",
        isActive 
          ? "bg-accent/10 border-accent shadow-sm" 
          : "bg-surface border-subtle hover:border-accent/40 hover:bg-elevated"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted font-mono uppercase">{new Date(trace.createdAt).toLocaleTimeString()}</span>
        {usage && <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{usage} tok</span>}
      </div>
      <div className={clsx("text-xs font-bold truncate mb-1", isActive ? "text-accent" : "text-primary")}>
        {shortId(trace.conversationId)}
      </div>
      <div className="text-[10px] text-muted font-medium truncate">{trace.model}</div>
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, subValue }: { icon: any, label: string, value: any, subValue: string }) {
  return (
    <div className="bg-elevated border border-subtle rounded-xl p-4 flex items-center gap-4 group hover:border-accent/40 transition-colors">
      <div className="p-3 bg-base rounded-lg text-accent group-hover:scale-110 transition-transform">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-sm font-bold text-primary">{value}</div>
        <div className="text-[10px] text-secondary font-medium">{subValue}</div>
      </div>
    </div>
  );
}

function ExpandableSection({ title, subTitle, icon: Icon, content, defaultExpanded = true, sectionId }: any) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  return (
    <div className="bg-elevated border border-subtle rounded-xl overflow-hidden shadow-sm">
      <div 
        className="px-4 py-3 flex items-center justify-between bg-base/30 cursor-pointer hover:bg-base/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-secondary" />
          <div>
            <div className="text-sm font-bold text-primary">{title}</div>
            {subTitle && <div className="text-[10px] text-muted font-medium uppercase">{subTitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-4">
            <CopyButton text={content} sectionId={sectionId} />
            <div className="text-muted">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 bg-black/20">
          <pre className="text-[11px] text-secondary whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function CognitiveStepsInspector({ detail }: { detail: any }) {
  // Búsqueda profunda de fases (v8.6)
  const context = detail?.context || detail?.requestBody?.contextSnapshot || detail?.requestContext || {};
  const steps = context._cognitiveSteps || context.steps || context.contextSnapshot?._cognitiveSteps || {};
  const stepEntries = Object.entries(steps).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (stepEntries.length === 0) {
      // Intento de último recurso: buscar en requestBody directamente
      const fallbackSteps = detail?.requestContext?.contextSnapshot?._cognitiveSteps || {};
      const fallbackEntries = Object.entries(fallbackSteps).sort((a, b) => a[0].localeCompare(b[0]));
      if (fallbackEntries.length === 0) return null;
      return <RenderSteps entries={fallbackEntries} />;
  }

  return <RenderSteps entries={stepEntries} />;
}

function RenderSteps({ entries }: { entries: [string, any][] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-widest pl-1 border-l-2 border-accent">
        <Brain size={12} className="text-accent" />
        Pipeline Cognitivo (Realidad Física Actualizada v8.6)
      </div>
      <div className="grid grid-cols-1 gap-4">
        {entries.map(([key, data]: [string, any]) => (
          <div key={key} className="bg-elevated/60 border border-subtle rounded-xl overflow-hidden border-l-4 border-l-accent shadow-md group hover:border-accent/40 transition-colors">
            <div className="px-4 py-2 bg-accent/5 flex items-center justify-between border-b border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-bold text-primary">{key}</span>
              </div>
              <CopyButton text={JSON.stringify(data, null, 2)} label="Copiar Fase" sectionId={`phase-${key}`} />
            </div>
            <div className="p-0 bg-black/30 font-mono text-[10px] max-h-[300px] overflow-y-auto custom-scrollbar text-secondary leading-relaxed">
               <pre className="p-4">{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string, label?: string, sectionId?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: any) => {
    e.stopPropagation();
    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button 
      onClick={handleCopy}
      className={clsx(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase border",
        copied ? "bg-success/20 border-success text-success" : "bg-surface border-subtle text-muted hover:text-primary hover:bg-hover active:scale-95"
      )}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {label || (copied ? '¡Hecho!' : 'Copiar')}
    </button>
  );
}

function ButtonIcon({ icon: Icon, onClick, loading, title }: any) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-primary hover:bg-accent/10 hover:border-accent/40 border border-transparent transition-all disabled:opacity-50"
      disabled={loading}
      title={title}
    >
      <Icon size={18} className={clsx(loading && 'animate-spin')} />
    </button>
  );
}

function DoubleConfirmationDeleteButton({ onConfirm, size = 16, className }: any) {
    const [state, setState] = useState(0);
    const handleClick = (e: any) => {
        e.stopPropagation();
        if (state === 0) {
            setState(1);
            setTimeout(() => setState(0), 3000);
        } else {
            onConfirm();
            setState(0);
        }
    };
    return (
        <button 
            onClick={handleClick}
            className={clsx("p-2 rounded-lg transition-all", state === 1 ? "bg-error text-inverse scale-110" : "text-muted hover:text-error hover:bg-error/10", className)}
        >
            {state === 1 ? <Check size={size} /> : <AlertTriangle size={size} />}
        </button>
    );
}
