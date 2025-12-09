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
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar contactos..."
            className="w-full bg-elevated text-primary pl-10 pr-4 py-2 rounded-lg text-sm border border-subtle focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Add contact button */}
      <div className="px-3 pb-3">
        <button className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-inverse py-2 px-4 rounded-lg transition-colors text-sm font-medium">
          <UserPlus size={18} />
          Agregar contacto
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            className="w-full p-3 flex gap-3 hover:bg-hover transition-colors text-left"
          >
            {/* Avatar */}
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
              <span className="text-inverse font-semibold text-sm">
                {contact.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-primary font-medium truncate">{contact.name}</div>
              <div className="text-sm text-secondary">{contact.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
