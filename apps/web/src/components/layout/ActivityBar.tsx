/**
 * ActivityBar - Barra lateral de iconos tipo VS Code
 * TOTEM: Especificación Canónica de Comportamiento de Interfaz
 * 
 * Estados:
 * - Colapsada (panel-left-close): Solo íconos
 * - Expandida (panel-left-open): Íconos + texto
 * 
 * Extensiones con UI:
 * - Se muestran dinámicamente basadas en manifest.ui.sidebar
 * - Solo extensiones instaladas y habilitadas con permisos
 */

import { MessageSquare, Users, Settings, LogOut, Puzzle, PanelLeftOpen, PanelLeftClose, Globe, Calendar, ShoppingCart, FileText, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useAccountStore } from '../../store/accountStore';
import { useExtensions } from '../../hooks/useExtensions';
import { AccountSwitcher } from '../accounts';

import type { ActivityType } from '../../types';

interface ActivityItem {
  id: ActivityType;
  icon: React.ReactNode;
  label: string;
}

// Actividades base del sistema
const baseActivities: ActivityItem[] = [
  { id: 'conversations', icon: <MessageSquare size={22} />, label: 'Mensajes' },
  { id: 'contacts', icon: <Users size={22} />, label: 'Contactos' },
  { id: 'extensions', icon: <Puzzle size={22} />, label: 'Extensiones' },
  { id: 'settings', icon: <Settings size={22} />, label: 'Configuración' },
];

// Mapeo de nombres de iconos a componentes Lucide
const iconMap: Record<string, React.ReactNode> = {
  globe: <Globe size={22} />,
  calendar: <Calendar size={22} />,
  'shopping-cart': <ShoppingCart size={22} />,
  'file-text': <FileText size={22} />,
  zap: <Zap size={22} />,
  puzzle: <Puzzle size={22} />,
};

export function ActivityBar() {
  const { 
    activeActivity, 
    setActiveActivity,
    activityBarExpanded,
    toggleActivityBar,
    selectedAccountId: uiSelectedAccountId,
  } = useUIStore();
  const { logout } = useAuthStore();
  const { activeAccount } = useAccountStore();
  
  // VER-002: Usar selectedAccountId de uiStore (sincronizado por AccountSwitcher)
  const selectedAccountId = uiSelectedAccountId || activeAccount?.id || null;
  const { installations } = useExtensions(selectedAccountId);
  
  // VER-004: Debug logs para verificar carga de extensiones
  console.log('[ActivityBar] selectedAccountId:', selectedAccountId);
  console.log('[ActivityBar] installations:', installations);

  // Generar actividades dinámicas de extensiones con UI
  const extensionActivities: ActivityItem[] = installations
    .filter(inst => inst.enabled && inst.manifest?.ui?.sidebar)
    .map(inst => ({
      id: `ext:${inst.extensionId}` as ActivityType,
      icon: iconMap[inst.manifest?.ui?.sidebar?.icon || 'puzzle'] || <Puzzle size={22} />,
      label: inst.manifest?.ui?.sidebar?.title || inst.manifest?.name || 'Extension',
    }));
  
  // VER-004: Log extensiones con UI
  console.log('[ActivityBar] extensionActivities:', extensionActivities);

  // Combinar actividades base con extensiones (extensiones después de contacts, antes de extensions)
  const activities: ActivityItem[] = [
    ...baseActivities.slice(0, 2), // conversations, contacts
    ...extensionActivities,        // extensiones con UI
    ...baseActivities.slice(2),    // extensions, settings
  ];

  return (
    <div 
      className={clsx(
        'bg-surface flex flex-col py-3 border-r border-subtle transition-all duration-300 ease-in-out',
        activityBarExpanded ? 'w-52' : 'w-14'
      )}
    >
      {/* Header: AccountSwitcher + Toggle */}
      <div
        className={clsx(
          'mb-4 px-3',
          activityBarExpanded
            ? 'flex items-center gap-2 justify-between'
            : 'flex flex-col items-center gap-2'
        )}
      >
        <div className={clsx(activityBarExpanded ? 'flex-1 min-w-0' : '')}>
          <AccountSwitcher compact={!activityBarExpanded} />
        </div>
        
        {/* Toggle button */}
        <button
          onClick={toggleActivityBar}
          className={clsx(
            'w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0',
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
