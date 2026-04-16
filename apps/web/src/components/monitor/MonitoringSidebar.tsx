import clsx from 'clsx';
import {
  MonitoringIcon,
  ExternalLinkIcon,
  CreditsIcon,
  DocumentationIcon,
} from '../../lib/icon-library';
import { usePanelStore } from '../../store/panelStore';

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

  const dashboardContainer = layout.containers.find((container) => container.type === 'dashboard');
  const activeMonitoringIdentity = (() => {
    if (!dashboardContainer) return null;
    const activeTab = dashboardContainer.tabs.find((tab) => tab.id === dashboardContainer.activeTabId);
    if (!activeTab || activeTab.type !== 'monitoring') return null;
    if (activeTab.identity) return activeTab.identity;
    const view = typeof activeTab.context?.view === 'string' ? activeTab.context.view : 'kernel';
    if (view === 'kernel') return 'monitoring-kernel';
    if (view === 'pipeline') return 'monitoring-pipeline';
    if (view === 'documentation') return 'monitoring-documentation';
    return 'monitoring-kernel';
  })();

  const openMonitoringTab = (identity: string, view: 'kernel' | 'pipeline' | 'documentation', title: string, icon: string) => {
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
      id: 'monitoring-kernel',
      identity: 'monitoring-kernel',
      icon: <MonitoringIcon size={18} />,
      title: 'Unified Kernel Monitor',
      description: 'Observabilidad forense 360°: Pipeline de 7 pasos y trazas de IA (E/S).',
      onClick: () => openMonitoringTab('monitoring-kernel', 'kernel', 'Kernel Monitor', 'Activity'),
    },
    {
      id: 'monitoring-documentation',
      identity: 'monitoring-documentation',
      icon: <DocumentationIcon size={18} />,
      title: 'Documentation Quality',
      description: 'Métricas de calidad y cobertura de documentación del sistema.',
      onClick: () => openMonitoringTab('monitoring-documentation', 'documentation', 'Documentation Quality', 'FileText'),
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
