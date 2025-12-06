/**
 * WelcomeView - Vista de bienvenida cuando no hay conversación seleccionada
 */

import { MessageSquare } from 'lucide-react';

export function WelcomeView() {
  return (
    <div className="flex-1 bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-800 rounded-full">
            <MessageSquare size={48} className="text-blue-500" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          Bienvenido a FluxCore
        </h2>
        <p className="text-gray-400 max-w-md">
          Selecciona una conversación del panel lateral para empezar a chatear,
          o crea una nueva conversación.
        </p>
      </div>
    </div>
  );
}
