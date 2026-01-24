import { ReactNode } from 'react';
import { Button } from '../../ui';

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

/**
 * EmptyState - Estado vacío reutilizable
 * 
 * Usado cuando no hay datos en las listas de FluxCore.
 */
export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center h-full text-center p-6 ${className}`}>
            <div className="text-muted mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-medium text-primary mb-2">
                {title}
            </h3>
            <p className="text-secondary mb-6 max-w-sm">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

export default EmptyState;
