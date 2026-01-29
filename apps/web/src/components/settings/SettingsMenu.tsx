/**
 * SettingsMenu - Menú de configuración para Sidebar
 * Solo muestra opciones, el contenido se abre en tabs del DynamicContainer
 */

import clsx from 'clsx';
import {
  UserIcon,
  BellIcon,
  ShieldIcon,
  PaletteIcon,
  BuildingIcon,
  CreditsIcon,
} from '../../lib/icon-library';
import { usePanelStore } from '../../store/panelStore';
import { useAuthStore } from '../../store/authStore';

interface SettingMenuItem {
  id: string;
  tabType: 'settings-profile' | 'settings-accounts' | 'settings-notifications' | 'settings-privacy' | 'settings-appearance';
  icon: React.ReactNode;
  label: string;
  description: string;
}

const settingItems: SettingMenuItem[] = [
  { 
    id: 'profile', 
    tabType: 'settings-profile',
    icon: <UserIcon size={20} />, 
    label: 'Perfil', 
    description: 'Gestiona tu información personal' 
  },
  { 
    id: 'accounts', 
    tabType: 'settings-accounts',
    icon: <BuildingIcon size={20} />, 
    label: 'Cuentas', 
    description: 'Gestiona tus cuentas y colaboradores' 
  },
  { 
    id: 'credits', 
    tabType: 'settings-accounts',
    icon: <CreditsIcon size={20} />, 
    label: 'Créditos', 
    description: 'Administra balances y asignaciones (dev)' 
  },
  { 
    id: 'notifications', 
    tabType: 'settings-notifications',
    icon: <BellIcon size={20} />, 
    label: 'Notificaciones', 
    description: 'Configura las alertas' 
  },
  { 
    id: 'privacy', 
    tabType: 'settings-privacy',
    icon: <ShieldIcon size={20} />, 
    label: 'Privacidad', 
    description: 'Controla quién puede verte' 
  },
  { 
    id: 'appearance', 
    tabType: 'settings-appearance',
    icon: <PaletteIcon size={20} />, 
    label: 'Apariencia', 
    description: 'Personaliza la interfaz' 
  },
];

export function SettingsMenu() {
  const { user } = useAuthStore();
  const { openTab, layout } = usePanelStore((state) => ({ openTab: state.openTab, layout: state.layout }));

  const hasCreditsAccess = Boolean(user?.systemAdminScopes?.['*'] || user?.systemAdminScopes?.credits);
  const visibleItems = hasCreditsAccess ? settingItems : settingItems.filter((item) => item.id !== 'credits');

  const settingsContainer = layout.containers.find((container) => container.type === 'settings');
  const activeSettingsSection = (() => {
    if (!settingsContainer) return null;
    const activeTab = settingsContainer.tabs.find((tab) => tab.id === settingsContainer.activeTabId);
    if (!activeTab || activeTab.type !== 'settings') return null;
    return typeof activeTab.context?.section === 'string' ? activeTab.context.section : null;
  })();

  const handleOpenSettingsTab = (item: SettingMenuItem) => {
    openTab('settings', {
      type: 'settings',
      title: item.label,
      closable: true,
      context: {
        section: item.id,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
            <span className="text-inverse font-bold text-lg">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="text-primary font-semibold">{user?.name || 'Usuario'}</div>
            <div className="text-sm text-secondary">{user?.email || 'email@example.com'}</div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto py-2" data-component-name="SettingsMenu">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleOpenSettingsTab(item)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors duration-150',
              activeSettingsSection === item.id
                ? 'bg-active text-primary'
                : 'text-secondary hover:bg-hover hover:text-primary',
            )}
          >
            <span
              className={clsx(
                activeSettingsSection === item.id ? 'text-accent' : 'text-muted',
                'flex-shrink-0',
              )}
            >
              {item.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-sm font-medium text-primary block truncate">{item.label}</span>
              <span className="text-xs text-muted block truncate">{item.description}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Version */}
      <div className="p-4 border-t border-subtle">
        <div className="text-center text-sm text-muted">
          FluxCore v0.2.0
        </div>
      </div>
    </div>
  );
}
