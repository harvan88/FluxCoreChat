import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Copy, RefreshCw, Trash2, Download, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { useUIStore } from '../../store/uiStore';

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
  } catch {
    // ignore
  }
}

export function FluxCorePromptInspectorPanel({ accountId }: { accountId?: string }) {
  const selectedAccountId = useUIStore((s) => s.selectedAccountId);
  const effectiveAccountId = accountId || selectedAccountId;

  const [conversationFilter, setConversationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleCopyAll = async () => {
    if (!effectiveAccountId) return;
    if (isCopyingAll) return;

    setIsCopyingAll(true);
    setError(null);

    try {
      const listRes = await api.getAITraces({
        accountId: effectiveAccountId,
        conversationId: effectiveConversationFilter || undefined,
        limit: 200,
      });

      if (!listRes.success) {
        setError(listRes.error || 'Error al cargar trazas');
        return;
      }

      const summaries = (listRes.data || []) as any[];
      const details: any[] = [];

      for (const t of summaries) {
        const traceId = t?.id;
        if (!traceId) continue;
        const res = await api.getAITrace({ accountId: effectiveAccountId, traceId });
        if (res.success) {
          details.push(res.data);
        } else {
          details.push({ id: traceId, error: res.error || 'Error al cargar detalle' });
        }
      }

      await copyToClipboard(JSON.stringify(details, null, 2));
    } catch (e: any) {
      setError(e?.message || 'Error al copiar trazas');
    } finally {
      setIsCopyingAll(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAccountId]);

  useEffect(() => {
    if (!selectedTraceId) {
      setDetail(null);
      return;
    }
    loadTraceDetail(selectedTraceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const blob = new Blob([res.data], { type: 'application/jsonl;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const suffix = effectiveConversationFilter ? `-${effectiveConversationFilter}` : '';
      const filename = `prompt-traces-${effectiveAccountId}${suffix}-${Date.now()}.jsonl`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Error al exportar trazas');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = async () => {
    if (!effectiveAccountId) return;

    const confirmed = window.confirm('¿Limpiar trazas de Prompt Inspector para esta cuenta?');
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.clearAITraces(effectiveAccountId);
      if (!res.success) {
        setError(res.error || 'Error al limpiar trazas');
        return;
      }

      setSelectedTraceId(null);
      setDetail(null);
      await loadTraces();
    } finally {
      setIsLoading(false);
    }
  };

  if (!effectiveAccountId) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        Selecciona una cuenta para inspeccionar los prompts.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="px-4 py-3 border-b border-subtle flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-primary font-medium truncate">Prompt Inspector</div>
          <div className="text-xs text-muted truncate">Trazas exactas del payload enviado a la IA y del usage devuelto</div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors',
              (isExporting || isCopyingAll || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
            disabled={isExporting || isCopyingAll || isLoading}
            title="Exportar JSONL"
          >
            <Download size={16} className={isExporting ? 'animate-pulse' : ''} />
          </button>
          <button
            onClick={handleCopyAll}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors',
              (isCopyingAll || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
            disabled={isCopyingAll || isLoading}
            title="Copiar todas las trazas (JSON)"
          >
            <Copy size={16} className={isCopyingAll ? 'animate-pulse' : ''} />
          </button>
          <button
            onClick={loadTraces}
            className={clsx(
              'w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            disabled={isLoading}
            title="Actualizar"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleClear}
            className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            title="Limpiar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-subtle flex items-center gap-2">
        <div className="text-xs text-muted">conversationId</div>
        <input
          value={conversationFilter}
          onChange={(e) => setConversationFilter(e.target.value)}
          placeholder="(opcional) filtrar"
          className="flex-1 bg-elevated border border-subtle rounded px-2 py-1 text-xs text-primary focus:outline-none focus:border-accent"
        />
        <button
          onClick={loadTraces}
          className="px-2 py-1 rounded bg-hover text-xs text-primary hover:bg-active transition-colors"
        >
          Aplicar
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-12">
        <div className="col-span-4 border-r border-subtle min-h-0 flex flex-col">
          <div className="px-3 py-2 text-xs text-muted border-b border-subtle">
            {traces.length} trazas
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {traces.length === 0 ? (
              <div className="p-4 text-sm text-muted">No hay trazas aún.</div>
            ) : (
              traces.map((t) => {
                const isActive = t.id === selectedTraceId;
                const tokenLabel = t.final?.usage?.total_tokens !== undefined ? `${t.final.usage.total_tokens} tok` : 'sin usage';
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTraceId(t.id)}
                    className={clsx(
                      'w-full text-left px-3 py-2 border-b border-subtle transition-colors',
                      isActive ? 'bg-active' : 'hover:bg-hover'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-primary truncate">{new Date(t.createdAt).toLocaleString()}</div>
                      <div className="text-[11px] text-muted">{tokenLabel}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-secondary truncate">conv {shortId(t.conversationId)}</div>
                      <div className="text-[11px] text-muted">{t.attempts} attempts</div>
                    </div>
                    <div className="mt-1 text-[11px] text-muted truncate">{t.model}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="col-span-8 min-h-0 flex flex-col">
          {!selectedTraceId ? (
            <div className="h-full flex items-center justify-center text-muted">
              Selecciona una traza.
            </div>
          ) : detailLoading ? (
            <div className="h-full flex items-center justify-center text-muted">
              Cargando…
            </div>
          ) : !detail ? (
            <div className="h-full flex items-center justify-center text-muted">
              No hay detalle.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="bg-elevated border border-subtle rounded p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-primary font-medium">Resumen</div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(detail, null, 2))}
                      className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
                      title="Copiar trace JSON"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="text-muted">traceId</div>
                    <div className="text-secondary break-all">{detail.id}</div>
                    <div className="text-muted">createdAt</div>
                    <div className="text-secondary">{new Date(detail.createdAt).toLocaleString()}</div>
                    <div className="text-muted">conversationId</div>
                    <div className="text-secondary break-all">{detail.conversationId}</div>
                    <div className="text-muted">model</div>
                    <div className="text-secondary">{detail.model}</div>
                    <div className="text-muted">final usage</div>
                    <div className="text-secondary">
                      {detail.final?.usage
                        ? `${detail.final.usage.prompt_tokens} + ${detail.final.usage.completion_tokens} = ${detail.final.usage.total_tokens}`
                        : '—'}
                    </div>
                  </div>
                </div>

                {detail?.context?.assistantMeta && (
                  <div className="bg-elevated border border-subtle rounded p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-primary font-medium">Runtime</div>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(detail.context.assistantMeta, null, 2))}
                        className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
                        title="Copiar assistantMeta (JSON)"
                      >
                        <Copy size={16} />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="text-muted">assistant</div>
                      <div className="text-secondary break-all">
                        {detail.context.assistantMeta.assistantName || '—'} ({detail.context.assistantMeta.assistantId || '—'})
                      </div>

                      <div className="text-muted">instructions</div>
                      <div className="text-secondary break-all">
                        {Array.isArray(detail.context.assistantMeta.instructionLinks) && detail.context.assistantMeta.instructionLinks.length > 0
                          ? detail.context.assistantMeta.instructionLinks
                            .map((x: any) => `${x?.name || '—'} (${x?.id || '—'})${x?.versionId ? ` v:${x.versionId}` : ''}`)
                            .join('\n')
                          : '—'}
                      </div>

                      <div className="text-muted">vector stores</div>
                      <div className="text-secondary break-all">
                        {Array.isArray(detail.context.assistantMeta.vectorStores) && detail.context.assistantMeta.vectorStores.length > 0
                          ? detail.context.assistantMeta.vectorStores
                            .map((x: any) => `${x?.name || '—'} (${x?.id || '—'})`)
                            .join('\n')
                          : (Array.isArray(detail.context.assistantMeta.vectorStoreIds) && detail.context.assistantMeta.vectorStoreIds.length > 0
                            ? detail.context.assistantMeta.vectorStoreIds.join('\n')
                            : '—')}
                      </div>

                      <div className="text-muted">requested model</div>
                      <div className="text-secondary">
                        {detail.context.assistantMeta.modelConfig
                          ? `${detail.context.assistantMeta.modelConfig.provider || '—'} / ${detail.context.assistantMeta.modelConfig.model || '—'}`
                          : '—'}
                      </div>

                      <div className="text-muted">effective model</div>
                      <div className="text-secondary">
                        {detail.context.assistantMeta.effective
                          ? `${detail.context.assistantMeta.effective.provider || '—'} / ${detail.context.assistantMeta.effective.model || '—'}`
                          : '—'}
                      </div>

                      <div className="text-muted">effective baseUrl</div>
                      <div className="text-secondary break-all">
                        {detail.context.assistantMeta.effective?.baseUrl || '—'}
                      </div>
                    </div>
                  </div>
                )}

                <Section
                  title="System Prompt"
                  onCopy={() => copyToClipboard(detail.builtPrompt.systemPrompt)}
                  content={detail.builtPrompt.systemPrompt}
                />

                <JsonSection
                  title="Messages (with current)"
                  onCopy={() => copyToClipboard(JSON.stringify(detail.builtPrompt.messagesWithCurrent, null, 2))}
                  value={detail.builtPrompt.messagesWithCurrent}
                />

                <JsonSection
                  title="ContextData"
                  onCopy={() => copyToClipboard(JSON.stringify(detail.context, null, 2))}
                  value={detail.context}
                />

                {detail.context?.ragContext && detail.context.ragContext.context && (
                  <RagSection rag={detail.context.ragContext} />
                )}

                {Array.isArray(detail.toolsUsed) && detail.toolsUsed.length > 0 && (
                  <ToolsSection tools={detail.toolsUsed} />
                )}

                {detail.attempts?.map((a, idx) => (
                  <div key={`${a.startedAt}-${idx}`} className="bg-elevated border border-subtle rounded p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-primary font-medium">
                        Attempt {idx + 1}: {a.provider} ({a.ok ? 'ok' : 'error'})
                      </div>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(a.requestBody, null, 2))}
                        className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
                        title="Copiar requestBody"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-muted break-all">{a.baseUrl}</div>
                    {typeof a.durationMs === 'number' && (
                      <div className="mt-1 text-xs text-muted">{a.durationMs} ms</div>
                    )}
                    <div className="mt-2">
                      <pre className="text-[11px] text-secondary whitespace-pre-wrap break-words">
                        {JSON.stringify(a.requestBody, null, 2)}
                      </pre>
                    </div>
                    {a.error && (
                      <div className="mt-2 text-xs text-error whitespace-pre-wrap break-words">
                        {JSON.stringify(a.error, null, 2)}
                      </div>
                    )}
                    {a.response?.usage && (
                      <div className="mt-2 text-xs text-secondary">
                        usage: {a.response.usage.prompt_tokens} + {a.response.usage.completion_tokens} = {a.response.usage.total_tokens}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section(props: { title: string; content: string; onCopy: () => void }) {
  return (
    <div className="bg-elevated border border-subtle rounded p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-primary font-medium">{props.title}</div>
        <button
          onClick={props.onCopy}
          className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
          title="Copiar"
        >
          <Copy size={16} />
        </button>
      </div>
      <pre className="mt-2 text-[11px] text-secondary whitespace-pre-wrap break-words">
        {props.content}
      </pre>
    </div>
  );
}

function JsonSection(props: { title: string; value: any; onCopy: () => void }) {
  return (
    <div className="bg-elevated border border-subtle rounded p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-primary font-medium">{props.title}</div>
        <button
          onClick={props.onCopy}
          className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
          title="Copiar"
        >
          <Copy size={16} />
        </button>
      </div>
      <pre className="mt-2 text-[11px] text-secondary whitespace-pre-wrap break-words">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}

function RagSection({
  rag,
}: {
  rag: {
    context: string;
    sources?: Array<{ content: string; source: string; similarity?: number }>;
    totalTokens?: number;
    chunksUsed?: number;
    vectorStoreIds?: string[];
  };
}) {
  const sources = Array.isArray(rag.sources) ? rag.sources : [];
  return (
    <div className="bg-elevated border border-subtle rounded p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-primary font-medium">Base de conocimiento</div>
        <button
          onClick={() => copyToClipboard(rag.context || '')}
          className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
          title="Copiar contexto"
        >
          <Copy size={16} />
        </button>
      </div>
      <div className="mt-2 text-xs text-secondary space-y-1">
        {typeof rag.totalTokens === 'number' && (
          <div>Total tokens: {rag.totalTokens}</div>
        )}
        {typeof rag.chunksUsed === 'number' && (
          <div>Chunks usados: {rag.chunksUsed}</div>
        )}
        {Array.isArray(rag.vectorStoreIds) && rag.vectorStoreIds.length > 0 && (
          <div>Vector stores: {rag.vectorStoreIds.join(', ')}</div>
        )}
      </div>
      <pre className="mt-2 text-[11px] text-secondary whitespace-pre-wrap break-words">
        {rag.context || '(sin contexto)'}
      </pre>
      {sources.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-muted mb-1">Fuentes ({sources.length})</div>
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div key={`${source.source}-${idx}`} className="bg-base border border-subtle rounded p-2 text-[11px] space-y-1">
                <div className="flex items-center gap-2 text-secondary">
                  <span className="font-medium">{source.source || 'Fuente desconocida'}</span>
                  {typeof source.similarity === 'number' && (
                    <span className="text-muted flex items-center gap-1">
                      <Clock size={10} />
                      sim {source.similarity.toFixed(3)}
                    </span>
                  )}
                </div>
                <div className="text-muted whitespace-pre-wrap break-words">{source.content || '(sin contenido)'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolsSection({ tools }: { tools: Array<any> }) {
  return (
    <div className="bg-elevated border border-subtle rounded p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-primary font-medium">Herramientas ejecutadas</div>
        <button
          onClick={() => copyToClipboard(JSON.stringify(tools, null, 2))}
          className="w-8 h-8 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
          title="Copiar toolsUsed"
        >
          <Copy size={16} />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {tools.map((tool, idx) => {
          const status = tool?.status || 'not_invoked';
          const isError = status === 'error';
          const isPending = status === 'not_invoked';
          return (
            <div key={idx} className="border border-subtle rounded p-2 text-xs space-y-1">
              <div className="flex items-center gap-2 text-primary">
                <span className="font-medium">{tool?.name || tool?.connectionId || 'Herramienta'}</span>
                <StatusBadge status={status} />
              </div>
              {tool?.connectionId && (
                <div className="text-muted">connectionId: {tool.connectionId}</div>
              )}
              {tool?.startedAt && (
                <div className="text-muted">startedAt: {tool.startedAt}</div>
              )}
              {typeof tool?.durationMs === 'number' && (
                <div className="text-muted">duration: {tool.durationMs} ms</div>
              )}
              {tool?.input && (
                <div>
                  <div className="text-muted">input:</div>
                  <pre className="text-[11px] text-secondary whitespace-pre-wrap break-words">
                    {JSON.stringify(tool.input, null, 2)}
                  </pre>
                </div>
              )}
              {tool?.output && (
                <div>
                  <div className="text-muted">output:</div>
                  <pre className="text-[11px] text-secondary whitespace-pre-wrap break-words">
                    {JSON.stringify(tool.output, null, 2)}
                  </pre>
                </div>
              )}
              {tool?.error && (
                <div className="text-error text-[11px] whitespace-pre-wrap break-words">
                  {JSON.stringify(tool.error, null, 2)}
                </div>
              )}
              {isPending && (
                <div className="flex items-center gap-1 text-muted text-[11px]">
                  <Clock size={10} /> Pendiente de ejecución
                </div>
              )}
              {isError && !tool?.error && (
                <div className="flex items-center gap-1 text-error text-[11px]">
                  <AlertTriangle size={10} /> Error sin detalle
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <span className="text-green-400 text-[11px]">success</span>;
    case 'error':
      return (
        <span className="text-red-400 text-[11px] flex items-center gap-1">
          <AlertTriangle size={10} /> error
        </span>
      );
    case 'not_invoked':
    default:
      return (
        <span className="text-muted text-[11px] flex items-center gap-1">
          <Clock size={10} /> sin uso
        </span>
      );
  }
}
