/**
 * FC-812, FC-813, FC-814: AccountsSection
 * Sección de gestión de cuentas en Settings
 * Incluye: ConvertToBusiness, CreateBusinessAccount
 */

import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Building2,
  User,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAccounts } from '../../store/accountStore';
import { Button, Input, Card, DoubleConfirmationDeleteButton } from '../ui';
import { Avatar } from '../ui/Avatar';
import { AccountDeletionModal } from './AccountDeletionModal';
import { IdCopyable } from '../fluxcore/detail/IdCopyable';
import type { Account } from '../../types';

interface AccountsSectionProps {
  onBack?: () => void;
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
    loadAccounts,
  } = useAccounts();

  const [modalAccount, setModalAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (!accounts.length && !isLoading) {
      loadAccounts().catch((err) => {
        console.warn('[AccountsSection] Failed to load accounts:', err);
      });
    }
  }, [accounts.length, isLoading, loadAccounts]);

  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);

  const handleOpenDeletionModal = (account: Account) => {
    setModalAccount(account);
    setIsDeletionModalOpen(true);
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [accountToConvert, setAccountToConvert] = useState<Account | null>(null);

  const personalAccounts = accounts.filter((a) => a.accountType === 'personal');
  const businessAccounts = accounts.filter((a) => a.accountType === 'business');

  const handleConvertToBusiness = (account: Account) => {
    setAccountToConvert(account);
    setShowConvertConfirm(true);
  };

  const handleConfirmConvert = async () => {
    if (!accountToConvert) return;
    await convertToBusiness(accountToConvert.id);
    setShowConvertConfirm(false);
    setAccountToConvert(null);
  };

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <button
          onClick={onBack}
          className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors flex-shrink-0"
        >
          <ChevronRight size={20} className="rotate-180" />
          <span className="font-medium">Cuentas</span>
        </button>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm flex-shrink-0">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={clearError} className="ml-auto text-error/70 hover:text-error">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Active Account */}
            {activeAccount && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeAccount.profile?.avatarUrl}
                    name={activeAccount.displayName || activeAccount.alias}
                    size="xl"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-primary font-semibold truncate">{activeAccount.displayName}</div>
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
                    <div className="mt-1">
                      <IdCopyable id={activeAccount.id} prefix="" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-accent/10 text-accent text-xs rounded font-medium">Activa</div>
                    <DoubleConfirmationDeleteButton
                      onConfirm={() => handleOpenDeletionModal(activeAccount)}
                      className="h-8"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Convert to Business Confirmation Modal */}
            {showConvertConfirm && accountToConvert && (
              <Card variant="bordered" className="p-4 bg-warning/5 border-warning/20">
                <div className="flex items-start gap-3">
                  <Building2 size={24} className="text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-primary font-semibold">Convertir a cuenta de negocio</h3>
                    <p className="text-sm text-secondary mt-1">
                      ¿Convertir "{accountToConvert.displayName}" a cuenta de negocio? Esta acción activará funciones empresariales como colaboradores, permisos avanzados y más.
                    </p>
                    <p className="text-sm text-warning mt-2">Esta acción no se puede deshacer.</p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleConfirmConvert}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowConvertConfirm(false)}>
                        Cancelar
                      </Button>
                    </div>
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
                  <AccountCard
                    key={account.id}
                    account={account}
                    isActive={account.id === activeAccount?.id}
                    onDelete={() => handleOpenDeletionModal(account)}
                    onConvertToBusiness={() => handleConvertToBusiness(account)}
                  />
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
                    <AccountCard
                      key={account.id}
                      account={account}
                      isActive={account.id === activeAccount?.id}
                      onDelete={() => handleOpenDeletionModal(account)}
                    />
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
      </div>

      {modalAccount && isDeletionModalOpen && (
        <AccountDeletionModal
          account={modalAccount}
          sessionAccountId={activeAccount?.id}
          onClose={() => {
            setIsDeletionModalOpen(false);
            setModalAccount(null);
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// Account Card
// ============================================================================

interface AccountCardProps {
  account: Account;
  isActive: boolean;
  onDelete?: () => void;
  onConvertToBusiness?: () => void;
}

function AccountCard({ account, isActive, onDelete, onConvertToBusiness }: AccountCardProps) {
  const Icon = account.accountType === 'business' ? Building2 : User;
  const avatarUrl = account.profile?.avatarUrl;
  const displayName = account.displayName || account.alias;

  return (
    <Card className={`p-3 ${isActive ? 'ring-1 ring-accent' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar
          src={avatarUrl}
          name={displayName}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="text-primary font-medium truncate">{account.displayName}</div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Icon size={12} />
            <span>@{account.alias}</span>
          </div>
          <div className="mt-1">
            <IdCopyable id={account.id} prefix="" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && <Check size={16} className="text-accent" />}
          {account.accountType === 'personal' && onConvertToBusiness && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onConvertToBusiness}
              className="text-xs"
            >
              Convertir
            </Button>
          )}
          {onDelete && (
            <DoubleConfirmationDeleteButton
              onConfirm={onDelete}
              className="h-8"
            />
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Create Business Account Form (FC-814)
// ============================================================================

interface CreateBusinessAccountFormProps {
  onCancel: () => void;
  onCreate: (data: { alias: string; displayName: string }) => Promise<void>;
  isLoading: boolean;
}

function CreateBusinessAccountForm({
  onCancel,
  onCreate,
  isLoading,
}: CreateBusinessAccountFormProps) {
  const [alias, setAlias] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<{ alias?: string; displayName?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!alias || alias.length < 3) {
      newErrors.alias = 'Mínimo 3 caracteres';
    } else if (!/^[a-z][a-z0-9_-]{2,29}$/.test(alias)) {
      newErrors.alias = 'Debe empezar con letra. Solo minúsculas, números, _ y -';
    }

    if (!displayName || displayName.length < 2) {
      newErrors.displayName = 'Mínimo 2 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) {
      await onCreate({ alias, displayName });
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
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Mi Empresa"
            error={errors.displayName}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-primary">Alias</label>
          <Input
            type="text"
            value={alias}
            onChange={(event) => setAlias(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="mi-empresa"
            error={errors.alias}
            className="mt-1"
          />
          <p className="text-xs text-muted mt-1">
            Este será tu identificador único. Ej: @mi-empresa
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Crear cuenta'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
