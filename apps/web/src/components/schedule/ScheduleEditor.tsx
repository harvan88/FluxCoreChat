import { useState, useEffect } from 'react';
import { 
  Trash2, 
  Plus
} from 'lucide-react';
import { Button, Input, ScheduleRowManager, RadioGroup } from '../ui';
import { useSchedules } from '../../hooks/useSchedules';
import { useLocations } from '../../hooks/useLocations';

interface WeeklyEditorProps {
  ownerId: string;
  initialStatus: string;
  timezone?: string | null;
  onSave: (status?: string) => void;
  onCancel: () => void;
}

export function WeeklyEditor({ ownerId, initialStatus, onSave, onCancel }: WeeklyEditorProps) {
  const { schedule, updateWeeklyStatus, updateIntervals } = useSchedules('location', ownerId);
  const { updateLocation } = useLocations();
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const [status, setStatus] = useState(initialStatus);
  const [drafts, setDrafts] = useState<any[]>([]);

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    if (schedule && !initialized) {
      const weekly = DAYS.map((name, index) => {
        const dayStatus = schedule.weekly.find(d => d.dayOfWeek === index);
        const dayIntervals = schedule.intervals.filter(i => i.dayOfWeek === index) || [];
        return {
          index,
          name,
          isClosed: dayStatus?.isClosed ?? false,
          intervals: dayIntervals.sort((a, b) => a.openTime.localeCompare(b.openTime))
        };
      });
      setDrafts(weekly);
      
      if (initialStatus === 'active' && schedule.intervals.length === 0) {
        setStatus('active_no_hours');
      }
      setInitialized(true);
    }
  }, [schedule, initialized, initialStatus]);

  const statusOptions = [
    { value: 'active', label: 'Abierto, con horarios de atención' },
    { value: 'active_no_hours', label: 'Abierto, sin horarios de atención' },
    { value: 'temp_closed', label: 'Cerrado temporalmente' },
    { value: 'perm_closed', label: 'Cerrado permanentemente' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    const dbStatus = status === 'active_no_hours' ? 'active' : status;
    await updateLocation(ownerId, { status: dbStatus });

    if (status === 'active') {
      await updateWeeklyStatus(drafts.map(d => ({ dayOfWeek: d.index, isClosed: d.isClosed })));
      for (const day of drafts) {
        const clean = day.intervals.map((i: any) => ({
          openTime: i.openTime || i.start || '09:00',
          closeTime: i.closeTime || i.end || '18:00'
        }));
        await updateIntervals(day.index, clean);
      }
    }
    setIsSaving(false);
    onSave(dbStatus);
  };

  return (
    <div className="space-y-6">
      <RadioGroup
        name={`status-${ownerId}`}
        options={statusOptions}
        value={status}
        onChange={setStatus}
      />

      {status === 'active' && drafts.length > 0 && (
        <div className="space-y-4">
          {drafts.map((day) => (
            <ScheduleRowManager
              key={day.index}
              id={`weekly-${day.index}`}
              title={day.name}
              isClosed={day.isClosed}
              onToggleClosed={(val) => setDrafts(prev => prev.map(d => d.index === day.index ? { ...d, isClosed: val } : d))}
              intervals={day.intervals.map((i: any) => ({ start: i.openTime.substring(0, 5), end: i.closeTime.substring(0, 5) }))}
              onAddInterval={() => setDrafts(prev => prev.map(d => d.index === day.index ? { ...d, intervals: [...d.intervals, { openTime: '09:00', closeTime: '18:00' }] } : d))}
              onUpdateInterval={(idx, interval) => {
                setDrafts(prev => prev.map(d => {
                  if (d.index !== day.index) return d;
                  const newInts = d.intervals.map((i: any, iIdx: number) => iIdx === idx ? { openTime: interval.start, closeTime: interval.end } : i);
                  return { ...d, intervals: newInts };
                }));
              }}
              onDeleteInterval={(idx) => {
                setDrafts(prev => prev.map(d => {
                  if (d.index !== day.index) return d;
                  const newInts = d.intervals.filter((_: any, iIdx: number) => iIdx !== idx);
                  return { ...d, intervals: newInts };
                }));
              }}
            />
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={status === 'active' ? !drafts.every(d => d.isClosed || d.intervals.length > 0) : false}>Guardar</Button>
      </div>
    </div>
  );
}

interface SpecialEditorProps {
  ownerId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function SpecialEditor({ ownerId, onSave, onCancel }: SpecialEditorProps) {
  const { schedule, upsertSpecial, deleteSpecial } = useSchedules('location', ownerId);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (schedule && !initialized) {
      setDrafts(schedule.special || []);
      setInitialized(true);
    }
  }, [schedule, initialized]);

  const handleAddRow = () => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setDrafts(p => [...p, { 
      id: tempId, 
      label: 'Nuevo evento', 
      date: new Date().toISOString().split('T')[0], 
      isClosed: false, 
      intervals: [{ openTime: '09:00', closeTime: '18:00' }] // Intervalo por defecto
    }]);
  };

  // Validación: Cada fila debe estar cerrada o tener al menos un intervalo
  const isValid = drafts.every(d => d.isClosed || d.intervals.length > 0);

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    let allOk = true;
    for (const draft of drafts) {
      const payload: any = {
        date: draft.date?.split('T')[0],
        label: draft.label,
        isClosed: draft.isClosed,
        intervals: draft.intervals.map((i: any) => ({
          openTime: i.openTime || i.start || '09:00',
          closeTime: i.closeTime || i.end || '18:00'
        }))
      };
      
      if (draft.id && !draft.id.toString().startsWith('temp-')) {
        payload.id = draft.id;
      }
      
      const res = await upsertSpecial(payload);
      if (!res) allOk = false;
    }
    setIsSaving(false);
    if (allOk) onSave();
  };

  return (
    <div className="space-y-8">
      {/* Lista de fechas especiales */}
      <div className="space-y-8">
        {drafts.map((item) => (
          <div key={item.id} className="group relative pb-4 border-b border-subtle last:border-0 last:pb-0">
            <ScheduleRowManager
              id={item.id.toString()}
              title={(
                <div className="flex items-center gap-2 flex-1">
                  <Input 
                    placeholder="Nombre del evento"
                    value={item.label} 
                    onChange={e => setDrafts(prev => prev.map(d => d.id === item.id ? { ...d, label: e.target.value } : d))} 
                    className="flex-1"
                  />
                  <Input 
                    type="date" 
                    value={item.date?.split('T')[0]} 
                    onChange={e => setDrafts(prev => prev.map(d => d.id === item.id ? { ...d, date: e.target.value } : d))} 
                    className="flex-1"
                  />
                </div>
              )}
              isClosed={item.isClosed}
              onToggleClosed={val => setDrafts(prev => prev.map(d => d.id === item.id ? { ...d, isClosed: val } : d))}
              intervals={item.intervals.map((i: any) => ({ start: i.openTime?.substring(0, 5), end: i.closeTime?.substring(0, 5) }))}
              onAddInterval={() => setDrafts(prev => prev.map(d => d.id === item.id ? { ...d, intervals: [...d.intervals, { openTime: '09:00', closeTime: '18:00' }] } : d))}
              onUpdateInterval={(idx, interval) => setDrafts(prev => prev.map(d => {
                if (d.id !== item.id) return d;
                const newInts = d.intervals.map((i: any, iIdx: number) => iIdx === idx ? { openTime: interval.start, closeTime: interval.end } : i);
                return { ...d, intervals: newInts };
              }))}
              onDeleteInterval={(idx) => setDrafts(prev => prev.map(d => {
                if (d.id !== item.id) return d;
                const newInts = d.intervals.filter((_: any, iIdx: number) => iIdx !== idx);
                return { ...d, intervals: newInts };
              }))}
            />
            <Button variant="ghost" size="sm" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100" onClick={async () => {
              if (item.id && !item.id.toString().startsWith('temp-')) await deleteSpecial(item.id);
              setDrafts(prev => prev.filter(d => d.id !== item.id));
            }}>
              <Trash2 size={18} />
            </Button>
          </div>
        ))}

        {(!drafts || drafts.length === 0) && (
          <div className="p-8 text-center text-muted text-sm italic border border-dashed border-subtle rounded">
            No hay fechas especiales configuradas.
          </div>
        )}
      </div>

      {/* Botón de añadir (DEBAJO de la lista) */}
      <div className="pt-2">
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleAddRow}
        >
          <Plus size={16} className="mr-2" />
          Nueva fecha especial
        </Button>
      </div>

      {/* Botones de acción final */}
      <div className="flex justify-end gap-3 pt-6 border-t border-subtle">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!isValid}>Guardar</Button>
      </div>
    </div>
  );
}
