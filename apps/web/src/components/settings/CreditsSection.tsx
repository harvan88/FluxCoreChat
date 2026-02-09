import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Button, Card, Input, Switch } from '../ui';

type AdminAccountRow = {
  id: string;
  username: string;
  displayName: string;
  accountType: 'personal' | 'business';
  balance: number;
};

type PolicyRow = {
  id: string;
  featureKey: string;
  engine: string;
  model: string;
  costCredits: number;
  tokenBudget: number;
  durationHours: number;
  active: boolean;
};

interface CreditsSectionProps {
  onBack: () => void;
}

export function CreditsSection({ onBack }: CreditsSectionProps) {
  const { user } = useAuthStore();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminAccountRow[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () => results.find((r) => r.id === selectedAccountId) || null,
    [results, selectedAccountId]
  );

  const [grantAmount, setGrantAmount] = useState('5');
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantOk, setGrantOk] = useState(false);

  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);

  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState({
    featureKey: 'ai_session',
    engine: 'openai_chat',
    model: 'gpt-4o-mini-2024-07-18',
    costCredits: '1',
    tokenBudget: '120000',
    durationHours: '24',
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const runSearch = useCallback(async (qRaw: string) => {
    setGrantOk(false);
    setGrantError(null);
    setSearchError(null);

    const q = qRaw.trim();
    if (q.length < 2) {
      setResults([]);
      setSelectedAccountId(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.creditsAdminSearch(q);
      if (!res.success) {
        setSearchError(res.error || res.message || 'Search failed');
        setResults([]);
        setSelectedAccountId(null);
        return;
      }

      const rows = Array.isArray(res.data) ? (res.data as any as AdminAccountRow[]) : [];
      setResults(rows);
      setSelectedAccountId(rows[0]?.id ?? null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(query);
    }, 350);

    return () => clearTimeout(t);
  }, [query, runSearch]);

  const handleGrant = async () => {
    setGrantOk(false);
    setGrantError(null);

    if (!selectedAccount) {
      setGrantError('Selecciona una cuenta.');
      return;
    }

    const amount = Number(grantAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setGrantError('Monto inválido.');
      return;
    }

    setIsGranting(true);
    try {
      const res = await api.creditsAdminGrant({
        accountId: selectedAccount.id,
        amount,
      });

      if (!res.success) {
        setGrantError(res.error || res.message || 'Grant failed');
        return;
      }

      const newBalance = res.data?.balance;
      setResults((prev) =>
        prev.map((r) => (r.id === selectedAccount.id ? { ...r, balance: typeof newBalance === 'number' ? newBalance : r.balance } : r))
      );
      setGrantOk(true);
    } finally {
      setIsGranting(false);
    }
  };

  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    setPoliciesError(null);
    try {
      const res = await api.creditsAdminListPolicies();
      if (!res.success) {
        setPoliciesError(res.error || res.message || 'No se pudieron cargar los planes.');
        setPolicies([]);
        return;
      }
      const rows = Array.isArray(res.data) ? (res.data as any as PolicyRow[]) : [];
      setPolicies(rows);
    } catch (error: any) {
      setPoliciesError(error?.message || 'Error desconocido.');
      setPolicies([]);
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const resetPolicyForm = () => {
    setEditingPolicyId(null);
    setPolicyForm({
      featureKey: 'ai_session',
      engine: 'openai_chat',
      model: 'gpt-4o-mini-2024-07-18',
      costCredits: '1',
      tokenBudget: '120000',
      durationHours: '24',
    });
    setPolicySuccess(null);
    setPolicyError(null);
  };

  const handleEditPolicy = (policy: PolicyRow) => {
    setEditingPolicyId(policy.id);
    setPolicyForm({
      featureKey: policy.featureKey,
      engine: policy.engine,
      model: policy.model,
      costCredits: String(policy.costCredits),
      tokenBudget: String(policy.tokenBudget),
      durationHours: String(policy.durationHours),
    });
    setPolicySuccess(null);
    setPolicyError(null);
  };

  const handlePolicySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPolicySaving(true);
    setPolicySuccess(null);
    setPolicyError(null);

    const payload = {
      featureKey: policyForm.featureKey.trim(),
      engine: policyForm.engine.trim(),
      model: policyForm.model.trim(),
      costCredits: Number(policyForm.costCredits),
      tokenBudget: Number(policyForm.tokenBudget),
      durationHours: Number(policyForm.durationHours),
    };

    if (!payload.featureKey || !payload.engine || !payload.model) {
      setPolicyError('Completá los campos obligatorios.');
      setPolicySaving(false);
      return;
    }

    if (!Number.isFinite(payload.costCredits) || payload.costCredits <= 0) {
      setPolicyError('Costo inválido.');
      setPolicySaving(false);
      return;
    }

    if (!Number.isFinite(payload.tokenBudget) || payload.tokenBudget <= 0) {
      setPolicyError('Token budget inválido.');
      setPolicySaving(false);
      return;
    }

    if (!Number.isFinite(payload.durationHours) || payload.durationHours <= 0) {
      setPolicyError('Duración inválida.');
      setPolicySaving(false);
      return;
    }

    try {
      const response = editingPolicyId
        ? await api.creditsAdminUpdatePolicy(editingPolicyId, payload)
        : await api.creditsAdminCreatePolicy(payload);

      if (!response.success) {
        setPolicyError(response.error || response.message || 'No se pudo guardar el plan.');
        return;
      }

      setPolicySuccess(editingPolicyId ? 'Plan actualizado.' : 'Plan creado.');
      await loadPolicies();
      resetPolicyForm();
    } catch (error: any) {
      setPolicyError(error?.message || 'Ocurrió un error inesperado.');
    } finally {
      setPolicySaving(false);
    }
  };

  const handleTogglePolicy = async (policy: PolicyRow, nextValue: boolean) => {
    try {
      await api.creditsAdminTogglePolicy(policy.id, nextValue);
      await loadPolicies();
    } catch (error: any) {
      setPoliciesError(error?.message || 'No se pudo actualizar el estado del plan.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <span className="rotate-180">›</span>
        <span className="font-medium">Créditos</span>
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Zap size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-primary font-semibold">Admin de créditos (dev)</div>
              <div className="text-sm text-secondary mt-1">
                Logueado como: <span className="text-primary">{user?.email || '—'}</span>
              </div>
              <div className="text-xs text-muted mt-1">
                Si no sos admin, estos endpoints devolverán 403.
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <Input
            variant="search"
            label="Buscar cuenta"
            placeholder="Email o @username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void runSearch(query);
              }}
              loading={isSearching}
            >
              Buscar
            </Button>
          </div>

          {searchError && (
            <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
              <AlertCircle size={16} />
              <span className="min-w-0 break-words">{searchError}</span>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedAccountId(r.id)}
                className={
                  'w-full text-left p-3 rounded-lg border transition-colors ' +
                  (r.id === selectedAccountId
                    ? 'border-accent/40 bg-accent/10'
                    : 'border-subtle hover:bg-hover')
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-primary font-medium truncate">{r.displayName}</div>
                    <div className="text-xs text-muted truncate">@{r.username} · {r.accountType}</div>
                  </div>
                  <div className="flex-shrink-0 text-sm text-primary">{r.balance}</div>
                </div>
              </button>
            ))}

            {!isSearching && results.length === 0 && query.trim().length >= 2 && !searchError && (
              <div className="text-sm text-muted">Sin resultados.</div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-primary font-semibold">Otorgar créditos</div>
          <div className="text-sm text-secondary mt-1">
            Cuenta seleccionada: <span className="text-primary">{selectedAccount ? selectedAccount.displayName : '—'}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input
              variant="number"
              label="Monto"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              min={1}
            />
            <div className="flex items-end">
              <Button fullWidth onClick={handleGrant} loading={isGranting} disabled={!selectedAccount}>
                Otorgar
              </Button>
            </div>
          </div>

          {grantError && (
            <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
              <AlertCircle size={16} />
              <span className="min-w-0 break-words">{grantError}</span>
            </div>
          )}

          {grantOk && (
            <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2 text-accent text-sm">
              <Check size={16} />
              <span>Créditos otorgados.</span>
            </div>
          )}

          {isGranting && (
            <div className="mt-3 text-xs text-muted flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Aplicando cambios...
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-primary font-semibold">Planes de IA</div>
              <div className="text-sm text-secondary mt-1">
                Gestioná los proveedores/modelos disponibles y sus condiciones.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadPolicies} loading={policiesLoading}>
              Refrescar
            </Button>
          </div>

          {policiesError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="min-w-0 break-words">{policiesError}</span>
            </div>
          )}

          <div className="border border-subtle rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 gap-2 bg-surface py-2 px-3 text-xs font-semibold text-secondary">
              <span>Feature</span>
              <span>Engine</span>
              <span>Modelo</span>
              <span>Créditos</span>
              <span>Tokens</span>
              <span>Duración (h)</span>
              <span>Activo</span>
            </div>
            {policies.length === 0 && !policiesLoading && (
              <div className="p-3 text-sm text-muted">Sin planes cargados.</div>
            )}
            {policies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => handleEditPolicy(policy)}
                className="grid grid-cols-7 gap-2 items-center py-2 px-3 text-sm w-full text-left hover:bg-hover border-t border-subtle"
              >
                <span className="truncate text-primary">{policy.featureKey}</span>
                <span className="truncate text-primary">{policy.engine}</span>
                <span className="truncate text-primary">{policy.model}</span>
                <span className="text-primary">{policy.costCredits}</span>
                <span className="text-primary">{policy.tokenBudget}</span>
                <span className="text-primary">{policy.durationHours}</span>
                <span className="flex items-center gap-2">
                  <Switch checked={policy.active} onCheckedChange={(v) => handleTogglePolicy(policy, v)} />
                  <span className={`text-xs ${policy.active ? 'text-accent' : 'text-muted'}`}>
                    {policy.active ? 'On' : 'Off'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <form className="space-y-3" onSubmit={handlePolicySubmit}>
            <div className="text-sm text-secondary">
              {editingPolicyId ? 'Editando plan existente' : 'Crear un plan nuevo'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input
                label="Feature"
                value={policyForm.featureKey}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, featureKey: e.target.value }))}
                required
              />
              <Input
                label="Engine"
                value={policyForm.engine}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, engine: e.target.value }))}
                required
              />
              <Input
                label="Modelo"
                className="md:col-span-1 col-span-2"
                value={policyForm.model}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, model: e.target.value }))}
                required
              />
              <Input
                label="Créditos"
                variant="number"
                value={policyForm.costCredits}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, costCredits: e.target.value }))}
                min={1}
                required
              />
              <Input
                label="Token budget"
                variant="number"
                value={policyForm.tokenBudget}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, tokenBudget: e.target.value }))}
                min={1}
                required
              />
              <Input
                label="Duración (horas)"
                variant="number"
                value={policyForm.durationHours}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, durationHours: e.target.value }))}
                min={1}
                required
              />
            </div>

            {policyError && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span className="min-w-0 break-words">{policyError}</span>
              </div>
            )}

            {policySuccess && (
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg text-accent text-sm flex items-center gap-2">
                <Check size={16} />
                <span>{policySuccess}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={policySaving}>
                {editingPolicyId ? 'Guardar cambios' : 'Crear plan'}
              </Button>
              {editingPolicyId && (
                <Button type="button" variant="secondary" onClick={resetPolicyForm} disabled={policySaving}>
                  Cancelar edición
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
