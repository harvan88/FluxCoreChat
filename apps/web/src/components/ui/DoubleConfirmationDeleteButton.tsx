import { useState, useRef, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';
import clsx from 'clsx';

interface DoubleConfirmationDeleteButtonProps {
    onConfirm: () => void;
    className?: string;
    size?: number;
    disabled?: boolean;
}

export function DoubleConfirmationDeleteButton({
    onConfirm,
    className,
    size = 16,
    disabled
}: DoubleConfirmationDeleteButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state if click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsConfirming(false);
            }
        };

        if (isConfirming) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isConfirming]);

    return (
        <div
            ref={containerRef}
            className={clsx("relative flex items-center h-8 transition-all duration-200 ease-out", className)}
            style={{ width: isConfirming ? '72px' : '32px' }}
        >
            {/* Confirm Button (Check) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                    setIsConfirming(false);
                }}
                className={clsx(
                    "absolute left-0 p-1.5 rounded transition-all duration-200",
                    isConfirming
                        ? "opacity-100 scale-100 text-success hover:bg-success/10 pointer-events-auto"
                        : "opacity-0 scale-75 pointer-events-none"
                )}
                title="Confirmar eliminación"
            >
                <Check size={size} />
            </button>

            {/* Primary button toggles confirm/cancel */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirming((prev) => !prev);
                }}
                disabled={disabled}
                className={clsx(
                    "absolute right-0 p-1.5 rounded transition-all duration-200 ease-out",
                    !isConfirming
                        ? "opacity-100 scale-100 text-muted hover:text-error hover:bg-error/10 pointer-events-auto"
                        : "opacity-100 scale-100 text-muted hover:text-primary hover:bg-hover pointer-events-auto"
                )}
                title={isConfirming ? "Cancelar" : "Eliminar"}
            >
                <Trash2 size={size} />
            </button>
        </div>
    );
}
