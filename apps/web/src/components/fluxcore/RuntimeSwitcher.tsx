import { useState } from 'react';
import { Bot, Zap, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAIStatus } from '../../hooks/fluxcore/useAIStatus';
import { emitAssistantUpdateEvent } from '../../hooks/fluxcore/events';

interface RuntimeSwitcherProps {
    accountId: string;
}

export function RuntimeSwitcher({ accountId }: RuntimeSwitcherProps) {
    const { status, refresh, isLoading: statusLoading } = useAIStatus({ accountId });
    const [isUpdating, setIsUpdating] = useState(false);

    const activeRuntime = status?.activeRuntimeId || '@fluxcore/asistentes';

    const handleSwitch = async (runtimeId: string) => {
        if (runtimeId === activeRuntime) return;

        setIsUpdating(true);
        try {
            const res = await api.updateAIRuntime(accountId, runtimeId);
            if (res.success) {
                // Emitir evento para que otros componentes (como el sidebar) se refresquen
                emitAssistantUpdateEvent({
                    accountId,
                    action: 'update',
                });
                await refresh();
            }
        } catch (err) {
            console.error('Failed to update runtime:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="px-4 py-3 border-b border-subtle">
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Motor de Inteligencia
                </label>

                <div className="grid grid-cols-2 gap-1 bg-elevated p-1 rounded-xl border border-subtle relative overflow-hidden">
                    {(statusLoading || isUpdating) && (
                        <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <Loader2 size={16} className="animate-spin text-accent" />
                        </div>
                    )}

                    <button
                        onClick={() => handleSwitch('@fluxcore/fluxi')}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all duration-200 ${activeRuntime === '@fluxcore/fluxi'
                            ? 'bg-surface shadow-sm ring-1 ring-accent/50 text-primary'
                            : 'text-muted hover:text-secondary hover:bg-hover'
                            }`}
                    >
                        <Zap size={18} className={activeRuntime === '@fluxcore/fluxi' ? 'text-accent' : ''} />
                        <span className="text-[10px] font-medium">Fluxi</span>
                    </button>

                    <button
                        onClick={() => handleSwitch('@fluxcore/asistentes')}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all duration-200 ${activeRuntime === '@fluxcore/asistentes'
                            ? 'bg-surface shadow-sm ring-1 ring-subtle text-primary'
                            : 'text-muted hover:text-secondary hover:bg-hover'
                            }`}
                    >
                        <Bot size={18} className={activeRuntime === '@fluxcore/asistentes' ? 'text-accent' : ''} />
                        <span className="text-[10px] font-medium">Asistentes</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
