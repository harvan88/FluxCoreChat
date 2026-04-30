/**
 * AccountSelectorPage - Pantalla premium para seleccionar cuenta de trabajo
 * Sigue la estética de FluxCore y los principios Local-First.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAccounts } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { useContextRefresh } from '../hooks/useContextRefresh';
import type { Account } from '../types';
import clsx from 'clsx';

export function AccountSelectorPage() {
  const navigate = useNavigate();
  const { accounts, isLoading, loadAccounts } = useAccounts();
  const { user } = useAuthStore();
  const { refreshAccountContext } = useContextRefresh();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSelectAccount = async (accountId: string) => {
    setSelectingId(accountId);
    try {
      await refreshAccountContext(accountId);
      const account = accounts.find(a => a.id === accountId);
      if (account?.alias) {
        navigate(`/@/${account.alias}/mensajes`);
      } else {
        navigate(`/@/${accountId}/mensajes`);
      }
    } catch (error) {
      console.error('[AccountSelector] Error switching account:', error);
      setSelectingId(null);
    }
  };

  const personalAccounts = accounts.filter(a => a.accountType === 'personal');
  const businessAccounts = accounts.filter(a => a.accountType === 'business');

  if (isLoading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-secondary">Cargando tus cuentas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-6 shadow-lg shadow-accent/20">
            <span className="text-inverse font-bold text-3xl">F</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Hola, {user?.name || 'Bienvenido'}
          </h1>
          <p className="text-secondary text-lg">
            ¿En qué espacio de trabajo deseas trabajar hoy?
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Personal Accounts Section */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 px-2">
              Cuenta Personal
            </h2>
            <div className="space-y-3">
              {personalAccounts.map(account => (
                <AccountCard 
                  key={account.id} 
                  account={account} 
                  onSelect={() => handleSelectAccount(account.id)} 
                  isSelecting={selectingId === account.id}
                />
              ))}
              {personalAccounts.length === 0 && (
                <div className="p-8 border border-dashed border-default rounded-2xl text-center text-muted text-sm">
                  No tienes cuentas personales configuradas.
                </div>
              )}
            </div>
          </section>

          {/* Business Accounts Section */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 px-2">
              Negocios y Equipos
            </h2>
            <div className="space-y-3">
              {businessAccounts.map(account => (
                <AccountCard 
                  key={account.id} 
                  account={account} 
                  onSelect={() => handleSelectAccount(account.id)} 
                  isSelecting={selectingId === account.id}
                />
              ))}
              {businessAccounts.length === 0 && (
                <div className="p-8 border border-dashed border-default rounded-2xl text-center text-muted text-sm">
                  No tienes cuentas de negocio vinculadas.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer / Logout Option */}
        <div className="mt-12 text-center">
          <button 
            onClick={() => navigate('/login')}
            className="text-muted hover:text-primary transition-colors text-sm font-medium"
          >
            ¿No es tu cuenta? Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ 
  account, 
  onSelect, 
  isSelecting 
}: { 
  account: Account; 
  onSelect: () => void;
  isSelecting: boolean;
}) {
  const Icon = account.accountType === 'business' ? Building2 : User;
  const initials = account.displayName?.charAt(0).toUpperCase() || 
                  account.alias?.charAt(0).toUpperCase() || '?';

  return (
    <button
      onClick={onSelect}
      disabled={isSelecting}
      className={clsx(
        "group w-full flex items-center gap-4 p-4 rounded-2xl border border-default bg-surface",
        "hover:border-accent hover:bg-hover hover:shadow-md transition-all duration-200 text-left",
        isSelecting && "opacity-60 cursor-wait border-accent"
      )}
    >
      {/* Avatar Container */}
      <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
        {account.profile?.avatarUrl ? (
          <img 
            src={account.profile.avatarUrl} 
            alt={account.displayName} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-inverse font-bold text-xl">{initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-primary truncate group-hover:text-accent transition-colors">
          {account.displayName}
        </h3>
        <div className="flex items-center gap-2 text-secondary text-sm mt-0.5">
          <Icon size={14} className="text-muted" />
          <span className="truncate">@{account.alias}</span>
        </div>
      </div>

      {/* Action Icon */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted group-hover:text-accent group-hover:bg-accent-muted transition-all">
        {isSelecting ? (
          <Loader2 size={20} className="animate-spin text-accent" />
        ) : (
          <ArrowRight size={20} />
        )}
      </div>
    </button>
  );
}
