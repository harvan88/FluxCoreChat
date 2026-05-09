/**

 * SettingsMenu - Menú de configuración para Sidebar

 * Solo muestra opciones, el contenido se abre en tabs del DynamicContainer
 */

import {
  UserIcon,
  BellIcon,
  ShieldIcon,
  PaletteIcon,
  BuildingIcon,
  CreditsIcon,
} from '../../lib/icon-library';
import { Share2, MapPin, Clock } from 'lucide-react';
import { SidebarNavList } from '../ui/sidebar/SidebarNavList';
import type { SidebarNavItem } from '../ui/sidebar/SidebarNavList';
// import { usePanelStore } from '../../store/panelStore';
import { useAuthStore } from '../../store/authStore';

type SettingsTabType =
  | 'settings-profile'
  | 'settings-accounts'
  | 'settings-notifications'
  | 'settings-privacy'
  | 'settings-appearance'
  | 'settings-kernel'
  | 'settings-contacto'
  | 'settings-ubicacion'
  | 'settings-horario';

interface SettingsSection {
  id: string;
  tabType: SettingsTabType;
  icon: React.ReactNode;
  label: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'profile',
    tabType: 'settings-profile',
    icon: <UserIcon size={20} />,
    label: 'Perfil',
  },
  {
    id: 'contacto',
    tabType: 'settings-contacto',
    icon: <Share2 size={20} />,
    label: 'Contacto y Redes',
  },
  {
    id: 'ubicacion',
    tabType: 'settings-ubicacion',
    icon: <MapPin size={20} />,
    label: 'Ubicación',
  },
  {
    id: 'horario',
    tabType: 'settings-horario',
    icon: <Clock size={20} />,
    label: 'Horario',
  },
  {
    id: 'accounts',
    tabType: 'settings-accounts',
    icon: <BuildingIcon size={20} />,
    label: 'Cuentas',
  },
  {
    id: 'credits',
    tabType: 'settings-accounts',
    icon: <CreditsIcon size={20} />,
    label: 'Créditos',
  },
  {
    id: 'notifications',
    tabType: 'settings-notifications',
    icon: <BellIcon size={20} />,
    label: 'Notificaciones',
  },
  {
    id: 'privacy',
    tabType: 'settings-privacy',
    icon: <ShieldIcon size={20} />,
    label: 'Privacidad',
  },
  {
    id: 'appearance',
    tabType: 'settings-appearance',
    icon: <PaletteIcon size={20} />,
    label: 'Apariencia',
  },
  {
    id: 'kernel',
    tabType: 'settings-kernel',
    icon: <ShieldIcon size={20} />,
    label: 'Kernel',
  },
];

import { useLocation } from 'react-router-dom';

export function SettingsMenu() {
  const { user } = useAuthStore();
  const location = useLocation();

  const hasCreditsAccess = Boolean(user?.systemAdminScopes?.['*'] || user?.systemAdminScopes?.credits);

  const visibleSections = hasCreditsAccess
    ? SETTINGS_SECTIONS
    : SETTINGS_SECTIONS.filter((item) => item.id !== 'credits');

  const activeSettingsSection = (() => {
    for (const section of visibleSections) {
      if (location.pathname.includes(`/ajustes/${section.id}`)) {
        return section.id;
      }
    }
    return null;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Menu items */}
      <SidebarNavList
        as="nav"
        className="py-2"
        data-component-name="SettingsMenu"
        items={visibleSections.map<SidebarNavItem>((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          active: activeSettingsSection === item.id,
          routeId: 'settings.detail',
          routeParams: { id: item.id },
        }))}
      />



      {/* Version */}

      <div className="p-4 border-t border-subtle">

        <div className="text-center text-sm text-muted">

          FluxCore v0.2.0
        </div>
      </div>
    </div>
  );
}
