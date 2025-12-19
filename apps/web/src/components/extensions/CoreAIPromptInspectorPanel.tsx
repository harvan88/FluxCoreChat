import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
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

export function CoreAIPromptInspectorPanel() {
  const selectedAccountId = useUIStore((s) => s.selectedAccountId);

  const [conversationFilter, setConversationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);

  const effectiveConversationFilter = useMemo(() => {
    const trimmed = conversationFilter.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [conversationFilter]);

  const loadTraces = async () => {
    if (!selectedAccountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.getAITraces({
        accountId: selectedAccountId,
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
    if (!selectedAccountId) return;
    if (isCopyingAll) return;

    setIsCopyingAll(true);
    setError(null);

    try {
      const listRes = await api.getAITraces({
        accountId: selectedAccountId,
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
        const res = await api.getAITrace({ accountId: selectedAccountId, traceId });
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
    if (!selectedAccountId) return;

    setDetailLoading(true);
    setError(null);

    try {
      const res = await api.getAITrace({ accountId: selectedAccountId, traceId });
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

    if (selectedAccountId) {
      loadTraces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedTraceId) {
      setDetail(null);
      return;
    }
    loadTraceDetail(selectedTraceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTraceId]);

  const handleClear = async () => {
    if (!selectedAccountId) return;

    const confirmed = window.confirm('¿Limpiar trazas de Prompt Inspector para esta cuenta?');
    if (!confirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.clearAITraces(selectedAccountId);
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

  if (!selectedAccountId) {
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
