/**
 * FluxCore Sidebar Navigation
 * 
 * Navegación principal de FluxCore con las secciones:
 * - Uso (Dashboard)
 * - Asistentes
 * - Instrucciones del sistema
 * - Base de conocimiento
 * - Herramientas
 * - Depuración del asistente
 * - Facturación
 */

import {
  BarChart3,
  Bot,
  FileText,
  Database,
  Wrench,
  GitBranch,
  Bug,
  CreditCard,
  Lock,
  LayoutDashboard,
  Shield,
  Activity,
} from 'lucide-react';

import { SidebarNavList, Switch } from '../ui';
import type { SidebarNavItem } from '../ui/sidebar/SidebarNavList';
import { FluxCoreView } from '@/types/fluxcore/views.types';
import { RuntimeSwitcher } from './RuntimeSwitcher';
import { useAIStatus } from '../../hooks/fluxcore/useAIStatus';
import { useExtensions } from '../../hooks/useExtensions';
import { FluxCoreIcon } from '../../lib/icon-library';

interface FluxCoreSidebarProps {
  activeView: FluxCoreView;
  onViewChange: (view: FluxCoreView) => void;
  accountName?: string;
  accountId?: string | null;
  isLocked?: boolean;
}

const navItems: SidebarNavItem[] = [
  { id: 'usage', label: 'Uso', icon: <BarChart3 size={18} /> },
  { id: 'assistants', label: 'Asistentes', icon: <Bot size={18} /> },
  { id: 'instructions', label: 'Instrucciones del sistema', icon: <FileText size={18} /> },
  { id: 'knowledge-base', label: 'Base de conocimiento', icon: <Database size={18} /> },
  { id: 'tools', label: 'Herramientas Fluxcore', icon: <Wrench size={18} /> },
  { id: 'agents', label: 'Agentes', icon: <GitBranch size={18} /> },
  { id: 'works', label: 'Fluxi', icon: <LayoutDashboard size={18} /> },
  { id: 'debug', label: 'Depuración del asistente', icon: <Bug size={18} /> },
  { id: 'policies', label: 'Políticas (Context)', icon: <Shield size={18} /> },
  { id: 'traces', label: 'Trazas del runtime', icon: <Activity size={18} /> },
  { id: 'billing', label: 'Facturación', icon: <CreditCard size={18} /> },
];

export function FluxCoreSidebar({
  activeView,
  onViewChange,
  accountName = 'FluxCore',
  accountId,
  isLocked = false,
}: FluxCoreSidebarProps) {
  const { status } = useAIStatus({ accountId });
  const { installations, toggle } = useExtensions(accountId || undefined);
  
  const activeRuntime = status?.activeRuntimeId || '@fluxcore/asistentes';
  const isFluxiActive = activeRuntime === '@fluxcore/fluxi';

  // Buscar instalación de FluxCore para el switch de activación (visibilidad en ActivityBar)
  const fluxCoreInstallation = installations.find(i => i.extensionId === '@fluxcore/asistentes');
  const isEnabled = fluxCoreInstallation?.enabled ?? false;

  // Filtrar navegación según el motor activo
  const filteredNavItems = navItems.filter((item) => {
    if (isFluxiActive) {
      // Modo Fluxi: Ocultar secciones conversacionales puras
      return !['assistants', 'instructions', 'agents', 'debug'].includes(item.id);
    } else {
      // Modo Asistentes: Ocultar secciones de Fluxi
      return item.id !== 'works';
    }
  });

  return (
    <div className="h-full flex flex-col bg-surface border-r border-subtle">
      {/* Header */}
      <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <FluxCoreIcon size={22} className="text-accent flex-shrink-0" />
          <span className="font-semibold text-primary truncate">{accountName}</span>
        </div>
        <div className="flex items-center gap-2">
          {fluxCoreInstallation && (
            <Switch
              title={isEnabled ? "Ocultar de la barra lateral" : "Mostrar en la barra lateral"} 
              checked={isEnabled}
              onCheckedChange={(checked) => toggle('@fluxcore/asistentes', checked)}
              size="sm"
            />
          )}
          {isLocked && (
            <Lock size={16} className="text-muted" />
          )}
        </div>
      </div>

      {/* Runtime Switcher */}
      {accountId && <RuntimeSwitcher accountId={accountId} />}

      {/* Navigation */}
      <SidebarNavList
        as="nav"
        className="flex-1"
        items={filteredNavItems.map((item) => ({
          ...item,
          active: activeView === item.id,
          onSelect: () => onViewChange(item.id as FluxCoreView),
        }))}
      />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-subtle">
        <p className="text-xs text-muted">
          FluxCore v1.0
        </p>
      </div>
    </div>
  );
}

export default FluxCoreSidebar;
