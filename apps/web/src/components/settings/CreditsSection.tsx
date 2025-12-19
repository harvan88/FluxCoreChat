import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Button, Card, Input } from '../ui';

type AdminAccountRow = {
  id: string;
  username: string;
  displayName: string;
  accountType: 'personal' | 'business';
  balance: number;
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

  return (
    <div className="flex-1 overflow-y-auto">
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <span className="rotate-180">›</span>
        <span className="font-medium">Créditos</span>
      </button>

      <div className="p-4 space-y-4">
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
      </div>
    </div>
  );
}
