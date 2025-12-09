/**
 * FC-823: UserSearch (inline)
 * FC-824: InviteCollaborator
 * Modal/form para invitar colaboradores al workspace
 */

import { useState, useCallback } from 'react';
import {
  Search,
  Mail,
  UserPlus,
  X,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { accountsApi } from '../../services/accounts';
import { Button, Input, Card } from '../ui';
import type { Account } from '../../types';

interface InviteCollaboratorProps {
  workspaceId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

type InviteRole = 'admin' | 'operator' | 'viewer';

export function InviteCollaborator({ workspaceId, onClose, onSuccess }: InviteCollaboratorProps) {
  const { createInvitation, isLoading, error, clearError } = useWorkspaceStore();
  
  const [mode, setMode] = useState<'search' | 'email'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<InviteRole>('operator');
  const [searchResults, setSearchResults] = useState<Account[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Account | null>(null);
  const [success, setSuccess] = useState(false);

  // FC-823: UserSearch
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await accountsApi.searchUsers(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectUser = (user: Account) => {
    setSelectedUser(user);
    setSearchQuery(user.displayName || user.username || '');
    setSearchResults([]);
  };

  const handleInvite = async () => {
    clearError();
    
    let emailToInvite = '';
    
    if (mode === 'email') {
      if (!email || !email.includes('@')) {
        return;
      }
      emailToInvite = email;
    } else if (selectedUser) {
      // In real implementation, we'd need the user's email
      // For now, we'll use a placeholder
      emailToInvite = `${selectedUser.username}@fluxcore.local`;
    } else {
      return;
    }

    const success = await createInvitation(workspaceId, emailToInvite, selectedRole);
    
    if (success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1500);
    }
  };

  const roles: { id: InviteRole; label: string; description: string }[] = [
    { id: 'admin', label: 'Administrador', description: 'Puede gestionar miembros y configuración' },
    { id: 'operator', label: 'Operador', description: 'Puede ver y usar todas las funciones' },
    { id: 'viewer', label: 'Visualizador', description: 'Solo puede ver el contenido' },
  ];

  if (success) {
    return (
      <Card className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
          <Check className="w-6 h-6 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-primary">¡Invitación enviada!</h3>
        <p className="text-sm text-muted mt-2">
          El colaborador recibirá un correo con la invitación.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <UserPlus size={20} />
          Invitar colaborador
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('search')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'search'
              ? 'bg-accent text-inverse'
              : 'bg-elevated text-secondary hover:bg-hover'
          }`}
        >
          <Search size={14} className="inline mr-1.5" />
          Buscar usuario
        </button>
        <button
          onClick={() => setMode('email')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'email'
              ? 'bg-accent text-inverse'
              : 'bg-elevated text-secondary hover:bg-hover'
          }`}
        >
          <Mail size={14} className="inline mr-1.5" />
          Por email
        </button>
      </div>

      {/* Search Mode (FC-823) */}
      {mode === 'search' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre o alias..."
              className="pl-9"
            />
            {isSearching && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border border-default rounded-lg overflow-hidden">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-hover transition-colors border-b border-subtle last:border-b-0"
                >
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-inverse font-bold text-sm">
                    {user.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-primary text-sm font-medium">{user.displayName}</div>
                    <div className="text-muted text-xs">@{user.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-inverse font-bold text-sm">
                {selectedUser.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="text-primary text-sm font-medium">{selectedUser.displayName}</div>
                <div className="text-muted text-xs">@{selectedUser.username}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSearchQuery('');
                }}
                className="p-1 text-muted hover:text-primary"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Email Mode */}
      {mode === 'email' && (
        <div className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            leftIcon={<Mail size={16} />}
          />
          <p className="text-xs text-muted">
            Se enviará una invitación por correo electrónico.
          </p>
        </div>
      )}

      {/* Role Selection */}
      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-primary">Rol</label>
        <div className="space-y-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedRole === role.id
                  ? 'bg-accent/10 border border-accent'
                  : 'bg-elevated hover:bg-hover border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={selectedRole === role.id}
                onChange={() => setSelectedRole(role.id)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className={`font-medium text-sm ${selectedRole === role.id ? 'text-primary' : 'text-secondary'}`}>
                  {role.label}
                </div>
                <div className="text-xs text-muted">{role.description}</div>
              </div>
              {selectedRole === role.id && <Check size={16} className="text-accent" />}
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Button
          variant="primary"
          onClick={handleInvite}
          disabled={isLoading || (mode === 'search' ? !selectedUser : !email)}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <UserPlus size={16} className="mr-1.5" />
              Invitar a colaborar
            </>
          )}
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        )}
      </div>
    </Card>
  );
}
