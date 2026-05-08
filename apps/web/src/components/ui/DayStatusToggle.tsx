import { ReactNode } from 'react';
import { Checkbox } from './Checkbox';

interface DayStatusToggleProps {
  title: ReactNode;
  isClosed: boolean;
  onChange: (isClosed: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DayStatusToggle({
  title,
  isClosed,
  onChange,
  disabled = false,
  className = '',
  id
}: DayStatusToggleProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-col gap-1">
        {typeof title === 'string' ? (
          <span className="text-sm font-semibold text-primary">{title}</span>
        ) : (
          <div className="space-y-2">{title}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary">Cerrado</span>
        <Checkbox
          id={id || `closed-${Math.random()}`}
          checked={isClosed}
          onChange={() => onChange(!isClosed)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
