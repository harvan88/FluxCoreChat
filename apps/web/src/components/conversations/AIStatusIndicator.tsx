
import clsx from 'clsx';
import { Bot, BotMessageSquare, BotOff } from 'lucide-react';
import type { AssistantMode } from '../../hooks/fluxcore/useAssistantMode';

// Icons mapping
const getAIModePresentation = (mode: AssistantMode) => {
    if (mode === 'auto') {
        return { Icon: Bot, colorClassName: 'text-success', label: 'Automático' };
    }
    if (mode === 'suggest') {
        return { Icon: BotMessageSquare, colorClassName: 'text-warning', label: 'Supervisado' };
    }
    return { Icon: BotOff, colorClassName: 'text-muted', label: 'Apagado' };
};

interface AIStatusIndicatorProps {
    mode: AssistantMode;
    isFluxCoreEnabled: boolean;
    isLoading?: boolean;
    onToggle: (e: React.MouseEvent) => void;
}

export function AIStatusIndicator({
    mode,
    isFluxCoreEnabled,
    isLoading,
    onToggle
}: AIStatusIndicatorProps) {

    if (!isFluxCoreEnabled) return null;

    const { Icon: AIIcon, colorClassName: aiColorClassName, label: aiLabel } = getAIModePresentation(mode);

    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={isLoading}
            className={clsx(
                'mt-1 inline-flex items-center gap-1 text-xs transition-colors',
                'hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Cambiar modo de IA para este chat"
        >
            <AIIcon size={14} className={aiColorClassName} />
            <span className={clsx('text-xs', aiColorClassName)}>{`IA: ${aiLabel}`}</span>
        </button>
    );
}
