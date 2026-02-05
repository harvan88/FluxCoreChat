import { useState, useEffect } from 'react';
import { Zap, X, Paperclip } from 'lucide-react';
import { useTemplateStore } from '../templates/store/templateStore';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import type { Template } from '../templates/types';

interface TemplateQuickPickerProps {
    accountId: string;
    onSelect: (template: Template) => void;
    onClose: () => void;
}

export function TemplateQuickPicker({ accountId, onSelect, onClose }: TemplateQuickPickerProps) {
    const { templates, fetchTemplates, isLoading } = useTemplateStore();
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (accountId && templates.length === 0) {
            fetchTemplates(accountId);
        }
    }, [accountId, templates.length, fetchTemplates]);

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-surface border border-subtle rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[400px]">
                {/* Header */}
                <div className="px-3 py-2 border-b border-subtle bg-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-warning fill-warning" />
                        <span className="text-sm font-semibold text-primary">Respuestas rápidas</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-muted hover:text-primary rounded-md hover:bg-hover"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-2 border-b border-subtle">
                    <Input
                        variant="search"
                        placeholder="Buscar plantilla..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-base"
                        fullWidth
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted">Cargando plantillas...</div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="p-8 text-center text-muted">
                            {search ? 'No se encontraron plantillas' : 'No tienes plantillas configuradas'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => onSelect(template)}
                                    className="w-full text-left p-2 rounded-lg hover:bg-hover group transition-colors flex flex-col gap-1"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-primary group-hover:text-accent truncate">
                                            {template.name}
                                        </span>
                                        {template.assets && template.assets.length > 0 && (
                                            <Badge variant="neutral" size="sm" className="flex items-center gap-1">
                                                <Paperclip size={10} />
                                                {template.assets.length}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-secondary line-clamp-1">
                                        {template.content.replace(/\n/g, ' ')}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-subtle bg-base/50 text-[10px] text-muted flex justify-between">
                    <span>{filteredTemplates.length} plantillas disponibles</span>
                    <span>Haz clic para enviar</span>
                </div>
            </div>
        </div>
    );
}
