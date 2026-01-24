import { Bot, X, Zap } from 'lucide-react';
import { Button } from '../../ui';

interface RuntimeSelectorModalProps {
    onSelect: (runtime: 'local' | 'openai') => void;
    onClose: () => void;
}

/**
 * RuntimeSelectorModal - Modal para elegir entre asistente Local o OpenAI
 */
export function RuntimeSelectorModal({ onSelect, onClose }: RuntimeSelectorModalProps) {
    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-subtle rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-primary tracking-tight">Crear Asistente</h3>
                        <p className="text-secondary mt-1">Selecciona el entorno de ejecución para tu IA</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-hover rounded-full text-muted transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options */}
                <div className="px-8 pb-8 space-y-4">
                    <button
                        onClick={() => onSelect('local')}
                        className="w-full p-6 bg-active/40 border border-subtle rounded-xl hover:border-accent hover:bg-active transition-all group text-left relative overflow-hidden"
                    >
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                <Bot size={28} />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-primary text-lg leading-tight">Asistente FluxCore (Local)</div>
                                <div className="text-secondary text-sm mt-1 leading-relaxed">
                                    Ejecutado íntegramente en tu infraestructura. Máximo control, privacidad y personalización de proveedores.
                                </div>
                            </div>
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => onSelect('openai')}
                        className="w-full p-6 bg-elevated/20 border border-subtle rounded-xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 transition-all group text-left relative overflow-hidden"
                    >
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-lg bg-[#10a37f]/10 border border-[#10a37f]/20 flex items-center justify-center text-[#10a37f] group-hover:scale-110 transition-transform">
                                <Zap size={28} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 font-bold text-primary text-lg leading-tight">
                                    External OpenAI Agent
                                    <span className="text-[10px] bg-[#10a37f]/20 text-[#10a37f] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Oficial</span>
                                </div>
                                <div className="text-secondary text-sm mt-1 leading-relaxed">
                                    Sincronizado nativamente con la API de OpenAI. Acceso a Code Interpreter y File Search oficial.
                                </div>
                            </div>
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#10a37f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-muted/30 border-t border-subtle flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default RuntimeSelectorModal;
