import { ProfileSection } from './ProfileSection';
import { AccountsSection } from '../accounts';
import { CreditsSection } from './CreditsSection';
import { KernelSessionsSection } from './KernelSessionsSection';
import { ThemeSettings } from '../common';
import { ComponentPreviewGallery } from './ComponentPreviewGallery';
import type { Tab } from '../../types/panels';

interface SettingsTabContentProps {
  section?: string;
  tab?: Tab;
}

export function SettingsTabContent({ section }: SettingsTabContentProps) {
  const handleBack = () => {
    // En el contexto de tabs, no hay "back" - el usuario cierra el tab
  };

  switch (section) {
    case 'profile':
      return <ProfileSection onBack={handleBack} />;

    case 'accounts':
      return <AccountsSection onBack={handleBack} />;

    case 'credits':
      return <CreditsSection onBack={handleBack} />;

    case 'appearance':
      return (
        <div className="h-full overflow-y-auto p-6">
          <h2 className="text-xl font-semibold text-primary mb-6">Apariencia</h2>
          <ThemeSettings />
          <ComponentPreviewGallery />
        </div>
      );

    case 'notifications':
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-secondary">Notificaciones</p>
            <p className="text-sm text-muted mt-2">Próximamente</p>
          </div>
        </div>
      );

    case 'privacy':
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-secondary">Privacidad</p>
            <p className="text-sm text-muted mt-2">Próximamente</p>
          </div>
        </div>
      );

    case 'kernel':
      return <KernelSessionsSection onBack={handleBack} />;

    default:
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-secondary">Configuración</p>
            <p className="text-sm text-muted mt-2">Selecciona una opción del menú</p>
          </div>
        </div>
      );
  }
}
