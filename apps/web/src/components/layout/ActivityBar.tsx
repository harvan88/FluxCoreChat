/**
 * ActivityBar - Barra lateral de iconos tipo VS Code
 */

import { MessageSquare, Users, Settings, LogOut, Puzzle } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import type { ActivityType } from '../../types';

interface ActivityItem {
  id: ActivityType;
  icon: React.ReactNode;
  label: string;
}

const activities: ActivityItem[] = [
  { id: 'conversations', icon: <MessageSquare size={24} />, label: 'Conversaciones' },
  { id: 'contacts', icon: <Users size={24} />, label: 'Contactos' },
  { id: 'extensions', icon: <Puzzle size={24} />, label: 'Extensiones' },
  { id: 'settings', icon: <Settings size={24} />, label: 'Configuración' },
];

export function ActivityBar() {
  const { activeActivity, setActiveActivity } = useUIStore();
  const { logout } = useAuthStore();

  return (
    <div className="w-14 bg-gray-900 flex flex-col items-center py-4 border-r border-gray-800">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">F</span>
        </div>
      </div>

      {/* Activities */}
      <div className="flex-1 space-y-2">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => setActiveActivity(activity.id)}
            className={clsx(
              'w-12 h-12 flex items-center justify-center rounded-lg transition-colors',
              activeActivity === activity.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
            title={activity.label}
          >
            {activity.icon}
          </button>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="space-y-2">
        <button
          onClick={logout}
          className="w-12 h-12 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
}
