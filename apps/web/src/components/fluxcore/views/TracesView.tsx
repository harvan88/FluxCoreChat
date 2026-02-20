/**
 * TracesView (Canon v8.3)
 *
 * Vista de debugging del pipeline FluxCore:
 * - ai_traces: historial de ejecuciones del runtime
 * - ai_suggestions: sugerencias pendientes de modo 'suggest' (aprobar/rechazar)
 */

import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Check, X, Clock, Zap, AlertTriangle, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../ui';

interface TracesViewProps {
    accountId: string;
}

function formatMs(ms?: number | null) {
    if (!ms) return '—';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(d?: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function TracesView({ accountId }: TracesViewProps) {
    const { token } = useAuthStore();
    const [traces, setTraces] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loadingTraces, setLoadingTraces] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [tab, setTab] = useState<'traces' | 'suggestions'>('suggestions');
    const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
    const [actionStates, setActionStates] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const loadTraces = useCallback(async () => {
        if (!accountId || !token) return;
        setLoadingTraces(true);
        try {
            const res = await fetch(`/api/fluxcore/traces?accountId=${accountId}&limit=50`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setTraces(data.data ?? []);
        } catch { /* silent */ }
        finally { setLoadingTraces(false); }
    }, [accountId, token]);

    const loadSuggestions = useCallback(async () => {
        if (!accountId || !token) return;
        setLoadingSuggestions(true);
        try {
            const res = await fetch(`/api/fluxcore/suggestions?accountId=${accountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setSuggestions(data.data ?? []);
        } catch { /* silent */ }
        finally { setLoadingSuggestions(false); }
    }, [accountId, token]);

    useEffect(() => {
        loadTraces();
        loadSuggestions();
    }, [loadTraces, loadSuggestions]);

    const handleSuggestionAction = async (id: string, status: 'approved' | 'rejected' | 'edited', edited?: string) => {
        if (!token) return;
        setActionStates(s => ({ ...s, [id]: 'loading' }));
        try {
            const res = await fetch(`/api/fluxcore/suggestions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status, editedContent: edited }),
            });
            const data = await res.json();
            if (data.success) {
                setActionStates(s => ({ ...s, [id]: 'done' }));
                setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
                setEditingId(null);
            } else {
                setActionStates(s => ({ ...s, [id]: 'error' }));
            }
        } catch {
            setActionStates(s => ({ ...s, [id]: 'error' }));
        }
    };

    const pendingCount = suggestions.filter(s => s.status === 'pending').length;

    return (
        <div className="h-full flex flex-col bg-surface">
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <Activity size={20} className="text-accent" />
                        Trazas del runtime
                    </h2>
                    <p className="text-xs text-muted">Canon v8.3 — historial de ejecuciones y sugerencias</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { loadTraces(); loadSuggestions(); }} disabled={loadingTraces && loadingSuggestions}>
                    <RefreshCw size={14} className={(loadingTraces || loadingSuggestions) ? 'animate-spin' : ''} />
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-subtle px-4 flex-shrink-0">
                <button
                    type="button"
                    onClick={() => setTab('suggestions')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'suggestions' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'}`}
                >
                    Sugerencias
                    {pendingCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-warning/20 text-warning font-bold">{pendingCount}</span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setTab('traces')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'traces' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary'}`}
                >
                    Ejecuciones
                    <span className="ml-2 text-[10px] text-muted">{traces.length}</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {/* SUGGESTIONS TAB */}
                {tab === 'suggestions' && (
                    <div className="p-4 space-y-3">
                        {loadingSuggestions ? (
                            <div className="flex items-center justify-center h-32 text-muted text-sm">Cargando...</div>
                        ) : suggestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted text-sm">
                                <Check size={32} className="mb-2 text-success" />
                                No hay sugerencias pendientes
                            </div>
                        ) : (
                            suggestions.map(s => (
                                <div key={s.id} className={`rounded-lg border p-4 space-y-3 ${s.status === 'pending' ? 'border-warning/30 bg-warning/5' : s.status === 'approved' || s.status === 'edited' ? 'border-success/20 bg-success/5' : 'border-subtle bg-elevated/40 opacity-60'}`}>
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    s.status === 'pending' ? 'bg-warning/20 text-warning' :
                                                    s.status === 'approved' ? 'bg-success/20 text-success' :
                                                    s.status === 'edited' ? 'bg-accent/20 text-accent' :
                                                    'bg-muted/20 text-muted'
                                                }`}>{s.status}</span>
                                                <span className="text-[10px] text-muted">{s.provider}/{s.model}</span>
                                                <span className="text-[10px] text-muted">{formatDate(s.generatedAt)}</span>
                                            </div>
                                            <p className="text-xs text-muted mt-1 font-mono truncate">conv: {s.conversationId?.slice(0, 8)}...</p>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    {editingId === s.id ? (
                                        <textarea
                                            className="w-full bg-input border border-subtle rounded px-3 py-2 text-sm text-primary resize-none focus:outline-none focus:border-accent"
                                            rows={4}
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                        />
                                    ) : (
                                        <p className="text-sm text-primary whitespace-pre-wrap bg-elevated rounded px-3 py-2 border border-subtle">{s.content}</p>
                                    )}

                                    {/* Actions */}
                                    {s.status === 'pending' && actionStates[s.id] !== 'done' && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {editingId === s.id ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSuggestionAction(s.id, 'edited', editContent)}
                                                        disabled={actionStates[s.id] === 'loading'}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-inverse hover:bg-accent/90 transition-colors disabled:opacity-50"
                                                    >
                                                        <Send size={12} /> Enviar editado
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingId(null)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-elevated border border-subtle text-secondary hover:bg-hover transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSuggestionAction(s.id, 'approved')}
                                                        disabled={actionStates[s.id] === 'loading'}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition-colors disabled:opacity-50"
                                                    >
                                                        <Check size={12} /> Aprobar y enviar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingId(s.id); setEditContent(s.content); }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                                                    >
                                                        Editar y enviar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSuggestionAction(s.id, 'rejected')}
                                                        disabled={actionStates[s.id] === 'loading'}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50"
                                                    >
                                                        <X size={12} /> Rechazar
                                                    </button>
                                                </>
                                            )}
                                            {actionStates[s.id] === 'error' && (
                                                <span className="text-xs text-error flex items-center gap-1"><AlertTriangle size={12} /> Error al procesar</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TRACES TAB */}
                {tab === 'traces' && (
                    <div className="p-4 space-y-2">
                        {loadingTraces ? (
                            <div className="flex items-center justify-center h-32 text-muted text-sm">Cargando...</div>
                        ) : traces.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted text-sm">
                                <Activity size={32} className="mb-2" />
                                Sin trazas de ejecución aún
                            </div>
                        ) : (
                            traces.map(t => {
                                const isExpanded = expandedTrace === t.id;
                                return (
                                    <div key={t.id} className="rounded-lg border border-subtle bg-elevated overflow-hidden">
                                        <button
                                            type="button"
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-hover transition-colors"
                                            onClick={() => setExpandedTrace(isExpanded ? null : t.id)}
                                        >
                                            {isExpanded ? <ChevronDown size={14} className="text-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-muted flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${t.mode === 'auto' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{t.mode}</span>
                                                    <span className="text-xs text-primary font-mono">{t.provider}/{t.model}</span>
                                                    <span className="text-xs text-muted">{t.runtime}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
                                                    <span className="flex items-center gap-1"><Clock size={10} />{formatMs(t.durationMs)}</span>
                                                    <span className="flex items-center gap-1"><Zap size={10} />{(t.totalTokens ?? 0).toLocaleString()} tokens</span>
                                                    <span>{formatDate(t.createdAt)}</span>
                                                </div>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-subtle space-y-3 pt-3">
                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                    <div><span className="text-muted block">Conversación</span><span className="font-mono text-primary">{t.conversationId?.slice(0, 8)}...</span></div>
                                                    <div><span className="text-muted block">Duración</span><span className="text-primary">{formatMs(t.durationMs)}</span></div>
                                                    <div><span className="text-muted block">Prompt tokens</span><span className="text-primary">{(t.promptTokens ?? 0).toLocaleString()}</span></div>
                                                    <div><span className="text-muted block">Completion tokens</span><span className="text-primary">{(t.completionTokens ?? 0).toLocaleString()}</span></div>
                                                    {t.toolsCalled?.length > 0 && (
                                                        <div className="col-span-2"><span className="text-muted block">Tools usadas</span><span className="text-accent">{t.toolsCalled.join(', ')}</span></div>
                                                    )}
                                                </div>
                                                {t.responseContent && (
                                                    <div>
                                                        <span className="text-xs text-muted block mb-1">Respuesta generada</span>
                                                        <p className="text-xs text-primary bg-surface rounded px-3 py-2 border border-subtle whitespace-pre-wrap max-h-40 overflow-auto">{t.responseContent}</p>
                                                    </div>
                                                )}
                                                {t.attempts?.length > 0 && (
                                                    <div>
                                                        <span className="text-xs text-muted block mb-1">Intentos ({t.attempts.length})</span>
                                                        <div className="space-y-1">
                                                            {t.attempts.map((a: any, i: number) => (
                                                                <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${a.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                                                    {a.success ? <Check size={10} /> : <X size={10} />}
                                                                    <span>{a.provider}/{a.model}</span>
                                                                    <span className="text-muted">{formatMs(a.durationMs)}</span>
                                                                    {a.error && <span className="text-error truncate">{a.error}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TracesView;
