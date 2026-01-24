import { Bot } from 'lucide-react';

interface RuntimeSelectorModalProps {
    onSelect: (runtime: 'local' | 'openai') => void;
    onClose: () => void;
}

/**
 * RuntimeSelectorModal - Restaurada estética original exacta
 */
export function RuntimeSelectorModal({ onSelect, onClose }: RuntimeSelectorModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-surface border border-subtle rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-primary mb-4">Selecciona el tipo de asistente</h3>
                <div className="space-y-3">
                    <button
                        onClick={() => onSelect('local')}
                        className="w-full p-4 bg-hover border border-subtle rounded-lg hover:bg-active transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <Bot size={24} className="text-accent" />
                            <div>
                                <div className="font-medium text-primary">Asistente Local</div>
                                <div className="text-sm text-secondary">Ejecutado en tu infraestructura FluxCore</div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => onSelect('openai')}
                        className="w-full p-4 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <Bot size={24} className="text-accent" />
                            <div>
                                <div className="font-medium text-primary">Asistente OpenAI</div>
                                <div className="text-sm text-secondary">Sincronizado con la plataforma OpenAI</div>
                            </div>
                        </div>
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="mt-4 w-full px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}

export default RuntimeSelectorModal;
