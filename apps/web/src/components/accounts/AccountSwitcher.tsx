/**
 * FC-811: AccountSwitcher
 * Selector de cuenta en el header/ActivityBar
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Building2, User, Check } from 'lucide-react';
import { useAccounts } from '../../store/accountStore';
import { usePanelStore } from '../../store/panelStore';
import { useUIStore } from '../../store/uiStore';
import { useContextRefresh } from '../../hooks/useContextRefresh';
import { setCurrentAccountDB } from '../../db';
import type { Account } from '../../types';

// DEBUG: Log para verificar cambios de cuenta
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[AccountSwitcher]', ...args);

interface AccountSwitcherProps {
  compact?: boolean;
}

export function AccountSwitcher({ compact = false }: AccountSwitcherProps) {
  const {
    accounts,
    activeAccountId,
    loadAccounts,
    setActiveAccount,
    isLoading,
  } = useAccounts();

  const uiSelectedAccountId = useUIStore((state) => state.selectedAccountId);

  // Derivar activeAccount de forma directa para evitar problemas de reactividad
  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Hook centralizado para limpieza de contexto
  const { refreshAccountContext } = useContextRefresh();
  
  // Debug: Log para verificar avatar
  useEffect(() => {
    if (activeAccount) {
      log('Active account:', activeAccount.id, activeAccount.displayName);
      log('Active account profile:', activeAccount.profile);
      log('Active account avatarUrl:', activeAccount.profile?.avatarUrl);
    }
  }, [activeAccount]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (accounts.length === 0) return;

    const uiId = uiSelectedAccountId;
    const storeId = activeAccountId;
    const hasAccount = (id: string | null) => !!id && accounts.some((a) => a.id === id);

    if (hasAccount(uiId)) {
      if (uiId !== storeId) {
        setActiveAccount(uiId!);
      }
      setCurrentAccountDB(uiId!);
      return;
    }

    if (hasAccount(storeId)) {
      useUIStore.getState().setSelectedAccount(storeId);
      setCurrentAccountDB(storeId!);
      return;
    }

    const first = accounts[0];
    if (first) {
      setActiveAccount(first.id);
      useUIStore.getState().setSelectedAccount(first.id);
      setCurrentAccountDB(first.id);
    }
  }, [accounts, activeAccountId, setActiveAccount, uiSelectedAccountId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAccount = async (accountId: string) => {
    log('Selecting account:', accountId);
    
    // Evitar recarga si es la misma cuenta
    if (activeAccount?.id === accountId) {
      log('Account already selected, skipping refresh');
      setIsOpen(false);
      return;
    }

    try {
      // 1. Limpiar contexto anterior completamente
      log('Clearing previous context...');
      await refreshAccountContext(accountId, {
        clearConversations: true,
        clearLocalCache: true
      });
      
      // 2. Actualizar accountStore con nueva cuenta
      setActiveAccount(accountId);
      
      // 3. Sincronizar con uiStore para que las extensiones se recarguen
      useUIStore.getState().setSelectedAccount(accountId);
      
      log('Account changed successfully. activeAccountId:', accountId);
      log('uiStore.selectedAccountId:', useUIStore.getState().selectedAccountId);
      
    } catch (error) {
      console.error('[AccountSwitcher] Error switching account:', error);
      // En caso de error, mantener cuenta actual si existe
      if (activeAccount) {
        useUIStore.getState().setSelectedAccount(activeAccount.id);
      }
    }
    
    setIsOpen(false);
  };

  // Avatar/Initials
  const getAvatar = (account: Account | null) => {
    if (!account) return <span className="text-inverse font-bold">?</span>;
    
    if (account.profile?.avatarUrl) {
      return (
        <img 
          src={account.profile.avatarUrl} 
          className="w-full h-full rounded-full object-cover"
          alt={`Avatar de ${account.displayName}`}
        />
      );
    }
    
    const initials = account.displayName?.charAt(0).toUpperCase() || 
                    account.username?.charAt(0).toUpperCase() || '?';
    return <span className="text-inverse font-bold">{initials}</span>;
  };

  if (compact) {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-full bg-accent flex items-center justify-center overflow-hidden"
          title={activeAccount?.displayName || 'Seleccionar cuenta'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-inverse/30 border-t-inverse rounded-full animate-spin" />
          ) : (
            getAvatar(activeAccount)
          )}
        </button>

        {isOpen && (
          <AccountDropdown
            accounts={accounts}
            activeAccountId={activeAccount?.id || null}
            onSelect={handleSelectAccount}
            onClose={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated hover:bg-hover transition-colors w-full min-w-0"
      >
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center overflow-hidden">
          {getAvatar(activeAccount)}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-primary font-medium text-sm truncate">
            {activeAccount?.displayName || 'Sin cuenta'}
          </div>
          <div className="text-muted text-xs truncate">
            {activeAccount?.accountType === 'business' ? 'Negocio' : 'Personal'}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <AccountDropdown
          accounts={accounts}
          activeAccountId={activeAccount?.id || null}
          onSelect={handleSelectAccount}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Account Dropdown
// ============================================================================

interface AccountDropdownProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSelect: (accountId: string) => void;
  onClose: () => void;
}

function AccountDropdown({
  accounts,
  activeAccountId,
  onSelect,
  onClose,
}: AccountDropdownProps) {
  const personalAccounts = accounts.filter((a) => a.accountType === 'personal');
  const businessAccounts = accounts.filter((a) => a.accountType === 'business');

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-elevated border border-default rounded-lg shadow-lg z-50 overflow-hidden min-w-[200px]">
      {/* Personal Accounts */}
      {personalAccounts.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-medium text-muted uppercase tracking-wide">
            Personal
          </div>
          {personalAccounts.map((account) => (
            <AccountItem
              key={account.id}
              account={account}
              isActive={account.id === activeAccountId}
              onClick={() => onSelect(account.id)}
            />
          ))}
        </div>
      )}

      {/* Business Accounts */}
      {businessAccounts.length > 0 && (
        <div className="border-t border-subtle">
          <div className="px-3 py-2 text-xs font-medium text-muted uppercase tracking-wide">
            Negocios
          </div>
          {businessAccounts.map((account) => (
            <AccountItem
              key={account.id}
              account={account}
              isActive={account.id === activeAccountId}
              onClick={() => onSelect(account.id)}
            />
          ))}
        </div>
      )}

      {/* Add Account */}
      <div className="border-t border-subtle">
        <button
          className="w-full px-3 py-2 flex items-center gap-2 text-accent hover:bg-hover transition-colors"
          onClick={() => {
            // Abrir settings en la sección de cuentas
            const { setActiveActivity } = useUIStore.getState();
            const { openTab } = usePanelStore.getState();
            setActiveActivity('settings');
            openTab('settings', {
              type: 'settings',
              title: 'Nueva Cuenta',
              context: { section: 'accounts', action: 'create' },
              closable: true,
            });
            onClose();
          }}
        >
          <Plus size={16} />
          <span className="text-sm">Agregar cuenta</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Account Item
// ============================================================================

interface AccountItemProps {
  account: Account;
  isActive: boolean;
  onClick: () => void;
}

function AccountItem({ account, isActive, onClick }: AccountItemProps) {
  const Icon = account.accountType === 'business' ? Building2 : User;

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-hover transition-colors ${
        isActive ? 'bg-active' : ''
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center overflow-hidden">
        {getAvatar(account)}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-primary text-sm font-medium truncate">
          {account.displayName}
        </div>
        <div className="flex items-center gap-1 text-muted text-xs">
          <Icon size={10} />
          <span>{account.accountType === 'business' ? 'Negocio' : 'Personal'}</span>
        </div>
      </div>
      {isActive && <Check size={16} className="text-accent" />}
    </button>
  );
}

function getAvatar(account: Account) {
  if (account.profile?.avatarUrl) {
    return (
      <img 
        src={account.profile.avatarUrl} 
        className="w-full h-full rounded-full object-cover"
        alt={`Avatar de ${account.displayName}`}
      />
    );
  }
  
  const initials = account.displayName?.charAt(0).toUpperCase() || 
                  account.username?.charAt(0).toUpperCase() || '?';
  return <span className="text-inverse font-bold">{initials}</span>;
}
