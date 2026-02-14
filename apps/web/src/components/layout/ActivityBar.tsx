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

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useAccountStore } from '../../store/accountStore';
import { useExtensions } from '../../hooks/useExtensions';
import { AccountSwitcher } from '../accounts';
import { api } from '../../services/api';
import { usePanelStore } from '../../store/panelStore';
import {
  ConversationsIcon,
  ContactsIcon,
  ExtensionsIcon,
  SettingsIcon,
  ActivityBarExpandIcon,
  ActivityBarCollapseIcon,
  CreditsIcon,
  LogoutIcon,
  GlobeIcon,
  CalendarIcon,
  ShoppingCartIcon,
  FileTextIcon,
  ToolsIcon,
  BotIcon,
  MonitoringIcon,
  FluxCoreIcon,
} from '../../lib/icon-library';

import type { ActivityType } from '../../types';

interface ActivityItem {
  id: ActivityType;
  icon: React.ReactNode;
  label: string;
}

// Actividades base del sistema
const baseActivities: ActivityItem[] = [
  { id: 'conversations', icon: <ConversationsIcon size={22} />, label: 'Mensajes' },
  { id: 'contacts', icon: <ContactsIcon size={22} />, label: 'Contactos' },
  { id: 'tools', icon: <ToolsIcon size={22} />, label: 'Herramientas' },
  { id: 'extensions', icon: <ExtensionsIcon size={22} />, label: 'Extensiones' },
  { id: 'settings', icon: <SettingsIcon size={22} />, label: 'Configuración' },
];

// Mapeo de nombres de iconos a componentes Lucide
const iconMap: Record<string, React.ReactNode> = {
  globe: <GlobeIcon size={22} />,
  calendar: <CalendarIcon size={22} />,
  'shopping-cart': <ShoppingCartIcon size={22} />,
  'file-text': <FileTextIcon size={22} />,
  zap: <CreditsIcon size={22} />,
  puzzle: <ExtensionsIcon size={22} />,
  bot: <BotIcon size={22} />,
};

export function ActivityBar() {
  const {
    activeActivity,
    setActiveActivity,
    activityBarExpanded,
    toggleActivityBar,
    selectedAccountId: uiSelectedAccountId,
    activeConversationId,
  } = useUIStore();
  const { logout } = useAuthStore();
  const { activeAccount } = useAccountStore();
  const openTab = usePanelStore((state) => state.openTab);

  // VER-002: Usar selectedAccountId de uiStore (sincronizado por AccountSwitcher)
  const selectedAccountId = uiSelectedAccountId || activeAccount?.id || null;
  const { installations } = useExtensions(selectedAccountId);

  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [premiumSession, setPremiumSession] = useState<{
    engine: string;
    tokensUsed: number;
    tokenBudget: number;
  } | null>(null);

  // VER-004: Debug logs para verificar carga de extensiones
  console.log('[ActivityBar] selectedAccountId:', selectedAccountId);
  console.log('[ActivityBar] installations:', installations);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      if (!selectedAccountId) {
        if (!cancelled) {
          setCreditsBalance(null);
          setPremiumSession(null);
        }
        return;
      }

      const balanceRes = await api.getCreditsBalance(selectedAccountId);
      if (!cancelled) {
        setCreditsBalance(balanceRes.success ? balanceRes.data?.balance ?? 0 : null);
      }

      if (activeConversationId) {
        const sessionRes = await api.getCreditsSession({
          accountId: selectedAccountId,
          conversationId: activeConversationId,
        });
        if (!cancelled) {
          const session = sessionRes.success ? (sessionRes.data as any) : null;
          setPremiumSession(
            session && typeof session === 'object'
              ? {
                engine: session.engine,
                tokensUsed: Number(session.tokensUsed) || 0,
                tokenBudget: Number(session.tokenBudget) || 0,
              }
              : null
          );
        }
      } else if (!cancelled) {
        setPremiumSession(null);
      }
    };

    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedAccountId, activeConversationId]);

  // Generar actividades dinámicas de extensiones con UI
  const extensionActivities: ActivityItem[] = installations
    .filter(inst => inst.enabled && inst.manifest?.ui?.sidebar)
    .map(inst => {
      const iconKey = inst.manifest?.ui?.sidebar?.icon || 'puzzle';
      const isFluxCoreExtension = inst.extensionId === '@fluxcore/asistentes' || inst.extensionId === 'fluxcore';
      const iconNode = isFluxCoreExtension
        ? <FluxCoreIcon size={22} />
        : iconMap[iconKey] || <ExtensionsIcon size={22} />;

      return {
        id: `ext:${inst.extensionId}` as ActivityType,
        icon: iconNode,
        label: inst.manifest?.ui?.sidebar?.title || inst.manifest?.name || 'Extension',
      };
    });

  // VER-004: Log extensiones con UI
  console.log('[ActivityBar] extensionActivities:', extensionActivities);

  // Combinar actividades base con extensiones (extensiones después de contacts, antes de extensions)
  const activities: ActivityItem[] = [
    ...baseActivities.slice(0, 2), // conversations, contacts
    ...extensionActivities,        // extensiones con UI
    ...baseActivities.slice(2),    // extensions, settings
  ];

  const handleOpenMonitoring = () => {
    setActiveActivity('monitoring');
    openTab('dashboard', {
      type: 'monitoring',
      identity: 'monitoring-hub',
      title: 'Monitoring Hub',
      icon: 'Activity',
      closable: true,
      context: {},
    });
  };

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
            <ActivityBarCollapseIcon size={18} />
          ) : (
            <ActivityBarExpandIcon size={18} />
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
        {selectedAccountId && (
          <div
            className={clsx(
              'w-full flex items-center rounded-lg transition-all duration-200 text-secondary',
              activityBarExpanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
            )}
            title={!activityBarExpanded ? `Créditos: ${creditsBalance ?? '-'}` : undefined}
          >
            <span className="flex-shrink-0">
              <CreditsIcon size={18} className={premiumSession ? 'text-accent' : undefined} />
            </span>
            {activityBarExpanded && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-primary truncate">
                  Créditos: {creditsBalance ?? '-'}
                </div>
                <div className="text-[11px] text-muted truncate">
                  {premiumSession
                    ? `Premium (${premiumSession.engine}) ${premiumSession.tokensUsed}/${premiumSession.tokenBudget}`
                    : 'Premium: inactivo'}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleOpenMonitoring}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg transition-all duration-200',
            activityBarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
            activeActivity === 'monitoring'
              ? 'bg-active text-primary'
              : 'text-secondary hover:text-primary hover:bg-hover'
          )}
          title={!activityBarExpanded ? 'Monitoring Hub' : undefined}
        >
          <MonitoringIcon size={18} className="flex-shrink-0" />
          {activityBarExpanded && (
            <span className="text-sm font-medium truncate">Monitoring</span>
          )}
        </button>

        <button
          onClick={logout}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg transition-all duration-200',
            activityBarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
            'text-secondary hover:text-error hover:bg-hover'
          )}
          title={!activityBarExpanded ? 'Cerrar sesión' : undefined}
        >
          <LogoutIcon size={22} className="flex-shrink-0" />
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
