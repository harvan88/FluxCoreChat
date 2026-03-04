import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface KernelStatus {
  kernel: {
    total_signals: number;
    unique_fact_types: number;
    last_signal_at: string | null;
    signals_last_hour: number;
    signals_last_24h: number;
    status: 'active' | 'inactive';
  };
  outbox: {
    total: number;
    certified: number;
    pending: number;
    last_outbox_at: string | null;
  };
  sessions: {
    total: number;
    active: number;
    pending: number;
    invalidated: number;
    last_activity: string | null;
  };
  recent_signal_types: Array<{
    fact_type: string;
    count: number;
    last_seen: string;
  }>;
  projectors: Array<{
    name: string;
    is_healthy: boolean;
    last_sequence_number: number;
    error_count: number;
  }>;
}

interface UseKernelStatusResult {
  status: KernelStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useKernelStatus(): UseKernelStatusResult {
  const [status, setStatus] = useState<KernelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getKernelStatusOverview();
      if (response.success && response.data) {
        setStatus(response.data);
      } else {
        setError(response.error || 'Error al obtener el estado del Kernel');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    isLoading,
    error,
    refresh
  };
}
