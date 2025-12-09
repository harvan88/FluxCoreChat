/**
 * ActivityBar - Barra lateral de iconos tipo VS Code
 * TOTEM: Especificación Canónica de Comportamiento de Interfaz
 * 
 * Estados:
 * - Colapsada (panel-left-close): Solo íconos
 * - Expandida (panel-left-open): Íconos + texto
 */

import { MessageSquare, Users, Settings, LogOut, Puzzle, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

import type { ActivityType } from '../../types';

interface ActivityItem {
  id: ActivityType;
  icon: React.ReactNode;
  label: string;
}

const activities: ActivityItem[] = [
  { id: 'conversations', icon: <MessageSquare size={22} />, label: 'Mensajes' },
  { id: 'contacts', icon: <Users size={22} />, label: 'Contactos' },
  { id: 'extensions', icon: <Puzzle size={22} />, label: 'Extensiones' },
  { id: 'settings', icon: <Settings size={22} />, label: 'Configuración' },
];

export function ActivityBar() {
  const { 
    activeActivity, 
    setActiveActivity,
    activityBarExpanded,
    toggleActivityBar,
  } = useUIStore();
  const { logout } = useAuthStore();

  return (
    <div 
      className={clsx(
        'bg-surface flex flex-col py-3 border-r border-subtle transition-all duration-300 ease-in-out',
        activityBarExpanded ? 'w-52' : 'w-14'
      )}
    >
      {/* Header: Logo + Toggle */}
      <div className={clsx(
        'flex items-center gap-3 mb-6 px-3',
        activityBarExpanded ? 'justify-between' : 'justify-center'
      )}>
        {/* Logo */}
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-inverse font-bold text-lg">F</span>
        </div>
        
        {/* Brand name - solo visible cuando expandido */}
        {activityBarExpanded && (
          <span className="text-primary font-semibold text-sm flex-1 truncate">
            FluxCore
          </span>
        )}
        
        {/* Toggle button */}
        <button
          onClick={toggleActivityBar}
          className={clsx(
            'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
            'text-secondary hover:text-primary hover:bg-hover'
          )}
          title={activityBarExpanded ? 'Colapsar barra' : 'Expandir barra'}
        >
          {activityBarExpanded ? (
            <PanelLeftClose size={18} />
          ) : (
            <PanelLeftOpen size={18} />
          )}
        </button>
      </div>

      {/* Activities */}
      <div className="flex-1 space-y-1 px-2">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => setActiveActivity(activity.id)}
            className={clsx(
              'w-full flex items-center gap-3 rounded-lg transition-all duration-200',
              activityBarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
              activeActivity === activity.id
                ? 'bg-active text-primary'
                : 'text-secondary hover:text-primary hover:bg-hover'
            )}
            title={!activityBarExpanded ? activity.label : undefined}
          >
            <span className="flex-shrink-0">{activity.icon}</span>
            {activityBarExpanded && (
              <span className="text-sm font-medium truncate">
                {activity.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="space-y-1 px-2 pt-2 border-t border-subtle mt-2">
        <button
          onClick={logout}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg transition-all duration-200',
            activityBarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
            'text-secondary hover:text-error hover:bg-hover'
          )}
          title={!activityBarExpanded ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={22} className="flex-shrink-0" />
          {activityBarExpanded && (
            <span className="text-sm font-medium truncate">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
