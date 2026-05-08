import { Input, DoubleConfirmationDeleteButton } from './index';
import { Trash2 } from 'lucide-react';

interface TimeIntervalRowProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  useSimpleDelete?: boolean; // Para pantallas pequeñas
}

export function TimeIntervalRow({
  start,
  end,
  onStartChange,
  onEndChange,
  onDelete,
  disabled = false,
  className = '',
  useSimpleDelete = false
}: TimeIntervalRowProps) {
  return (
    <div className={`flex items-center gap-2 py-1 rounded min-w-fit h-8 ${className}`}>
      <Input 
        type="time" 
        value={start} 
        onChange={(e) => onStartChange(e.target.value)}
        className="w-24 bg-surface border-subtle text-primary px-2 h-7 flex-shrink-0"
        disabled={disabled}
        placeholder="Apertura"
      />
      <span className="text-muted flex-shrink-0 leading-7">—</span>
      <Input 
        type="time" 
        value={end} 
        onChange={(e) => onEndChange(e.target.value)}
        className="w-24 bg-surface border-subtle text-primary px-2 h-7 flex-shrink-0"
        disabled={disabled}
        placeholder="Cierre"
      />
      <div className="ml-1 min-w-fit self-end h-6 flex items-center">
        {useSimpleDelete ? (
          <button
            onClick={onDelete}
            disabled={disabled}
            className="h-6 w-6 flex items-center justify-center rounded text-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar intervalo"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <DoubleConfirmationDeleteButton
            onConfirm={onDelete}
            className="h-6 w-6"
            size={16}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

export type { TimeIntervalRowProps };
