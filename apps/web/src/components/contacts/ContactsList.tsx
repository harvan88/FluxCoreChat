/**
 * ContactsList - Lista de contactos (relaciones)
 */

import { Search, UserPlus } from 'lucide-react';

export function ContactsList() {
  // Mock contacts for now
  const contacts = [
    { id: '1', name: 'Juan Pérez', username: '@juanperez', status: 'active' },
    { id: '2', name: 'María Gómez', username: '@mariagomez', status: 'active' },
    { id: '3', name: 'Carlos López', username: '@carloslopez', status: 'archived' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar contactos..."
            className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Add contact button */}
      <div className="px-3 pb-3">
        <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">
          <UserPlus size={18} />
          Agregar contacto
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            className="w-full p-3 flex gap-3 hover:bg-gray-700 transition-colors text-left"
          >
            {/* Avatar */}
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {contact.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">{contact.name}</div>
              <div className="text-sm text-gray-400">{contact.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
