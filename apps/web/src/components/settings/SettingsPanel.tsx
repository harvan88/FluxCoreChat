/**
 * SettingsPanel - Panel de configuración
 */

import { User, Bell, Shield, Palette } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SettingItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const settingItems: SettingItem[] = [
  { icon: <User size={20} />, label: 'Perfil', description: 'Gestiona tu información personal' },
  { icon: <Bell size={20} />, label: 'Notificaciones', description: 'Configura las alertas' },
  { icon: <Shield size={20} />, label: 'Privacidad', description: 'Controla quién puede verte' },
  { icon: <Palette size={20} />, label: 'Apariencia', description: 'Personaliza la interfaz' },
];

export function SettingsPanel() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <div className="text-white font-semibold">{user?.name || 'Usuario'}</div>
            <div className="text-sm text-gray-400">{user?.email || 'email@example.com'}</div>
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto py-2">
        {settingItems.map((item, index) => (
          <button
            key={index}
            className="w-full p-4 flex items-center gap-4 hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-gray-400">{item.icon}</div>
            <div className="flex-1">
              <div className="text-white font-medium">{item.label}</div>
              <div className="text-sm text-gray-400">{item.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Version */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-center text-sm text-gray-500">
          FluxCore v0.2.0
        </div>
      </div>
    </div>
  );
}
