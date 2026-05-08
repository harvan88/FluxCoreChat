import { Button } from './Button';
import { Plus } from 'lucide-react';
import { TimeIntervalRow } from './TimeIntervalRow';

export interface TimeInterval {
  start: string;
  end: string;
}

interface TimeIntervalManagerProps {
  intervals: TimeInterval[];
  onAddInterval: () => void;
  onUpdateInterval: (index: number, interval: TimeInterval) => void;
  onDeleteInterval: (index: number) => void;
  disabled?: boolean;
  className?: string;
  useSimpleDelete?: boolean; // Para pantallas pequeñas
}

export function TimeIntervalManager({
  intervals,
  onAddInterval,
  onUpdateInterval,
  onDeleteInterval,
  disabled = false,
  className = '',
  useSimpleDelete = false
}: TimeIntervalManagerProps) {
  
  const handleStartChange = (index: number, value: string) => {
    onUpdateInterval(index, { ...intervals[index], start: value });
  };

  const handleEndChange = (index: number, value: string) => {
    onUpdateInterval(index, { ...intervals[index], end: value });
  };

  const handleAddInterval = () => {
    // El padre manejará la creación del nuevo intervalo
    onAddInterval();
  };

  if (disabled) {
    return (
      <div className="text-xs text-muted italic">
        Sin atención
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 w-fit ${className}`}>
      {intervals.map((interval, index) => (
        <TimeIntervalRow
          key={index}
          start={interval.start}
          end={interval.end}
          onStartChange={(value) => handleStartChange(index, value)}
          onEndChange={(value) => handleEndChange(index, value)}
          onDelete={() => onDeleteInterval(index)}
          disabled={disabled}
          useSimpleDelete={useSimpleDelete}
        />
      ))}
      <div className="flex justify-end">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleAddInterval} 
          className="text-accent h-6 w-6"
          disabled={disabled}
          title="Añadir nuevo intervalo"
        >
          <Plus size={18} />
        </Button>
      </div>
    </div>
  );
}

export type { TimeIntervalManagerProps, TimeInterval };
