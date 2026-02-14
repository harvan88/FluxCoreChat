import { useState, useEffect } from 'react';
import {
    Loader2,
    AlertCircle,
    Bot,
    CheckCircle,
    XCircle,
    ArrowRight,
    Quote
} from 'lucide-react';
import { api } from '../../../services/api';

interface FluxiProposedWorkDetailProps {
    accountId: string;
    proposedWorkId: string;
}

export function FluxiProposedWorkDetail({ accountId, proposedWorkId }: FluxiProposedWorkDetailProps) {
    const [proposed, setProposed] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProposed() {
            setIsLoading(true);
            try {
                const response = await api.getProposedWork(accountId, proposedWorkId);
                if (response.success && response.data) {
                    setProposed(response.data);
                } else {
                    setError(response.error || 'Error al cargar la propuesta');
                }
            } catch (err) {
                console.error('[FluxiProposedWorkDetail] Error:', err);
                setError('Error de conexión');
            } finally {
                setIsLoading(false);
            }
        }

        if (accountId && proposedWorkId) {
            loadProposed();
        }
    }, [accountId, proposedWorkId]);

    const handleAction = async (action: 'open' | 'discard') => {
        setIsProcessing(true);
        try {
            if (action === 'open') {
                const response = await api.openWork(accountId, proposedWorkId);
                if (response.success) {
                    // Refresh or redirect (for now just reload or show success)
                    //Ideally trigger a parent refresh or close tab
                    alert('Trabajo abierto exitosamente');
                    // In a real app we'd use a toast and probably close this tab to open the new work tab
                } else {
                    alert('Error al abrir trabajo: ' + response.error);
                }
            } else {
                const response = await api.discardWork(accountId, proposedWorkId);
                if (response.success) {
                    alert('Propuesta descartada');
                } else {
                    alert('Error al descartar: ' + response.error);
                }
            }
        } catch (err) {
            console.error('Error processing action:', err);
            alert('Error de conexión');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-muted">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando propuesta...
            </div>
        );
    }

    if (error || !proposed) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-error p-6">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>{error || 'Propuesta no encontrada'}</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-surface">
            {/* Header */}
            <div className="p-4 border-b border-subtle bg-surface-hover/30">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-primary">
                                Propuesta de Trabajo
                            </h2>
                            <p className="text-sm text-secondary">
                                {proposed.workDefinitionId || 'Sin definición'}
                            </p>
                        </div>
                    </div>
                    {proposed.confidence && (
                        <div className="text-right">
                            <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                {(proposed.confidence * 100).toFixed(0)}% Confianza
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-4 p-3 bg-surface border border-subtle rounded-lg">
                    <h3 className="text-xs text-muted font-medium uppercase mb-1">Intención Detectada</h3>
                    <p className="text-sm text-primary italic">"{proposed.intent}"</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                    <ArrowRight size={16} />
                    Slots Candidatos
                </h3>

                <div className="space-y-4">
                    {proposed.candidateSlots && proposed.candidateSlots.length > 0 ? (
                        proposed.candidateSlots.map((slot: any, index: number) => (
                            <div key={index} className="p-3 rounded-lg border border-subtle bg-surface hover:border-primary/30 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono font-medium text-accent px-1.5 py-0.5 rounded bg-accent/10">
                                        {slot.path}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <span className="text-sm font-medium text-primary block">
                                        {typeof slot.value === 'object' ? JSON.stringify(slot.value) : String(slot.value)}
                                    </span>
                                </div>

                                {slot.evidence && (
                                    <div className="flex items-start gap-2 text-xs text-muted bg-surface-hover/50 p-2 rounded">
                                        <Quote size={12} className="mt-0.5 flex-shrink-0" />
                                        <div className="italic">
                                            "{slot.evidence.text || slot.evidence}"
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted text-sm border-2 border-dashed border-subtle rounded-lg">
                            No hay slots identificados
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-subtle bg-surface-hover/30 flex items-center justify-end gap-3">
                <button
                    onClick={() => handleAction('discard')}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                >
                    <XCircle size={16} />
                    Descartar
                </button>
                <button
                    onClick={() => handleAction('open')}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Aprobar y Abrir
                </button>
            </div>
        </div>
    );
}
