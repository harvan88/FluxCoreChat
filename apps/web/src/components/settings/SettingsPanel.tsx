/**
 * SettingsPanel - Panel de configuración
 */

import { useState } from 'react';
import { User, Bell, Shield, Palette, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ThemeSettings } from '../common';

type SettingsSection = 'menu' | 'profile' | 'notifications' | 'privacy' | 'appearance';

interface SettingItem {
  id: SettingsSection;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const settingItems: SettingItem[] = [
  { id: 'profile', icon: <User size={20} />, label: 'Perfil', description: 'Gestiona tu información personal' },
  { id: 'notifications', icon: <Bell size={20} />, label: 'Notificaciones', description: 'Configura las alertas' },
  { id: 'privacy', icon: <Shield size={20} />, label: 'Privacidad', description: 'Controla quién puede verte' },
  { id: 'appearance', icon: <Palette size={20} />, label: 'Apariencia', description: 'Personaliza la interfaz' },
];

export function SettingsPanel() {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');

  const renderContent = () => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSection onBack={() => setActiveSection('menu')} />;
      case 'profile':
        return <ComingSoonSection title="Perfil" onBack={() => setActiveSection('menu')} />;
      case 'notifications':
        return <ComingSoonSection title="Notificaciones" onBack={() => setActiveSection('menu')} />;
      case 'privacy':
        return <ComingSoonSection title="Privacidad" onBack={() => setActiveSection('menu')} />;
      default:
        return (
          <div className="flex-1 overflow-y-auto py-2">
            {settingItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-hover transition-colors text-left"
              >
                <div className="text-secondary">{item.icon}</div>
                <div className="flex-1">
                  <div className="text-primary font-medium">{item.label}</div>
                  <div className="text-sm text-muted">{item.description}</div>
                </div>
                <ChevronRight size={20} className="text-muted" />
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* User info */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center">
            <span className="text-inverse font-bold text-xl">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="text-primary font-semibold">{user?.name || 'Usuario'}</div>
            <div className="text-sm text-secondary">{user?.email || 'email@example.com'}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Version */}
      <div className="p-4 border-t border-subtle">
        <div className="text-center text-sm text-muted">
          FluxCore v0.2.0
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Secciones de Configuración
// ============================================================================

interface SectionProps {
  onBack: () => void;
}

function AppearanceSection({ onBack }: SectionProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Apariencia</span>
      </button>
      
      {/* Theme Settings */}
      <div className="p-4">
        <ThemeSettings />
      </div>
    </div>
  );
}

interface ComingSoonSectionProps extends SectionProps {
  title: string;
}

function ComingSoonSection({ title, onBack }: ComingSoonSectionProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">{title}</span>
      </button>
      
      {/* Content */}
      <div className="p-8 text-center">
        <p className="text-muted">Próximamente</p>
      </div>
    </div>
  );
}
