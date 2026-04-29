
import React, { useState } from 'react';
import { X, Check, PenLine, Database, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ProposedWork {
    proposedWorkId: string;
    typeId: string;
    intent: string;
    candidateSlots: Array<{
        path: string;
        value: any;
        description?: string;
    }>;
}

interface ProposedWorkPreviewProps {
    proposal: ProposedWork;
    onCancel: () => void;
    onAuthorize: (values: Record<string, any>) => Promise<void>;
    isSending?: boolean;
}

export function ProposedWorkPreview({ proposal, onCancel, onAuthorize, isSending }: ProposedWorkPreviewProps) {
    const [values, setValues] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        proposal.candidateSlots.forEach(slot => {
            initial[slot.path] = slot.value;
        });
        return initial;
    });

    const handleValueChange = (path: string, value: any) => {
        setValues(prev => ({ ...prev, [path]: value }));
    };

    const handleConfirm = () => {
        void onAuthorize(values);
    };

    return (
        <div className="mb-4 bg-surface border border-accent/30 rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-accent/5 px-4 py-3 border-b border-accent/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Database size={16} className="text-accent" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-accent uppercase tracking-wider">Propuesta de FluxCore</div>
                        <div className="text-sm font-semibold text-primary">
                            {proposal.typeId === 'template_creation_v1' ? 'Crear Nueva Plantilla' : proposal.intent}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onCancel}
                    className="p-1.5 rounded-full hover:bg-hover text-secondary transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Form Content */}
            <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
                {proposal.candidateSlots.map((slot) => (
                    <div key={slot.path} className="space-y-1.5">
                        <label className="text-[11px] font-bold text-secondary uppercase px-1 flex justify-between">
                            <span>{slot.path}</span>
                            {slot.description && <span className="text-[10px] font-normal lowercase opacity-70 italic">{slot.description}</span>}
                        </label>
                        
                        {typeof slot.value === 'boolean' ? (
                            <div className="flex items-center gap-2 px-1">
                                <input 
                                    type="checkbox" 
                                    checked={values[slot.path]} 
                                    onChange={(e) => handleValueChange(slot.path, e.target.checked)}
                                    className="w-4 h-4 rounded border-default text-accent focus:ring-accent"
                                />
                                <span className="text-sm text-primary">Habilitar</span>
                            </div>
                        ) : slot.path === 'content' ? (
                            <textarea 
                                value={values[slot.path] || ''} 
                                onChange={(e) => handleValueChange(slot.path, e.target.value)}
                                className="w-full bg-elevated border border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent min-h-[80px] resize-none"
                                placeholder="Escribe el contenido..."
                            />
                        ) : (
                            <input 
                                type="text" 
                                value={values[slot.path] || ''} 
                                onChange={(e) => handleValueChange(slot.path, e.target.value)}
                                className="w-full bg-elevated border border-default rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                                placeholder={`Ingresar ${slot.path}...`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 bg-elevated/50 border-t border-default flex items-center justify-between gap-3">
                <p className="text-[10px] text-secondary leading-tight max-w-[60%]">
                    Al autorizar, FluxCore ejecutará la acción operativa de forma definitiva.
                </p>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-semibold rounded-full hover:bg-hover text-secondary transition-colors"
                    >
                        Descartar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isSending}
                        className="px-5 py-2 text-xs font-bold rounded-full bg-accent text-inverse hover:bg-accent-hover transition-all flex items-center gap-2 shadow-sm"
                    >
                        {isSending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Check size={14} />
                        )}
                        Autorizar y Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
