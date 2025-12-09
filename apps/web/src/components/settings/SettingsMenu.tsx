/**
 * SettingsMenu - Menú de configuración para Sidebar
 * Solo muestra opciones, el contenido se abre en tabs del DynamicContainer
 */

import { User, Bell, Shield, Palette, Building2, ChevronRight } from 'lucide-react';
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
    icon: <User size={20} />, 
    label: 'Perfil', 
    description: 'Gestiona tu información personal' 
  },
  { 
    id: 'accounts', 
    tabType: 'settings-accounts',
    icon: <Building2 size={20} />, 
    label: 'Cuentas', 
    description: 'Gestiona tus cuentas y colaboradores' 
  },
  { 
    id: 'notifications', 
    tabType: 'settings-notifications',
    icon: <Bell size={20} />, 
    label: 'Notificaciones', 
    description: 'Configura las alertas' 
  },
  { 
    id: 'privacy', 
    tabType: 'settings-privacy',
    icon: <Shield size={20} />, 
    label: 'Privacidad', 
    description: 'Controla quién puede verte' 
  },
  { 
    id: 'appearance', 
    tabType: 'settings-appearance',
    icon: <Palette size={20} />, 
    label: 'Apariencia', 
    description: 'Personaliza la interfaz' 
  },
];

export function SettingsMenu() {
  const { user } = useAuthStore();
  const { openTab } = usePanelStore();

  const handleOpenSettingsTab = (item: SettingMenuItem) => {
    openTab('settings', {
      type: 'settings',
      title: item.label,
      closable: true,
      context: {
        settingsSection: item.id,
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
      <div className="flex-1 overflow-y-auto py-2">
        {settingItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleOpenSettingsTab(item)}
            className="w-full p-4 flex items-center gap-4 hover:bg-hover transition-colors text-left"
          >
            <div className="text-secondary">{item.icon}</div>
            <div className="flex-1">
              <div className="text-primary font-medium">{item.label}</div>
              <div className="text-sm text-muted">{item.description}</div>
            </div>
            <ChevronRight size={20} className="text-muted" />
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
