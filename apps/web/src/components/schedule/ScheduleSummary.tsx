import { useMemo } from 'react';
import { Pencil, Calendar, Clock } from 'lucide-react';
import { Button } from '../ui';
import type { ScheduleData } from '../../hooks/useSchedules';

interface WeeklySummaryProps {
  status: string;
  schedule: ScheduleData | null;
  onEdit: () => void;
}

export function WeeklySummary({ status, schedule, onEdit }: WeeklySummaryProps) {
  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  const statusLabel = useMemo(() => {
    switch (status) {
      case 'active':
        return schedule && schedule.intervals.length > 0 
          ? 'Abierto, con horarios de atención' 
          : 'Abierto, sin horarios de atención';
      case 'temp_closed':
        return 'Cerrado temporalmente';
      case 'perm_closed':
        return 'Cerrado permanentemente';
      default:
        return 'Estado desconocido';
    }
  }, [status, schedule]);

  const weeklyRows = useMemo(() => {
    if (!schedule) return [];
    return DAYS.map((name, index) => {
      const dayStatus = schedule.weekly.find(d => d.dayOfWeek === index);
      const dayIntervals = schedule.intervals.filter(i => i.dayOfWeek === index);
      const isClosed = dayStatus?.isClosed || dayIntervals.length === 0;
      return {
        name,
        isClosed,
        hours: isClosed ? 'Cerrada' : dayIntervals.sort((a,b) => a.openTime.localeCompare(b.openTime)).map(i => `${formatTime(i.openTime)} – ${formatTime(i.closeTime)}`).join(', ')
      };
    });
  }, [schedule]);

  const hasIntervals = useMemo(() => {
    return schedule && schedule.intervals.length > 0;
  }, [schedule]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-primary">
          Horario de atención
        </h3>
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted hover:text-accent">
          <Pencil size={16} />
        </Button>
      </div>

      {(status !== 'active' || !hasIntervals) ? (
        <div className="py-2">
          <p className="text-sm text-secondary font-medium">
            {statusLabel}
          </p>
          <p className="text-xs text-muted italic mt-0.5">
            {status === 'active' ? 'No se han definido horarios específicos' : 'Atención suspendida'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-w-sm">
          {weeklyRows.map(day => (
            <div key={day.name} className="flex justify-between items-center text-sm py-1 border-b border-divider/10 last:border-0">
              <span className="text-primary font-medium">{day.name}</span>
              <span className={day.isClosed ? 'text-muted/60 italic' : 'text-secondary'}>
                {day.hours}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SpecialSummaryProps {
  schedule: ScheduleData | null;
  onEdit: () => void;
}

export function SpecialSummary({ schedule, onEdit }: SpecialSummaryProps) {
  return (
    <div className="space-y-6 pt-6 border-t border-divider/10">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-primary">
          Fechas especiales
        </h3>
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted hover:text-accent">
          <Pencil size={16} />
        </Button>
      </div>

      {schedule?.special && schedule.special.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {schedule.special.map(item => (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-primary">{item.label || 'Evento'}</span>
                <span className="text-[11px] text-accent font-medium">
                  {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="text-xs text-muted italic">
                {item.isClosed ? 'Cerrado' : item.intervals.map(i => `${formatTime(i.openTime)} - ${formatTime(i.closeTime)}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted italic">
          No hay registros adicionales configurados.
        </p>
      )}
    </div>
  );
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  let h = parseInt(hours);
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}
