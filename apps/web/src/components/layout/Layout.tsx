/**
 * Layout - Layout principal de la aplicación tipo VS Code
 * TOTEM: Responsive behavior
 */

import { useEffect } from 'react';
import { Menu, X, MessageSquare, Users, Settings, LogOut, Puzzle } from 'lucide-react';
import clsx from 'clsx';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { ViewPort } from './ViewPort';
import { useThemeStore } from '../../store/themeStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '../../hooks/useMediaQuery';

import type { ActivityType } from '../../types';

export function Layout() {
  // Tema
  const { resolvedTheme } = useThemeStore();
  
  // UI State
  const { 
    isMobile, 
    setIsMobile, 
    mobileMenuOpen, 
    toggleMobileMenu,
    setMobileMenuOpen,
  } = useUIStore();

  // Detectar móvil
  const isMobileViewport = useIsMobile();
  
  // Sincronizar estado móvil
  useEffect(() => {
    setIsMobile(isMobileViewport);
  }, [isMobileViewport, setIsMobile]);
  
  // Aplicar tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Escuchar cambios de cuenta para forzar re-render
  useEffect(() => {
    const handleAccountChange = (event: CustomEvent) => {
      console.log('[Layout] Account changed event received:', event.detail);
      // React se re-renderizará automáticamente por cambios en stores
      // Este efecto asegura que cualquier componente que dependa del evento se actualice
    };
    
    window.addEventListener('account:changed', handleAccountChange as EventListener);
    return () => window.removeEventListener('account:changed', handleAccountChange as EventListener);
  }, []);

  // Cerrar menú móvil al hacer clic fuera
  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  // Layout Desktop
  if (!isMobile) {
    return (
      <div data-testid="main-layout" className="h-screen flex bg-base text-primary overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <ViewPort />
      </div>
    );
  }

  // Layout Mobile
  return (
    <div data-testid="main-layout" className="h-screen flex flex-col bg-base text-primary overflow-hidden">
      {/* Mobile Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-subtle bg-surface flex-shrink-0">
        <button
          onClick={toggleMobileMenu}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-hover transition-colors"
          aria-label="Menú"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-inverse font-bold text-lg">F</span>
          </div>
          <span className="font-semibold text-primary">FluxCore</span>
        </div>
        
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-14 bg-black/50 z-40"
          onClick={handleOverlayClick}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div 
        className={clsx(
          'fixed top-14 left-0 bottom-0 w-80 max-w-[85vw] bg-surface z-50',
          'transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* ActivityBar items as list */}
          <MobileActivityBar />
          
          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden border-t border-subtle">
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ViewPort />
      </main>
    </div>
  );
}

// ============================================================================
// Mobile ActivityBar Component
// ============================================================================

interface MobileActivityItem {
  id: ActivityType;
  icon: React.ReactNode;
  label: string;
}

const mobileActivities: MobileActivityItem[] = [
  { id: 'conversations', icon: <MessageSquare size={20} />, label: 'Mensajes' },
  { id: 'contacts', icon: <Users size={20} />, label: 'Contactos' },
  { id: 'extensions', icon: <Puzzle size={20} />, label: 'Extensiones' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Configuración' },
];

function MobileActivityBar() {
  const { activeActivity, setActiveActivity } = useUIStore();
  const { logout } = useAuthStore();

  return (
    <div className="p-2 space-y-1">
      {mobileActivities.map((activity) => (
        <button
          key={activity.id}
          onClick={() => setActiveActivity(activity.id)}
          className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            activeActivity === activity.id
              ? 'bg-active text-primary'
              : 'text-secondary hover:text-primary hover:bg-hover'
          )}
        >
          {activity.icon}
          <span className="font-medium">{activity.label}</span>
        </button>
      ))}
      
      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-secondary hover:text-error hover:bg-hover transition-colors mt-4"
      >
        <LogOut size={20} />
        <span className="font-medium">Cerrar sesión</span>
      </button>
    </div>
  );
}
