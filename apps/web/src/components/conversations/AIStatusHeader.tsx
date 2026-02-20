
import clsx from 'clsx';
import { useAssistantMode } from '../../hooks/fluxcore/useAssistantMode';
import { useExtensions } from '../../hooks/useExtensions';

export function AIStatusHeader({ accountId }: { accountId: string }) {
    const { installations } = useExtensions(accountId);

    const isFluxCoreEnabled = installations.some(
        (i) => i.extensionId === '@fluxcore/asistentes' && i.enabled
    );

    const { mode, setMode, isLoading } = useAssistantMode(accountId);

    if (!isFluxCoreEnabled) return null;

    return (
        <div className="px-3 pb-3">
            <div className="bg-elevated border border-subtle rounded-lg p-3">
                <div className="text-xs text-secondary">Respuesta IA</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => void setMode('auto')}
                        disabled={isLoading}
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs border transition-colors',
                            mode === 'auto'
                                ? 'bg-active border-strong text-primary'
                                : 'bg-surface border-subtle text-secondary hover:bg-hover hover:text-primary'
                        )}
                    >
                        Automático
                    </button>
                    <button
                        type="button"
                        onClick={() => void setMode('suggest')}
                        disabled={isLoading}
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs border transition-colors',
                            mode === 'suggest'
                                ? 'bg-active border-strong text-primary'
                                : 'bg-surface border-subtle text-secondary hover:bg-hover hover:text-primary'
                        )}
                    >
                        Supervisado
                    </button>
                    <button
                        type="button"
                        onClick={() => void setMode('off')}
                        disabled={isLoading}
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs border transition-colors',
                            mode === 'off'
                                ? 'bg-active border-strong text-primary'
                                : 'bg-surface border-subtle text-secondary hover:bg-hover hover:text-primary'
                        )}
                    >
                        Apagado
                    </button>
                </div>
            </div>
        </div>
    );
}
