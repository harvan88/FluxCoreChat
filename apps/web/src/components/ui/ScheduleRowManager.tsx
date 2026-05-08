import { ReactNode } from 'react';
import { DayStatusToggle } from './DayStatusToggle';
import { TimeIntervalManager, type TimeInterval } from './TimeIntervalManager';
import { Checkbox } from './Checkbox';
import { Clock, Plus } from 'lucide-react';
import { Button } from './Button';
import clsx from 'clsx';

interface ScheduleRowManagerProps {
  title: ReactNode;
  isClosed: boolean;
  onToggleClosed: (isClosed: boolean) => void;
  intervals: TimeInterval[];
  onAddInterval: () => void;
  onUpdateInterval: (index: number, interval: TimeInterval) => void;
  onDeleteInterval: (index: number) => void;
  disabled?: boolean;
  closedMessage?: string;
  className?: string;
  id?: string;
}

export function ScheduleRowManager({
  title,
  isClosed,
  onToggleClosed,
  intervals,
  onAddInterval,
  onUpdateInterval,
  onDeleteInterval,
  disabled = false,
  closedMessage = 'Abierto, sin horarios de atención',
  className = '',
  id
}: ScheduleRowManagerProps) {
  return (
    <div className={clsx("grid grid-cols-[1fr_auto] gap-x-8 gap-y-2 py-4 border-b border-subtle last:border-0", className)}>
      {/* Fila 1: Título e Intervalos */}
      <div className="flex flex-col gap-1">
        <div className="h-9 flex items-center">
          {typeof title === 'string' ? (
            <span className="text-sm font-semibold text-primary">{title}</span>
          ) : (
            <div className="w-full">{title}</div>
          )}
        </div>
        
        <div className="flex items-center gap-3 h-9">
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              id={id || `closed-${Math.random()}`}
              checked={isClosed}
              onChange={() => onToggleClosed(!isClosed)}
              disabled={disabled}
            />
            <span className="text-xs font-medium text-secondary group-hover:text-primary transition-colors">
              Cerrado
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {!isClosed ? (
          <div className="flex flex-col gap-2 items-end">
            <TimeIntervalManager
              intervals={intervals}
              onAddInterval={onAddInterval}
              onUpdateInterval={onUpdateInterval}
              onDeleteInterval={onDeleteInterval}
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="h-18 flex flex-col justify-center items-end pr-1">
            <div className="flex items-center gap-2 text-xs text-muted italic bg-surface-elevated/50 px-3 py-2 rounded-lg border border-subtle">
              <Clock size={14} className="opacity-40" />
              {closedMessage}
            </div>
            {/* Si está cerrado pero el usuario quiere añadir un intervalo, el botón [+] le permite "abrirlo" */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                onToggleClosed(false);
                onAddInterval();
              }}
              className="mt-2 text-accent h-8 w-8 hover:bg-accent/10"
              title="Abrir y añadir horario"
            >
              <Plus size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
