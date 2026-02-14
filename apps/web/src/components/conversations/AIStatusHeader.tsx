
import clsx from 'clsx';
import { useAutomation, type AutomationMode } from '../../hooks/useAutomation';
import { useExtensions } from '../../hooks/useExtensions';

export function AIStatusHeader({ accountId }: { accountId: string }) {
    const { installations } = useExtensions(accountId);

    // Feature Flag por extensión
    const isFluxCoreEnabled = installations.some(
        (i) => i.extensionId === '@fluxcore/asistentes' && i.enabled
    );

    const {
        globalRule,
        setRule,
        isLoading: isAutomationLoading,
    } = useAutomation(accountId);

    if (!isFluxCoreEnabled) return null;

    const globalAIMode: AutomationMode = (globalRule?.mode as AutomationMode) || 'disabled';

    return (
        <div className="px-3 pb-3">
            <div className="bg-elevated border border-subtle rounded-lg p-3">
                <div className="text-xs text-secondary">Respuesta IA</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => void setRule('automatic')}
                        disabled={isAutomationLoading}
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs border transition-colors',
                            globalAIMode === 'automatic'
                                ? 'bg-active border-strong text-primary'
                                : 'bg-surface border-subtle text-secondary hover:bg-hover hover:text-primary'
                        )}
                    >
                        Automático
                    </button>
                    <button
                        type="button"
                        onClick={() => void setRule('supervised')}
                        disabled
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs border transition-colors opacity-50 cursor-not-allowed',
                            globalAIMode === 'supervised'
                                ? 'bg-active border-strong text-primary'
                                : 'bg-surface border-subtle text-secondary'
                        )}
                        title="Solo Premium"
                    >
                        Supervisado
                    </button>
                    <button
                        type="button"
                        onClick={() => void setRule('disabled')}
                        disabled={isAutomationLoading}
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs border transition-colors',
                            globalAIMode === 'disabled'
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
