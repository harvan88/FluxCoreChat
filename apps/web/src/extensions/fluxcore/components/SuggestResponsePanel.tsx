/**
 * SuggestResponsePanel (Canon v8.3)
 *
 * Se muestra encima del input del compositor cuando mode='suggest'.
 * Recupera sugerencias pendientes de la IA para la conversación actual
 * y permite al operador aprobarlas, editarlas o rechazarlas antes de enviar.
 *
 * Componente diseñado para ser independiente y extensible en el futuro.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, X, Pencil, Loader2, BotMessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 4000;

interface Suggestion {
    id: string;
    conversationId: string;
    content: string;
    model: string;
    provider: string;
    status: string;
    generatedAt: string;
}

interface SuggestResponsePanelProps {
    accountId: string;
    conversationId: string;
    /** Called after a suggestion is approved/edited so caller can refresh the conversation */
    onSent?: () => void;
}

export function SuggestResponsePanel({ accountId, conversationId, onSent }: SuggestResponsePanelProps) {
    const { token } = useAuthStore();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionState, setActionState] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchSuggestions = useCallback(async () => {
        if (!accountId || !conversationId || !token) return;
        try {
            const res = await fetch(
                `${API_URL}/fluxcore/suggestions?accountId=${accountId}&status=pending`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                const forConv = (data.data as Suggestion[]).filter(s => s.conversationId === conversationId);
                setSuggestions(forConv);
            }
        } catch { /* silent */ }
    }, [accountId, conversationId, token]);

    useEffect(() => {
        setLoading(true);
        fetchSuggestions().finally(() => setLoading(false));

        pollRef.current = setInterval(fetchSuggestions, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchSuggestions]);

    const handleAction = async (id: string, status: 'approved' | 'rejected' | 'edited', edited?: string) => {
        if (!token) return;
        setActionState(s => ({ ...s, [id]: 'loading' }));
        try {
            const res = await fetch(`${API_URL}/fluxcore/suggestions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status, editedContent: edited }),
            });
            const data = await res.json();
            if (data.success) {
                setActionState(s => ({ ...s, [id]: 'done' }));
                setSuggestions(prev => prev.filter(s => s.id !== id));
                setEditingId(null);
                onSent?.();
            } else {
                setActionState(s => ({ ...s, [id]: 'error' }));
            }
        } catch {
            setActionState(s => ({ ...s, [id]: 'error' }));
        }
    };

    const pending = suggestions.filter(s => actionState[s.id] !== 'done');
    if (!loading && pending.length === 0) return null;

    return (
        <div className="mb-2 rounded-2xl border border-warning/40 bg-warning/5 overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setCollapsed(v => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-warning/10 transition-colors text-left"
            >
                <BotMessageSquare size={16} className="text-warning flex-shrink-0" />
                <span className="text-xs font-semibold text-warning flex-1">
                    {loading && pending.length === 0
                        ? 'Buscando sugerencias...'
                        : `${pending.length} respuesta${pending.length !== 1 ? 's' : ''} de la IA pendiente${pending.length !== 1 ? 's' : ''}`}
                </span>
                {collapsed ? <ChevronDown size={14} className="text-warning" /> : <ChevronUp size={14} className="text-warning" />}
            </button>

            {!collapsed && (
                <div className="px-4 pb-3 space-y-3">
                    {loading && pending.length === 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted py-1">
                            <Loader2 size={12} className="animate-spin" /> Cargando...
                        </div>
                    )}

                    {pending.map(s => (
                        <div key={s.id} className="rounded-xl border border-warning/20 bg-surface overflow-hidden">
                            {/* Suggestion content */}
                            <div className="px-3 py-2.5">
                                {editingId === s.id ? (
                                    <textarea
                                        autoFocus
                                        className="w-full bg-input border border-subtle rounded-lg px-3 py-2 text-sm text-primary resize-none focus:outline-none focus:border-accent min-h-[80px]"
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        rows={3}
                                    />
                                ) : (
                                    <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{s.content}</p>
                                )}
                                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted">
                                    <span>{s.provider}/{s.model}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className={clsx(
                                'flex items-center gap-1.5 px-3 py-2 border-t border-warning/10',
                                editingId === s.id ? 'justify-end' : 'justify-between'
                            )}>
                                {editingId === s.id ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-elevated border border-subtle text-secondary hover:bg-hover transition-colors"
                                        >
                                            <X size={11} /> Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!editContent.trim() || actionState[s.id] === 'loading'}
                                            onClick={() => handleAction(s.id, 'edited', editContent)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-accent text-inverse hover:bg-accent/90 transition-colors disabled:opacity-50"
                                        >
                                            {actionState[s.id] === 'loading'
                                                ? <Loader2 size={11} className="animate-spin" />
                                                : <Send size={11} />}
                                            Enviar edición
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            disabled={actionState[s.id] === 'loading'}
                                            onClick={() => handleAction(s.id, 'rejected')}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                                        >
                                            <X size={11} /> Rechazar
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => { setEditingId(s.id); setEditContent(s.content); }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-elevated border border-subtle text-secondary hover:bg-hover transition-colors"
                                            >
                                                <Pencil size={11} /> Editar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actionState[s.id] === 'loading'}
                                                onClick={() => handleAction(s.id, 'approved')}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-success/20 text-success hover:bg-success/30 transition-colors font-medium disabled:opacity-50"
                                            >
                                                {actionState[s.id] === 'loading'
                                                    ? <Loader2 size={11} className="animate-spin" />
                                                    : <Check size={11} />}
                                                Aprobar y enviar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
