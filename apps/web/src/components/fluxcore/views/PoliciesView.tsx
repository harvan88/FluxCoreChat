/**
 * Policies View (Canon v8.3)
 *
 * Muestra y permite editar la configuración del asistente activo
 * (timingConfig, modelConfig) — los datos que forman el PolicyContext
 * que consumen los runtimes en cada turno.
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Check, Copy, Save, AlertTriangle, Bot } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../ui';

interface PoliciesViewProps {
    accountId: string;
}

const TONE_OPTIONS = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'formal', label: 'Formal' },
    { value: 'casual', label: 'Casual' },
];

const LANGUAGE_OPTIONS = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' },
];

const MODE_OPTIONS = [
    { value: 'auto', label: 'Automático', desc: 'Responde automáticamente' },
    { value: 'suggest', label: 'Supervisado', desc: 'Genera sugerencias para revisar' },
    { value: 'off', label: 'Apagado', desc: 'No responde' },
];

export function PoliciesView({ accountId }: PoliciesViewProps) {
    const { token } = useAuthStore();
    const [assistant, setAssistant] = useState<any>(null);
    const [timingDraft, setTimingDraft] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showAssistantRaw, setShowAssistantRaw] = useState(false);
    const [showPolicyRaw, setShowPolicyRaw] = useState(false);
    const [policyContext, setPolicyContext] = useState<any>(null);
    const [policyLoading, setPolicyLoading] = useState(false);
    const [policyError, setPolicyError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!accountId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/fluxcore/assistants?accountId=${accountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data?.length) {
                const active = data.data.find((a: any) => a.status === 'active' || a.status === 'production') ?? data.data[0];
                setAssistant(active);
                setTimingDraft({ 
                    ...active.timingConfig,
                    tone: active.timingConfig?.tone ?? active.modelConfig?.tone ?? 'neutral',
                    language: active.timingConfig?.language ?? active.modelConfig?.language ?? 'es',
                    useEmojis: active.timingConfig?.useEmojis ?? active.modelConfig?.useEmojis ?? false,
                });
            } else {
                setError('No hay asistentes configurados para esta cuenta.');
            }
        } catch {
            setError('Error al cargar configuración.');
        } finally {
            setLoading(false);
        }
    }, [accountId, token]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!assistant || !timingDraft || !token) return;
        setSaving(true);
        setError(null);
        try {
            const updatedModelConfig = {
                ...assistant.modelConfig,
                tone: timingDraft.tone,
                language: timingDraft.language,
                useEmojis: timingDraft.useEmojis,
            };
            const updatedTimingConfig = { ...timingDraft };
            delete updatedTimingConfig.tone;
            delete updatedTimingConfig.language;
            delete updatedTimingConfig.useEmojis;

            const res = await fetch(`/api/fluxcore/assistants/${assistant.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ 
                    accountId, 
                    timingConfig: updatedTimingConfig,
                    modelConfig: updatedModelConfig 
                }),
            });
            const data = await res.json();
            if (data.success) {
                setAssistant((prev: any) => ({ 
                    ...prev, 
                    timingConfig: updatedTimingConfig,
                    modelConfig: updatedModelConfig 
                }));
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else {
                setError(data.message ?? 'Error al guardar.');
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyRaw = () => {
        if (!assistant) return;
        navigator.clipboard.writeText(JSON.stringify({ assistant, timingConfig: timingDraft }, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const loadPolicyContext = useCallback(async () => {
        if (!accountId || !token) return;
        setPolicyLoading(true);
        setPolicyError(null);
        try {
            const res = await fetch(`/api/ai/policy-context?accountId=${accountId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setPolicyContext(data.data);
            } else {
                setPolicyError(data.message ?? 'Error al obtener PolicyContext.');
            }
        } catch {
            setPolicyError('Error al obtener PolicyContext.');
        } finally {
            setPolicyLoading(false);
        }
    }, [accountId, token]);

    const handleTogglePolicyRaw = () => {
        setShowPolicyRaw((prev) => {
            const next = !prev;
            if (next && !policyContext && !policyLoading) {
                void loadPolicyContext();
            }
            return next;
        });
    };

    const isDirty = JSON.stringify(timingDraft) !== JSON.stringify(assistant?.timingConfig);

    return (
        <div className="h-full flex flex-col bg-surface">
            {/* Header */}
            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <Shield size={20} className="text-accent" />
                        Políticas del asistente
                    </h2>
                    <p className="text-xs text-muted">Canon v8.3 — timingConfig del asistente activo</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCopyRaw} disabled={!assistant}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                {loading && (
                    <div className="flex items-center justify-center h-48 text-muted text-sm">Cargando...</div>
                )}

                {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
                        <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-warning">{error}</p>
                    </div>
                )}

                {assistant && timingDraft && (
                    <>
                        {/* Asistente activo */}
                        <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 flex items-center gap-3">
                            <Bot size={18} className="text-accent flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">{assistant.name}</p>
                                <p className="text-xs text-muted">
                                    {assistant.status} · {assistant.runtime ?? 'local'} · {assistant.modelConfig?.provider ?? '—'}/{assistant.modelConfig?.model ?? '—'}
                                </p>
                            </div>
                            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
                                assistant.status === 'active' ? 'bg-success/20 text-success' :
                                assistant.status === 'production' ? 'bg-accent/20 text-accent' :
                                'bg-muted/20 text-muted'
                            }`}>
                                {assistant.status}
                            </span>
                        </div>

                        {/* Modo de respuesta */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-primary">Modo de respuesta</label>
                            <div className="grid grid-cols-3 gap-2">
                                {MODE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setTimingDraft((d: any) => ({ ...d, mode: opt.value }))}
                                        className={`rounded-lg px-3 py-3 text-left border transition-colors ${
                                            timingDraft.mode === opt.value
                                                ? 'bg-active border-strong text-primary'
                                                : 'bg-surface border-subtle text-secondary hover:bg-hover'
                                        }`}
                                    >
                                        <div className="text-xs font-medium">{opt.label}</div>
                                        <div className="text-[10px] text-muted mt-0.5">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Delay de respuesta */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-primary">
                                Delay de respuesta — {timingDraft.responseDelaySeconds ?? 0}s
                            </label>
                            <input
                                type="range"
                                min={0} max={30} step={1}
                                value={timingDraft.responseDelaySeconds ?? 0}
                                onChange={e => setTimingDraft((d: any) => ({ ...d, responseDelaySeconds: Number(e.target.value) }))}
                                className="w-full accent-accent"
                            />
                            <div className="flex justify-between text-[10px] text-muted">
                                <span>Sin delay</span><span>30s</span>
                            </div>
                        </div>

                        {/* Tono */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-primary">Tono</label>
                            <div className="flex gap-2">
                                {TONE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setTimingDraft((d: any) => ({ ...d, tone: opt.value }))}
                                        className={`flex-1 rounded-lg px-3 py-2 text-xs border transition-colors ${
                                            timingDraft.tone === opt.value
                                                ? 'bg-active border-strong text-primary'
                                                : 'bg-surface border-subtle text-secondary hover:bg-hover'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Idioma */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-primary">Idioma</label>
                            <select
                                value={timingDraft.language ?? 'es'}
                                onChange={e => setTimingDraft((d: any) => ({ ...d, language: e.target.value }))}
                                className="w-full bg-input border border-subtle rounded px-3 py-2 text-sm text-primary"
                            >
                                {LANGUAGE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Emojis */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-primary">Usar emojis</p>
                                <p className="text-xs text-muted">El asistente puede incluir emojis en sus respuestas</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTimingDraft((d: any) => ({ ...d, useEmojis: !d.useEmojis }))}
                                className={`relative w-11 h-6 rounded-full transition-colors ${timingDraft.useEmojis ? 'bg-accent' : 'bg-muted/30'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${timingDraft.useEmojis ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>

                        {/* Save button */}
                        {isDirty && (
                            <div className="flex items-center gap-3 pt-2">
                                <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                                    {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setTimingDraft({ ...assistant.timingConfig })}
                                    className="text-sm text-muted hover:text-primary transition-colors"
                                >
                                    Descartar
                                </button>
                            </div>
                        )}

                        {/* Raw JSON toggle */}
                        <div className="pt-4 border-t border-subtle space-y-3">
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowAssistantRaw(v => !v)}
                                    className="text-xs text-muted hover:text-primary transition-colors"
                                >
                                    {showAssistantRaw ? '▲ Ocultar JSON raw' : '▼ Ver JSON del asistente'}
                                </button>
                                {showAssistantRaw && (
                                    <pre className="mt-3 bg-elevated p-4 rounded-lg overflow-auto font-mono text-[11px] leading-relaxed text-secondary border border-subtle max-h-[400px]">
                                        {JSON.stringify(assistant, null, 2)}
                                    </pre>
                                )}
                            </div>

                            <div>
                                <button
                                    type="button"
                                    onClick={handleTogglePolicyRaw}
                                    className="text-xs text-muted hover:text-primary transition-colors"
                                >
                                    {showPolicyRaw ? '▲ Ocultar JSON Policy context' : '▼ Ver JSON Policy context'}
                                </button>
                                {policyError && showPolicyRaw && (
                                    <p className="mt-2 text-[11px] text-warning">{policyError}</p>
                                )}
                                {showPolicyRaw && (
                                    <pre className="mt-3 bg-elevated p-4 rounded-lg overflow-auto font-mono text-[11px] leading-relaxed text-secondary border border-subtle max-h-[400px]">
                                        {policyLoading ? 'Cargando...' : JSON.stringify(policyContext, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PoliciesView;
