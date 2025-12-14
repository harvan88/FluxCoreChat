import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Clock,
  Link2,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { useAccounts } from '../../store/accountStore';
import { useAutomation, type AutomationTrigger, type AutomationMode } from '../../hooks/useAutomation';
import {
  Button,
  Card,
  Select,
  type SelectOption,
  Input,
  Table,
  type Column,
  Badge,
} from '../ui';

interface AutomationSectionProps {
  onBack: () => void;
}

type TriggerFormType = AutomationTrigger['type'];

type TriggerTableRow = {
  id: string;
  ruleId: string;
  triggerIndex: number;
  type: TriggerFormType;
  value?: string;
  metadata?: Record<string, unknown> | null;
  mode: string;
  scope: 'account' | 'relationship';
  relationshipId?: string | null;
  updatedAt: string;
};

const triggerTypeOptions: SelectOption[] = [
  { value: 'message_received', label: 'Mensaje entrante', icon: <Hash size={16} /> },
  { value: 'keyword', label: 'Keyword', icon: <Hash size={16} /> },
  { value: 'schedule', label: 'Horario (cron)', icon: <Clock size={16} /> },
  { value: 'webhook', label: 'Webhook', icon: <Link2 size={16} /> },
];

const modeOptions: SelectOption[] = [
  { value: 'automatic', label: 'Automático' },
  { value: 'supervised', label: 'Supervisado' },
  { value: 'disabled', label: 'Deshabilitado' },
];

const formatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return formatter.format(date);
};

export function AutomationSection({ onBack }: AutomationSectionProps) {
  const {
    activeAccount,
    activeAccountId,
    isLoading: isAccountsLoading,
    loadAccounts,
  } = useAccounts();

  const {
    rules,
    isLoading,
    error,
    registerTrigger,
    updateRule,
    loadRules,
    resetError,
  } = useAutomation(activeAccountId ?? null);

  const [isCreating, setIsCreating] = useState(false);
  const [formType, setFormType] = useState<TriggerFormType>('keyword');
  const [formValue, setFormValue] = useState('');
  const [formMode, setFormMode] = useState<AutomationMode>('automatic');
  const [cronTimezone, setCronTimezone] = useState('UTC');
  const [cronMatch, setCronMatch] = useState<'minute' | 'cron'>('cron');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastWebhookToken, setLastWebhookToken] = useState<string | null>(null);

  useEffect(() => {
    if (!activeAccountId) {
      void loadAccounts();
    }
  }, [activeAccountId, loadAccounts]);

  useEffect(() => {
    if (activeAccountId) {
      void loadRules();
    }
  }, [activeAccountId, loadRules]);

  const triggerRows = useMemo<TriggerTableRow[]>(() => {
    return rules.flatMap((rule) => {
      const configTriggers = rule.config?.triggers || [];
      return configTriggers.map((trigger, index) => ({
        id: `${rule.id}-${index}`,
        ruleId: rule.id,
        triggerIndex: index,
        type: trigger.type,
        value: trigger.value,
        metadata: trigger.metadata ?? null,
        mode: rule.mode,
        scope: rule.relationshipId ? 'relationship' : 'account',
        relationshipId: rule.relationshipId,
        updatedAt: rule.updatedAt,
      }));
    });
  }, [rules]);

  const columns: Column<TriggerTableRow>[] = [
    {
      id: 'type',
      header: 'Tipo',
      accessor: (row) => {
        switch (row.type) {
          case 'message_received':
            return 'Mensaje entrante';
          case 'keyword':
            return `Keyword${row.value ? `: ${row.value}` : ''}`;
          case 'schedule':
            return `Cron: ${row.value ?? ''}`;
          case 'webhook':
            return 'Webhook';
          default:
            return row.type;
        }
      },
    },
    {
      id: 'details',
      header: 'Detalles',
      accessor: (row) => {
        if (row.type === 'webhook') {
          return row.value ? (
            <Badge variant="neutral" badgeStyle="outline" size="sm">
              {row.value}
            </Badge>
          ) : 'Token generado automáticamente';
        }

        if (row.type === 'schedule') {
          const metadata = (row.metadata as { timezone?: unknown } | null) || null;
          const timezone = metadata?.timezone && typeof metadata.timezone === 'string'
            ? metadata.timezone
            : undefined;
          return (
            <div className="flex flex-col gap-1">
              <span>{row.value}</span>
              {timezone && (
                <span className="text-xs text-muted">Zona: {timezone}</span>
              )}
            </div>
          );
        }

        return row.value || '—';
      },
    },
    {
      id: 'mode',
      header: 'Modo',
      accessor: (row) => row.mode,
    },
    {
      id: 'scope',
      header: 'Ámbito',
      accessor: (row) => {
        if (row.scope === 'account') {
          return 'Cuenta';
        }

        if (row.relationshipId) {
          return `Relación ${row.relationshipId.slice(0, 6)}…`;
        }

        return 'Relación';
      },
    },
    {
      id: 'updatedAt',
      header: 'Actualizado',
      accessor: (row) => formatTimestamp(row.updatedAt),
    },
  ];

  const handleResetForm = () => {
    setFormType('keyword');
    setFormValue('');
    setFormMode('automatic');
    setCronTimezone('UTC');
    setCronMatch('cron');
    setFormError(null);
    setLastWebhookToken(null);
  };

  const validateForm = () => {
    if (!activeAccountId) {
      setFormError('Selecciona una cuenta activa para configurar triggers.');
      return false;
    }

    if (formType === 'keyword' && !formValue.trim()) {
      setFormError('Debes ingresar una keyword.');
      return false;
    }

    if (formType === 'schedule') {
      if (!formValue.trim()) {
        setFormError('Debes ingresar una expresión cron.');
        return false;
      }
      // Validación simple de cron: al menos 5 segmentos
      if (cronMatch === 'cron' && formValue.trim().split(' ').length < 5) {
        setFormError('La expresión cron parece incompleta.');
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload: AutomationTrigger = {
      type: formType,
    };

    if (formType === 'keyword') {
      payload.value = formValue.trim();
    }

    if (formType === 'schedule') {
      payload.value = formValue.trim();
      payload.metadata = {
        match: cronMatch,
        timezone: cronTimezone,
      };
    }

    setIsSubmitting(true);
    try {
      const result = await registerTrigger(payload, {
        mode: formMode,
      });

      if (result?.trigger.type === 'webhook' && result.trigger.value) {
        setLastWebhookToken(result.trigger.value);
      }

      handleResetForm();
      setIsCreating(false);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row: TriggerTableRow) => {
    const rule = rules.find((r) => r.id === row.ruleId);
    if (!rule) {
      return;
    }

    const triggers = [...(rule.config?.triggers || [])];
    triggers.splice(row.triggerIndex, 1);

    await updateRule(row.ruleId, {
      mode: rule.mode as AutomationMode,
      enabled: rule.enabled,
      config: rule.config
        ? {
            ...rule.config,
            triggers,
          }
        : { triggers },
    });
  };

  const renderFormFields = () => {
    switch (formType) {
      case 'keyword':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Keyword</label>
            <Input
              value={formValue}
              onChange={(event) => setFormValue(event.target.value)}
              placeholder="Ej. urgente|prioridad"
            />
            <p className="text-xs text-muted">
              Puedes usar expresiones regulares. El trigger se activa cuando el mensaje recibido coincide.
            </p>
          </div>
        );
      case 'schedule':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Expresión cron</label>
              <Input
                value={formValue}
                onChange={(event) => setFormValue(event.target.value)}
                placeholder="*/5 * * * *"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-primary">Modo de coincidencia</label>
                <Select
                  value={cronMatch}
                  onChange={(value) => setCronMatch(value as 'minute' | 'cron')}
                  options={[
                    { value: 'cron', label: 'Expresión completa' },
                    { value: 'minute', label: 'Coincidencia por minuto' },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-primary">Zona horaria</label>
                <Input
                  value={cronTimezone}
                  onChange={(event) => setCronTimezone(event.target.value)}
                  placeholder="UTC"
                />
              </div>
            </div>
          </div>
        );
      case 'webhook':
        return (
          <div className="space-y-2">
            <p className="text-sm text-secondary">
              Se generará un token secreto automáticamente. Podrás copiar el endpoint una vez creado.
            </p>
          </div>
        );
      case 'message_received':
      default:
        return (
          <p className="text-sm text-secondary">
            El trigger se activará en cualquier mensaje entrante de clientes.
          </p>
        );
    }
  };

  if (!activeAccountId && !isAccountsLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
        >
          <ChevronRight size={20} className="rotate-180" />
          <span className="font-medium">Automatización</span>
        </button>

        <div className="p-8 text-center space-y-3">
          <p className="text-muted">No se encontró una cuenta activa. Asegúrate de seleccionar o crear una cuenta para configurar automatizaciones.</p>
          <Button variant="secondary" onClick={() => void loadAccounts()}>
            Recargar cuentas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Automatización</span>
      </button>

      <div className="p-4 space-y-6">
        {error && (
          <Card variant="bordered" className="p-4 border-error/40 bg-error/5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-error mt-0.5" />
              <div className="flex-1 text-sm text-error">
                {error}
              </div>
              <Button variant="ghost" size="sm" onClick={resetError}>
                Cerrar
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-primary font-semibold">Triggers configurados</div>
            <div className="text-sm text-muted">
              Cuenta: {activeAccount?.displayName || 'Sin nombre'}
            </div>
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={() => {
            handleResetForm();
            setIsCreating(true);
          }}>
            Nuevo trigger
          </Button>
        </Card>

        <Table
          columns={[
            ...columns,
            {
              id: 'actions',
              header: 'Acciones',
              accessor: (row) => (
                <div className="flex items-center gap-2">
                  {row.type === 'webhook' && row.value && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Copy size={14} />}
                      onClick={async (event) => {
                        event.stopPropagation();
                        const endpoint = `${window.location.origin}/automation/webhook/${row.value}`;
                        if (navigator.clipboard) {
                          await navigator.clipboard.writeText(endpoint);
                        }
                      }}
                    >
                      Copiar endpoint
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(row);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              ),
            },
          ]}
          data={triggerRows}
          getRowKey={(row) => row.id}
          loading={isLoading}
          emptyMessage="Aún no hay triggers configurados"
        />

        {isCreating && (
          <Card variant="bordered" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-primary font-semibold">Nuevo trigger</h3>
                <p className="text-sm text-muted">Configura las condiciones que activarán la automatización.</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Tipo de trigger"
                  value={formType}
                  onChange={(value) => {
                    if (Array.isArray(value)) return;
                    setFormType(value as TriggerFormType);
                  }}
                  options={triggerTypeOptions}
                />
                <Select
                  label="Modo de automatización"
                  value={formMode}
                  onChange={(value) => {
                    if (Array.isArray(value)) return;
                    setFormMode(value as AutomationMode);
                  }}
                  options={modeOptions}
                />
              </div>

              {renderFormFields()}

              {formError && <p className="text-sm text-error">{formError}</p>}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    handleResetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  Crear trigger
                </Button>
              </div>
            </form>

            {lastWebhookToken && (
              <div className="mt-4 p-3 rounded-lg bg-elevated border border-subtle">
                <p className="text-sm text-primary font-medium mb-2">Webhook generado</p>
                <div className="flex flex-col gap-2 text-sm">
                  <code className="bg-surface rounded px-3 py-2 text-accent text-xs">
                    POST {`${window.location.origin}/automation/webhook/${lastWebhookToken}`}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Copy size={14} />}
                    onClick={async () => {
                      const command = `POST ${window.location.origin}/automation/webhook/${lastWebhookToken}`;
                      if (navigator.clipboard) {
                        await navigator.clipboard.writeText(command);
                      }
                    }}
                  >
                    Copiar comando
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

