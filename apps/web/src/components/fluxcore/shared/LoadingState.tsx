interface LoadingStateProps {
    message?: string;
    className?: string;
}

/**
 * LoadingState - Estado de carga reutilizable
 */
export function LoadingState({
    message = 'Cargando datos...',
    className = '',
}: LoadingStateProps) {
    return (
        <div className={`flex items-center justify-center h-full text-muted ${className}`}>
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>{message}</span>
            </div>
        </div>
    );
}

export default LoadingState;
