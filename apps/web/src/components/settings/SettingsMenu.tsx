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
import { SidebarNavList } from '../ui/sidebar/SidebarNavList';
import type { SidebarNavItem } from '../ui/sidebar/SidebarNavList';
import { usePanelStore } from '../../store/panelStore';
import { useAuthStore } from '../../store/authStore';

type SettingsTabType =
  | 'settings-profile'
  | 'settings-accounts'
  | 'settings-notifications'
  | 'settings-privacy'
  | 'settings-appearance'
  | 'settings-kernel';

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

export function SettingsMenu() {
  const { user } = useAuthStore();
  const { openTab, layout } = usePanelStore((state) => ({ openTab: state.openTab, layout: state.layout }));

  const hasCreditsAccess = Boolean(user?.systemAdminScopes?.['*'] || user?.systemAdminScopes?.credits);

  const visibleSections = hasCreditsAccess
    ? SETTINGS_SECTIONS
    : SETTINGS_SECTIONS.filter((item) => item.id !== 'credits');

  const settingsContainer = layout.containers.find((container) => container.type === 'settings');

  const activeSettingsSection = (() => {
    if (!settingsContainer) return null;

    const activeTab = settingsContainer.tabs.find((tab) => tab.id === settingsContainer.activeTabId);

    if (!activeTab || activeTab.type !== 'settings') return null;

    return typeof activeTab.context?.section === 'string' ? activeTab.context.section : null;
  })();

  const handleOpenSettingsTab = (item: SettingsSection) => {
    openTab('settings', {
      type: 'settings',
      title: item.label,
      identity: `settings:${item.id}`,
      closable: true,
      context: {
        section: item.id,
      },
    });
  };

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
          onSelect: () => handleOpenSettingsTab(item),
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
