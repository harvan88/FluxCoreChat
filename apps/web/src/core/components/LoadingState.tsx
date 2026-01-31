/**
 * LoadingState - Componente visual para estados de carga
 * 
 * PRINCIPIO: Componente puramente visual, sin semántica del sistema.
 */

export interface LoadingStateProps {
  /** Mensaje opcional de carga */
  message?: string;
  /** Tamaño del spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Clases CSS adicionales */
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function LoadingState({
  message,
  size = 'md',
  className = '',
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-full ${className}`}>
      <div
        className={`
          animate-spin rounded-full border-accent-primary border-t-transparent
          ${sizeClasses[size]}
        `}
      />
      {message && (
        <p className="text-sm text-muted mt-3">{message}</p>
      )}
    </div>
  );
}
