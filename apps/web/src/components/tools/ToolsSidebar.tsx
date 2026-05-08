import { FileTextIcon, FluxCoreIcon } from '../../lib/icon-library';
import { useLocation } from 'react-router-dom';
import { SidebarNavList } from '../ui/sidebar/SidebarNavList';
import { useExtensions } from '../../hooks/useExtensions';
import { usePanelStore } from '../../store/panelStore';
import { useUIStore } from '../../store/uiStore';
import type { SidebarNavItem } from '../ui/sidebar/SidebarNavList';

interface ToolsSidebarProps {
  accountId?: string | null;
}

export function ToolsSidebar({ accountId }: ToolsSidebarProps) {
  const layout = usePanelStore((state) => state.layout);
  const { activeActivity, setActiveActivity } = useUIStore();
  const { installations } = useExtensions(accountId || undefined);

  const isFluxCoreInstalled = installations.some(i => i.extensionId === '@fluxcore/asistentes');

  const location = useLocation();

  const activeToolId = (() => {
    if (location.pathname.includes('/herramientas/plantillas')) return 'templates';
    return null;
  })();

  const items: SidebarNavItem[] = [
    {
      id: 'templates',
      label: 'Plantillas',
      icon: <FileTextIcon size={18} />,
      disabled: !accountId,
      active: activeToolId === 'templates',
      routeId: 'tools.templates',
    },
  ];

  // Agregar FluxCore si está instalado
  if (isFluxCoreInstalled) {
    items.push({
      id: 'fluxcore',
      label: 'Asistente (FluxCore)',
      icon: <FluxCoreIcon size={18} />,
      active: activeActivity === 'ext:@fluxcore/asistentes',
      onSelect: () => {
        setActiveActivity('ext:@fluxcore/asistentes');
      },
    });
  }

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
