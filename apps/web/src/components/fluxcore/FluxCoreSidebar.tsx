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
  Bug,
  CreditCard,
  Lock,
} from 'lucide-react';

import { SidebarNavList } from '../ui';
import type { SidebarNavItem } from '../ui/sidebar/SidebarNavList';
import { FluxCoreView } from '@/types/fluxcore/views.types';

interface FluxCoreSidebarProps {
  activeView: FluxCoreView;
  onViewChange: (view: FluxCoreView) => void;
  accountName?: string;
  isLocked?: boolean;
}

const navItems: SidebarNavItem[] = [
  { id: 'usage', label: 'Uso', icon: <BarChart3 size={18} /> },
  { id: 'assistants', label: 'Asistentes', icon: <Bot size={18} /> },
  { id: 'instructions', label: 'Instrucciones del sistema', icon: <FileText size={18} /> },
  { id: 'knowledge-base', label: 'Base de conocimiento', icon: <Database size={18} /> },
  { id: 'tools', label: 'Herramientas', icon: <Wrench size={18} /> },
  { id: 'debug', label: 'Depuración del asistente', icon: <Bug size={18} /> },
  { id: 'billing', label: 'Facturación', icon: <CreditCard size={18} /> },
];

export function FluxCoreSidebar({
  activeView,
  onViewChange,
  accountName = 'FluxCore',
  isLocked = false,
}: FluxCoreSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-surface border-r border-subtle">
      {/* Header */}
      <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-accent" />
          <span className="font-semibold text-primary">{accountName}</span>
        </div>
        {isLocked && (
          <Lock size={16} className="text-muted" />
        )}
      </div>

      {/* Navigation */}
      <SidebarNavList
        as="nav"
        className="flex-1"
        items={navItems.map((item) => ({
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
