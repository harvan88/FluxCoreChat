import { useState, useEffect } from 'react';
import {
    Loader2,
    AlertCircle,
    Zap,
    Clock,
    FileText,
    Activity,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../../../services/api';

interface FluxiWorkDetailProps {
    accountId: string;
    workId: string;
}

export function FluxiWorkDetail({ accountId, workId }: FluxiWorkDetailProps) {
    const [work, setWork] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'slots' | 'events'>('slots');

    useEffect(() => {
        async function loadWork() {
            setIsLoading(true);
            try {
                const response = await api.getWork(accountId, workId);
                if (response.success && response.data) {
                    setWork(response.data);
                } else {
                    setError(response.error || 'Error al cargar el trabajo');
                }
            } catch (err) {
                console.error('[FluxiWorkDetail] Error:', err);
                setError('Error de conexión');
            } finally {
                setIsLoading(false);
            }
        }

        if (accountId && workId) {
            loadWork();
        }
    }, [accountId, workId]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-muted">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando detalle...
            </div>
        );
    }

    if (error || !work) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-error p-6">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>{error || 'Trabajo no encontrado'}</p>
            </div>
        );
    }

    const getStateColor = (state: string) => {
        switch (state) {
            case 'ACTIVE': return 'text-primary bg-primary/10 border-primary/20';
            case 'COMPLETED': return 'text-green-600 bg-green-500/10 border-green-500/20';
            case 'FAILED': return 'text-red-600 bg-red-500/10 border-red-500/20';
            case 'CANCELLED': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
            default: return 'text-muted bg-surface-hover border-subtle';
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-surface">
            {/* Header */}
            <div className="p-4 border-b border-subtle flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-primary">
                            {work.workDefinitionId}
                            <span className="ml-2 text-xs text-muted font-normal border border-subtle px-1.5 py-0.5 rounded">
                                v{work.workDefinitionVersion}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getStateColor(work.state)}`}>
                                {work.state}
                            </span>
                            <span className="text-xs text-muted flex items-center gap-1">
                                <Clock size={10} />
                                {formatDistanceToNow(new Date(work.createdAt), { addSuffix: true, locale: es })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-subtle px-4">
                <button
                    onClick={() => setActiveTab('slots')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'slots'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-primary hover:border-subtle'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={14} />
                        Slots (Estado)
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'events'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-primary hover:border-subtle'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Activity size={14} />
                        Historial de Eventos
                    </div>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'slots' && (
                    <div className="space-y-4">
                        {work.slots && work.slots.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {work.slots.map((slot: any) => (
                                    <div key={slot.id} className="p-3 rounded-lg border border-subtle bg-surface-hover/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-mono text-muted">{slot.path}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${slot.status === 'committed'
                                                ? 'bg-green-500/5 text-green-600 border-green-500/10'
                                                : 'bg-yellow-500/5 text-yellow-600 border-yellow-500/10'
                                                }`}>
                                                {slot.status}
                                            </span>
                                        </div>
                                        <div className="font-medium text-sm text-primary break-all">
                                            {typeof slot.value === 'object'
                                                ? JSON.stringify(slot.value)
                                                : String(slot.value)}
                                        </div>
                                        {slot.evidence && (
                                            <div className="mt-2 pt-2 border-t border-subtle/50 text-xs text-muted">
                                                <span className="font-medium">Evidencia: </span>
                                                <span className="italic">"{slot.evidence.text || slot.evidence}"</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted text-sm">
                                No hay slots registrados
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="relative border-l border-subtle ml-3 space-y-6 py-2">
                        {work.events && work.events.length > 0 ? (
                            work.events.map((event: any) => (
                                <div key={event.id} className="relative pl-6">
                                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-subtle bg-surface ring-4 ring-surface">
                                        {event.eventType === 'work_created' && <Zap size={10} className="text-blue-500" />}
                                        {event.eventType === 'semantic_commit' && <CheckCircle size={10} className="text-green-500" />}
                                        {event.eventType === 'error' && <XCircle size={10} className="text-red-500" />}
                                        {!['work_created', 'semantic_commit', 'error'].includes(event.eventType) && (
                                            <div className="w-1.5 h-1.5 bg-subtle rounded-full m-0.5" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-primary">
                                                {event.eventType.replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                            <span className="text-xs text-muted">
                                                {format(new Date(event.createdAt), 'HH:mm:ss')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-secondary">
                                            Actor: <span className="font-mono text-muted">{event.actor}</span>
                                        </div>
                                        {event.delta && (
                                            <pre className="mt-2 p-2 rounded bg-surface-hover text-[10px] overflow-x-auto text-muted">
                                                {JSON.stringify(event.delta, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="pl-6 text-sm text-muted">
                                No hay eventos registrados
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
