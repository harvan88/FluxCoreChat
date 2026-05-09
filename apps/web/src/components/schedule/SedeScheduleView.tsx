import { useState, useMemo } from 'react';
import { WeeklySummary, SpecialSummary } from './ScheduleSummary';
import { WeeklyEditor, SpecialEditor } from './ScheduleEditor';
import { useSchedules } from '../../hooks/useSchedules';
import { useUIStore } from '../../store/uiStore';
import { ViewHeader } from '../ui';
import { Clock } from 'lucide-react';

interface SedeScheduleViewProps {
  location: any;
}

export function SedeScheduleView({ location }: SedeScheduleViewProps) {
  const { selectedAccountId, accounts } = useUIStore();
  const { schedule, loadSchedule } = useSchedules('location', location.id);
  const [isEditingWeekly, setIsEditingWeekly] = useState(false);
  const [isEditingSpecial, setIsEditingSpecial] = useState(false);
  const [localStatus, setLocalStatus] = useState(location.status);

  const currentAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId), 
    [accounts, selectedAccountId]
  );

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <ViewHeader 
        icon={Clock}
        title={location.name}
        subtitle={location.address}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* BLOQUE 1: Horario de atención */}
          <div className="space-y-4">
            {isEditingWeekly ? (
              <WeeklyEditor 
                ownerId={location.id} 
                initialStatus={localStatus}
                timezone={currentAccount?.timezone}
                onSave={(newStatus: any) => { 
                  if (newStatus) setLocalStatus(newStatus);
                  setIsEditingWeekly(false); 
                  loadSchedule(); 
                }}
                onCancel={() => setIsEditingWeekly(false)}
              />
            ) : (
              <WeeklySummary 
                status={localStatus} 
                schedule={schedule} 
                onEdit={() => setIsEditingWeekly(true)} 
              />
            )}
          </div>

          {/* BLOQUE 2: Fechas especiales */}
          <div className="space-y-4">
            {isEditingSpecial ? (
              <SpecialEditor 
                ownerId={location.id} 
                onSave={() => { setIsEditingSpecial(false); loadSchedule(); }}
                onCancel={() => setIsEditingSpecial(false)}
              />
            ) : (
              <SpecialSummary 
                schedule={schedule} 
                onEdit={() => setIsEditingSpecial(true)} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
