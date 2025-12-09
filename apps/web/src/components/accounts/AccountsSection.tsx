/**
 * FC-812, FC-813, FC-814: AccountsSection
 * Sección de gestión de cuentas en Settings
 * Incluye: ConvertToBusiness, CreateBusinessAccount
 */

import { useState } from 'react';
import {
  ChevronRight,
  Building2,
  User,
  Plus,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAccounts } from '../../store/accountStore';
import { Button, Input, Card } from '../ui';
import type { Account } from '../../types';

interface AccountsSectionProps {
  onBack: () => void;
}

export function AccountsSection({ onBack }: AccountsSectionProps) {
  const {
    accounts,
    activeAccount,
    isLoading,
    error,
    createAccount,
    convertToBusiness,
    clearError,
  } = useAccounts();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const personalAccounts = accounts.filter((a) => a.accountType === 'personal');
  const businessAccounts = accounts.filter((a) => a.accountType === 'business');

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Cuentas</span>
      </button>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={clearError} className="ml-auto text-error/70 hover:text-error">
            ×
          </button>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Active Account */}
        {activeAccount && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-inverse font-bold text-lg">
                {activeAccount.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="text-primary font-semibold">{activeAccount.displayName}</div>
                <div className="flex items-center gap-1 text-sm text-secondary">
                  {activeAccount.accountType === 'business' ? (
                    <>
                      <Building2 size={14} />
                      <span>Cuenta de negocio</span>
                    </>
                  ) : (
                    <>
                      <User size={14} />
                      <span>Cuenta personal</span>
                    </>
                  )}
                </div>
              </div>
              <div className="px-2 py-1 bg-accent/10 text-accent text-xs rounded font-medium">
                Activa
              </div>
            </div>
          </Card>
        )}

        {/* Convert to Business (FC-813) */}
        {activeAccount?.accountType === 'personal' && (
          <Card variant="bordered" className="p-4">
            <div className="flex items-start gap-3">
              <Building2 size={24} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-primary font-semibold">Convertir a cuenta de negocio</h3>
                <p className="text-sm text-secondary mt-1">
                  Activa funciones empresariales como colaboradores, permisos avanzados y más.
                </p>
                {showConvertConfirm ? (
                  <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning mb-3">
                      ¿Estás seguro? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          await convertToBusiness(activeAccount.id);
                          setShowConvertConfirm(false);
                        }}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConvertConfirm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowConvertConfirm(true)}
                  >
                    Convertir cuenta
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Personal Accounts */}
        <div>
          <h3 className="text-sm font-medium text-secondary mb-3 flex items-center gap-2">
            <User size={16} />
            Cuentas personales ({personalAccounts.length})
          </h3>
          <div className="space-y-2">
            {personalAccounts.map((account) => (
              <AccountCard key={account.id} account={account} isActive={account.id === activeAccount?.id} />
            ))}
          </div>
        </div>

        {/* Business Accounts */}
        <div>
          <h3 className="text-sm font-medium text-secondary mb-3 flex items-center gap-2">
            <Building2 size={16} />
            Cuentas de negocio ({businessAccounts.length})
          </h3>
          {businessAccounts.length > 0 ? (
            <div className="space-y-2">
              {businessAccounts.map((account) => (
                <AccountCard key={account.id} account={account} isActive={account.id === activeAccount?.id} />
              ))}
            </div>
          ) : (
            <Card variant="bordered" className="p-4 text-center">
              <p className="text-muted text-sm">No tienes cuentas de negocio</p>
            </Card>
          )}
        </div>

        {/* Create Business Account (FC-814) */}
        <Card variant="bordered" className="p-4">
          {showCreateForm ? (
            <CreateBusinessAccountForm
              onCancel={() => setShowCreateForm(false)}
              onCreate={async (data) => {
                const result = await createAccount({
                  ...data,
                  accountType: 'business',
                });
                if (result) {
                  setShowCreateForm(false);
                }
              }}
              isLoading={isLoading}
            />
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-accent hover:text-accent/80 transition-colors"
            >
              <Plus size={18} />
              <span className="font-medium">Crear cuenta de negocio</span>
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Account Card
// ============================================================================

interface AccountCardProps {
  account: Account;
  isActive: boolean;
}

function AccountCard({ account, isActive }: AccountCardProps) {
  const Icon = account.accountType === 'business' ? Building2 : User;

  return (
    <Card className={`p-3 ${isActive ? 'ring-1 ring-accent' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-primary font-bold">
          {account.displayName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-primary font-medium truncate">{account.displayName}</div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Icon size={12} />
            <span>@{account.username}</span>
          </div>
        </div>
        {isActive && <Check size={16} className="text-accent" />}
      </div>
    </Card>
  );
}

// ============================================================================
// Create Business Account Form (FC-814)
// ============================================================================

interface CreateBusinessAccountFormProps {
  onCancel: () => void;
  onCreate: (data: { username: string; displayName: string }) => Promise<void>;
  isLoading: boolean;
}

function CreateBusinessAccountForm({
  onCancel,
  onCreate,
  isLoading,
}: CreateBusinessAccountFormProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<{ username?: string; displayName?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!username || username.length < 3) {
      newErrors.username = 'Mínimo 3 caracteres';
    } else if (!/^[a-z0-9_]+$/.test(username)) {
      newErrors.username = 'Solo letras minúsculas, números y _';
    }
    
    if (!displayName || displayName.length < 2) {
      newErrors.displayName = 'Mínimo 2 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onCreate({ username, displayName });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-primary font-semibold flex items-center gap-2">
        <Building2 size={18} />
        Nueva cuenta de negocio
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-primary">Nombre del negocio</label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mi Empresa"
            error={errors.displayName}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-primary">Usuario (alias)</label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="mi_empresa"
            error={errors.username}
            className="mt-1"
          />
          <p className="text-xs text-muted mt-1">
            Este será tu identificador único. Ej: @mi_empresa
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            'Crear cuenta'
          )}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
