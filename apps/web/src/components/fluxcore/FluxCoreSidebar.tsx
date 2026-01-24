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

import { FluxCoreView } from '@/types/fluxcore/views.types';

interface FluxCoreSidebarProps {
  activeView: FluxCoreView;
  onViewChange: (view: FluxCoreView) => void;
  accountName?: string;
  isLocked?: boolean;
}

interface NavItem {
  id: FluxCoreView;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
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
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-2.5 text-left
              transition-colors duration-150
              ${activeView === item.id
                ? 'bg-active text-primary'
                : 'text-secondary hover:bg-hover hover:text-primary'
              }
            `}
          >
            <span className={activeView === item.id ? 'text-accent' : 'text-muted'}>
              {item.icon}
            </span>
            <span className="text-sm font-medium truncate">{item.label}</span>
          </button>
        ))}
      </nav>

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
