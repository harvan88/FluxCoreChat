/**
 * FC-811: AccountSwitcher
 * Selector de cuenta en el header/ActivityBar
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Building2, User, Check } from 'lucide-react';
import { useAccounts } from '../../store/accountStore';
import { usePanelStore } from '../../store/panelStore';
import { useUIStore } from '../../store/uiStore';
import type { Account } from '../../types';

interface AccountSwitcherProps {
  compact?: boolean;
}

export function AccountSwitcher({ compact = false }: AccountSwitcherProps) {
  const {
    accounts,
    activeAccount,
    loadAccounts,
    setActiveAccount,
    isLoading,
  } = useAccounts();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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

  const handleSelectAccount = (accountId: string) => {
    setActiveAccount(accountId);
    setIsOpen(false);
  };

  // Avatar/Initials
  const getInitials = (account: Account | null) => {
    if (!account) return '?';
    return account.displayName?.charAt(0).toUpperCase() || account.username?.charAt(0).toUpperCase() || '?';
  };

  if (compact) {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-inverse font-bold hover:ring-2 hover:ring-accent/50 transition-all"
          title={activeAccount?.displayName || 'Seleccionar cuenta'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-inverse/30 border-t-inverse rounded-full animate-spin" />
          ) : (
            getInitials(activeAccount)
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated hover:bg-hover transition-colors w-full"
      >
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-inverse font-bold text-sm">
          {getInitials(activeAccount)}
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
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-inverse font-bold text-sm">
        {account.displayName?.charAt(0).toUpperCase() || '?'}
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
