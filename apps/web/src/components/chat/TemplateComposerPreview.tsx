import React, { useState, useEffect } from 'react';
import { X, Zap, Send, CheckCircle2 } from 'lucide-react';
import type { Template } from '../templates/types';
import { Badge } from '../ui/Badge';

interface TemplateComposerPreviewProps {
    template: Template;
    onCancel: () => void;
    onSend: (variables: Record<string, string>) => void;
    isSending?: boolean;
}

export function TemplateComposerPreview({ template, onCancel, onSend, isSending }: TemplateComposerPreviewProps) {
    const [variables, setVariables] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialVars: Record<string, string> = {};
        template.variables.forEach(v => {
            initialVars[v.name] = v.defaultValue || '';
        });
        setVariables(initialVars);
    }, [template]);

    const handleVarChange = (name: string, value: string) => {
        setVariables(prev => ({ ...prev, [name]: value }));
    };

    const isReady = template.variables.every(v => !v.required || (variables[v.name] && variables[v.name].trim().length > 0));

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-2 z-20 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-surface border border-accent/30 rounded-2xl shadow-2xl overflow-hidden ring-4 ring-black/5">
                {/* Header Estilo Herramientas */}
                <div className="px-4 py-2 bg-accent/5 border-b border-accent/10 flex items-center justify-between bg-gradient-to-r from-accent/5 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Zap size={12} className="text-accent fill-accent" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-accent/60 leading-none">Validación de Plantilla</span>
                            <span className="text-sm font-bold text-primary leading-tight">{template.name}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel}
                        className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content Preview */}
                <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="text-sm leading-relaxed text-secondary bg-active/40 p-4 rounded-xl border border-subtle border-dashed italic relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Bot size={40} />
                        </div>
                        {template.content.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                            const match = part.match(/\{\{([^}]+)\}\}/);
                            if (match) {
                                const varName = match[1];
                                const val = variables[varName];
                                return (
                                    <span key={i} className={`px-1.5 py-0.5 rounded font-mono font-bold mx-0.5 transition-colors ${val ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
                                        {val || varName}
                                    </span>
                                );
                            }
                            return part;
                        })}
                    </div>

                    {/* Variable Inputs Grid */}
                    {template.variables.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            {template.variables.map(v => (
                                <div key={v.name} className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1 ml-1">
                                        {v.label || v.name} 
                                        {v.required && <span className="text-destructive">*</span>}
                                        {variables[v.name] && <CheckCircle2 size={10} className="text-success" />}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={v.placeholder || `Escribe ${v.name}...`}
                                        value={variables[v.name] || ''}
                                        onChange={(e) => handleVarChange(v.name, e.target.value)}
                                        className="w-full bg-base border border-subtle rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted/50 shadow-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Action Footer */}
                <div className="px-4 py-3 bg-base/50 border-t border-subtle flex justify-end items-center gap-3">
                    <button 
                        onClick={onCancel}
                        className="text-xs font-bold text-muted hover:text-primary transition-colors px-3 py-2"
                    >
                        Descartar
                    </button>
                    <button
                        disabled={!isReady || isSending}
                        onClick={() => onSend(variables)}
                        className="flex items-center gap-2 bg-accent text-inverse px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-hover disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-accent/20 group"
                    >
                        {isSending ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <>
                                <span>Confirmar y Enviar</span>
                                <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { Bot, Loader2 } from 'lucide-react';
