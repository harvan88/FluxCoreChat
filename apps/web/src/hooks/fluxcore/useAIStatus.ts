import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import type { AIEligibilityResponse, AIStatusResponse } from '../../types';
import { subscribeAssistantUpdateEvent } from './events';

interface UseAIStatusParams {
  accountId?: string | null;
  conversationId?: string | null;
}

interface UseAIStatusResult {
  status: AIStatusResponse | null;
  eligibility: AIEligibilityResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAIStatus({ accountId, conversationId }: UseAIStatusParams): UseAIStatusResult {
  const [status, setStatus] = useState<AIStatusResponse | null>(null);
  const [eligibility, setEligibility] = useState<AIEligibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canCheckEligibility = useMemo(
    () => Boolean(accountId && conversationId),
    [accountId, conversationId],
  );

  const refresh = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const statusRes = await api.getAIStatus(accountId);
      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      } else if (statusRes.error) {
        setError(statusRes.error);
      }

      if (canCheckEligibility) {
        const eligibilityRes = await api.getAIEligibility({ accountId, conversationId: conversationId! });
        if (eligibilityRes.success && eligibilityRes.data) {
          setEligibility(eligibilityRes.data);
        } else if (eligibilityRes.error) {
          setError((prev) => prev ?? eligibilityRes.error ?? 'No se pudo verificar disponibilidad de IA');
        }
      } else {
        setEligibility(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error consultando estado de IA');
    } finally {
      setIsLoading(false);
    }
  }, [accountId, canCheckEligibility, conversationId]);

  useEffect(() => {
    setStatus(null);
    setEligibility(null);
    void refresh();
  }, [accountId, conversationId, refresh]);

  useEffect(() => {
    if (!accountId) {
      return;
    }

    const unsubscribe = subscribeAssistantUpdateEvent((detail) => {
      if (detail.accountId === accountId) {
        void refresh();
      }
    });

    return unsubscribe;
  }, [accountId, refresh]);

  return {
    status,
    eligibility,
    isLoading,
    error,
    refresh,
  };
}
