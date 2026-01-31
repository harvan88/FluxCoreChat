import clsx from 'clsx';
import {
  MonitoringIcon,
  ExternalLinkIcon,
  DatabaseIcon,
  AlertTriangleIcon,
  HardDriveIcon,
} from '../../lib/icon-library';
import { usePanelStore } from '../../store/panelStore';
import { useAccountDeletionMonitorStore } from '../../store/accountDeletionMonitorStore';

interface MonitoringTool {
  id: string;
  identity: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  meta?: string;
}

export function MonitoringSidebar() {
  const { openTab, layout } = usePanelStore((state) => ({ openTab: state.openTab, layout: state.layout }));
  const { logs, isFetchingLogs } = useAccountDeletionMonitorStore();

  const dashboardContainer = layout.containers.find((container) => container.type === 'dashboard');
  const activeMonitoringIdentity = (() => {
    if (!dashboardContainer) return null;
    const activeTab = dashboardContainer.tabs.find((tab) => tab.id === dashboardContainer.activeTabId);
    if (!activeTab || activeTab.type !== 'monitoring') return null;
    if (activeTab.identity) return activeTab.identity;
    const view = typeof activeTab.context?.view === 'string' ? activeTab.context.view : 'hub';
    return view === 'audit' ? 'monitoring-data-audit' : 'monitoring-hub';
  })();

  const openMonitoringTab = (identity: string, view: 'hub' | 'audit' | 'orphans', title: string, icon: string) => {
    openTab('dashboard', {
      type: 'monitoring',
      identity,
      title,
      icon,
      closable: true,
      context: { view },
    });
  };

  const tools: MonitoringTool[] = [
  {
    id: 'monitoring-hub',
    identity: 'monitoring-hub',
    icon: <MonitoringIcon size={18} />,
    title: 'Monitoring Hub',
    description: 'Logs, banner global y tareas activas.',
    onClick: () => openMonitoringTab('monitoring-hub', 'hub', 'Monitoring Hub', 'Activity'),
    meta: isFetchingLogs ? 'Cargando…' : `${logs.length} registros locales`,
  },
  {
    id: 'monitoring-audit',
    identity: 'monitoring-data-audit',
    icon: <DatabaseIcon size={18} />,
    title: 'Account Data Audit',
    description: 'Verifica tablas con referencias residuales.',
    onClick: () => openMonitoringTab('monitoring-data-audit', 'audit', 'Account Data Audit', 'Database'),
  },
  {
    id: 'monitoring-orphans',
    identity: 'monitoring-orphans',
    icon: <AlertTriangleIcon size={18} />,
    title: 'Orphan Explorer',
    description: 'Detecta tablas con cuentas inexistentes.',
    onClick: () => openMonitoringTab('monitoring-orphans', 'orphans', 'Orphan Explorer', 'AlertTriangle'),
  },
  {
    id: 'monitoring-assets',
    identity: 'monitoring-assets',
    icon: <HardDriveIcon size={18} />,
    title: 'Asset Monitoring',
    description: 'Logs de uploads, descargas y políticas de assets.',
    onClick: () => openMonitoringTab('monitoring-assets', 'assets' as any, 'Asset Monitoring', 'HardDrive'),
  },
];

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-4 py-3 border-b border-subtle">
        <span className="text-xs uppercase tracking-wide text-secondary">Monitoring</span>
        <h2 className="text-lg font-semibold text-primary">Herramientas</h2>
        <p className="text-sm text-muted">Colección de paneles y runbooks operativos.</p>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto" data-component-name="MonitoringSidebar">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 rounded-lg',
              activeMonitoringIdentity === tool.identity
                ? 'bg-active text-primary'
                : 'text-secondary hover:bg-hover hover:text-primary',
            )}
            onClick={tool.onClick}
            title={tool.description}
          >
            <span
              className={clsx(
                activeMonitoringIdentity === tool.identity ? 'text-accent' : 'text-muted',
                'flex-shrink-0',
              )}
            >
              {tool.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-sm font-medium text-primary block truncate">{tool.title}</span>
              <span className="text-xs text-muted block truncate">{tool.description}</span>
              {tool.meta && (
                <span className="text-[11px] text-secondary block mt-0.5">{tool.meta}</span>
              )}
            </span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-subtle text-xs text-muted flex items-center gap-2">
        <ExternalLinkIcon size={12} /> Consulta los runbooks internos para más herramientas.
      </div>
    </div>
  );
}
