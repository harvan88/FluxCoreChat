import { useState, useMemo } from 'react';
import { 
  Building2, 
  Clock,
  Info,
  MapPin,
  Star
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLocations } from '../../hooks/useLocations';
import type { LocationData as Location } from '../../hooks/useLocations';
import { Button } from '../ui';
import { CollectionView, type CollectionColumn } from '../fluxcore/shared/CollectionView';
import { SedeScheduleView } from '../schedule/SedeScheduleView';

interface ScheduleSectionProps {
  onBack: () => void;
  onOpenTab?: (id: string, title: string, data: any) => void;
  locationId?: string;
}

export function ScheduleSection({ onBack, onOpenTab, locationId }: ScheduleSectionProps) {
  const { selectedAccountId, accounts } = useUIStore();
  const { locations, isLoading: loadingLocations } = useLocations();

  const currentAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId), 
    [accounts, selectedAccountId]
  );

  const selectedLocation = useMemo(() => 
    locations.find(l => l.id === locationId),
    [locations, locationId]
  );

  const columns: CollectionColumn<Location>[] = [
    {
      id: 'name',
      header: 'Sede',
      accessor: (location) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${location.isDefault ? 'bg-accent/10 text-accent' : 'bg-hover text-muted'}`}>
            {location.isDefault ? <Star size={12} fill="currentColor" /> : <Building2 size={12} />}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-primary">{location.name}</div>
            <div className="text-xs text-muted truncate">{location.address}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      accessor: (location) => (
        <span className={location.status === 'active' ? 'text-green-500 font-medium text-xs' : 'text-muted italic text-xs'}>
          {location.status === 'active' ? 'Abierto' : 'Cerrado temporalmente'}
        </span>
      )
    }
  ];

  const handleSelect = (location: Location) => {
    if (onOpenTab) {
      onOpenTab(location.id, `Horarios: ${location.name}`, { 
        type: 'schedule', 
        locationId: location.id 
      });
    }
  };

  // MODO DETALLE (Pestaña específica de una sede)
  if (locationId && selectedLocation) {
    return (
      <SedeScheduleView 
        location={selectedLocation} 
        onBack={onBack} 
      />
    );
  }

  // MODO LISTA (Vista general de horarios)
  return (
    <div className="h-full flex flex-col bg-background">
      <CollectionView<Location>
        icon={Clock}
        title="Horarios de atención"
        createLabel={locations.length === 0 ? "Ir a Ubicaciones" : undefined}
        onCreate={locations.length === 0 ? onBack : undefined}
        data={locations}
        getRowKey={(l) => l.id}
        columns={columns}
        loading={loadingLocations}
        onRowClick={handleSelect}
        emptyDescription="Debes crear al menos una sede en la sección de ubicaciones antes de configurar horarios."
        createVariant="secondary"
      />

      {/* Account Info Banner (SSOT Check) - Sticky at bottom */}
      {!currentAccount?.timezone && (
        <div className="px-6 py-4 bg-background border-t border-subtle">
            <div className="bg-warning-muted border border-warning-muted p-4 rounded-lg flex gap-4">
            <Info className="text-warning flex-shrink-0 icon-lg" />
            <div>
                <h4 className="text-warning font-semibold text-sm">Configuración de cuenta pendiente</h4>
                <p className="text-xs text-warning/80 mt-1 leading-relaxed">
                La zona horaria y el país deben estar configurados en los ajustes generales de la cuenta para que el sistema de horarios funcione correctamente.
                </p>
            </div>
            </div>
        </div>
      )}
    </div>
  );
}
