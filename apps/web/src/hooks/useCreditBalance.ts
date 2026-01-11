import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useCreditBalance(accountId: string | undefined) {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    let isMounted = true;
    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getCreditsBalance(accountId);
        if (!isMounted) return;
        
        if (res.success && res.data) {
          setBalance(res.data.balance);
        } else {
          setError(res.error || 'Error fetching balance');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
    return () => { isMounted = false; };
  }, [accountId]);

  return { balance, isLoading, error };
}
