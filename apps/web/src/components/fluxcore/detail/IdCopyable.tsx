import { Copy, Check } from 'lucide-react';
import { useClipboard } from '../../../hooks/fluxcore';

interface IdCopyableProps {
    id: string;
    prefix?: string;
    className?: string;
}

/**
 * IdCopyable - ID con funcionalidad click-to-copy
 */
export function IdCopyable({ id, prefix = 'Id: ', className = '' }: IdCopyableProps) {
    const { copy, isCopied } = useClipboard();

    return (
        <div
            className={`text-xs text-muted cursor-pointer hover:text-accent flex items-center gap-1 group w-fit ${className}`}
            onClick={() => copy(id)}
            title="Click para copiar ID"
        >
            <span>{prefix}{id}</span>
            <span className={`transition-opacity ${isCopied ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-100'}`}>
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
            </span>
        </div>
    );
}

export default IdCopyable;
