import { FileTextIcon } from '../../lib/icon-library';
import { SidebarNavList } from '../ui/sidebar/SidebarNavList';
import { usePanelStore } from '../../store/panelStore';
import type { SidebarNavItem } from '../ui/sidebar/SidebarNavList';

interface ToolsSidebarProps {
  accountId?: string | null;
}

export function ToolsSidebar({ accountId }: ToolsSidebarProps) {
  const layout = usePanelStore((state) => state.layout);
  const openTab = usePanelStore((state) => state.openTab);

  const activeToolId = (() => {
    const focusedId = layout.focusedContainerId;
    const containers = layout.containers;
    const container = focusedId
      ? containers.find((c) => c.id === focusedId)
      : containers[0];
    const activeTab = container?.tabs.find((tab) => tab.id === container.activeTabId);
    if (!activeTab) return null;

    if (activeTab.type === 'template-panel') return 'templates';
    if (typeof activeTab.identity === 'string' && activeTab.identity.startsWith('template-panel:')) {
      return 'templates';
    }

    return null;
  })();

  const items: SidebarNavItem[] = [
    {
      id: 'templates',
      label: 'Plantillas',
      icon: <FileTextIcon size={18} />,
      disabled: !accountId,
      active: activeToolId === 'templates',
      onSelect: () => {
        if (!accountId) return;
        openTab('editor', {
          type: 'template-panel',
          identity: `template-panel:${accountId}`,
          title: 'Plantillas',
          icon: 'FileText',
          closable: true,
          context: {
            accountId,
          },
        });
      },
    },
  ];

  return (
    <div className="h-full flex flex-col" data-component-name="ToolsSidebar">
      <div className="px-4 py-3 border-b border-subtle">
        <h2 className="text-sm font-semibold text-primary">Herramientas</h2>
        <p className="text-xs text-muted mt-1">
          Selecciona una herramienta del núcleo para abrirla en un tab
        </p>
      </div>
      <SidebarNavList as="nav" items={items} className="flex-1" />
    </div>
  );
}
