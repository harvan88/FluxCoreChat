import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccountDeletionJob } from '../types';
import { accountsApi } from '../services/accounts';

const POLLABLE_STATUSES: AccountDeletionJob['status'][] = [
  'pending',
  'snapshot',
  'snapshot_ready',
  'external_cleanup',
  'local_cleanup',
];

interface UseAccountDeletionOptions {
  accountId?: string;
  sessionAccountId?: string;
}

interface UseAccountDeletionResult {
  job: AccountDeletionJob | null;
  isRequesting: boolean;
  isGeneratingSnapshot: boolean;
  isConfirming: boolean;
  isAcknowledgingSnapshot: boolean;
  isDownloadingSnapshot: boolean;
  isLoadingJob: boolean;
  error: string | null;
  requestDeletion: () => Promise<void>;
  generateSnapshot: () => Promise<void>;
  acknowledgeSnapshot: (payload: { downloaded?: boolean; consent?: boolean }) => Promise<void>;
  downloadSnapshot: () => Promise<void>;
  confirmDeletion: () => Promise<void>;
  refreshJob: () => Promise<void>;
}

export function useAccountDeletion({ accountId, sessionAccountId }: UseAccountDeletionOptions): UseAccountDeletionResult {
  const [job, setJob] = useState<AccountDeletionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAcknowledgingSnapshot, setIsAcknowledgingSnapshot] = useState(false);
  const [isDownloadingSnapshot, setIsDownloadingSnapshot] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shouldPoll = useMemo(() => {
    if (!job) return false;
    if (!POLLABLE_STATUSES.includes(job.status)) return false;
    if (job.status === 'snapshot_ready') {
      // Sólo seguir haciendo polling en snapshot_ready para detectar confirmaciones hechas desde otro cliente
      return true;
    }
    return true;
  }, [job]);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshJob = useCallback(async () => {
    if (!accountId) return;
    setIsLoadingJob(true);
    try {
      const response = await accountsApi.getAccountDeletionJob(accountId);
      if (response.success) {
        setJob(response.data ?? null);
        setError(null);
      } else {
        setError(response.error || 'No se pudo obtener el estado de eliminación');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al obtener estado de eliminación');
    } finally {
      setIsLoadingJob(false);
    }
  }, [accountId]);

  useEffect(() => {
    refreshJob();
    return () => clearPoll();
  }, [refreshJob, clearPoll]);

  useEffect(() => {
    if (!shouldPoll) {
      clearPoll();
      return;
    }

    if (!pollRef.current) {
      pollRef.current = setInterval(() => {
        refreshJob().catch(() => {
          // se maneja el error en refreshJob
        });
      }, 5000);
    }

    return () => {
      clearPoll();
    };
  }, [shouldPoll, refreshJob, clearPoll]);

  const requestDeletion = useCallback(async () => {
    if (!accountId) return;
    setIsRequesting(true);
    try {
      const response = await accountsApi.requestDeletion(accountId, sessionAccountId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo solicitar la eliminación');
      }
      setJob(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al solicitar eliminación');
    } finally {
      setIsRequesting(false);
    }
  }, [accountId, sessionAccountId]);

  const generateSnapshot = useCallback(async () => {
    if (!accountId) return;
    setIsGeneratingSnapshot(true);
    try {
      const response = await accountsApi.prepareDeletionSnapshot(accountId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo generar el snapshot');
      }
      setJob(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al generar snapshot');
    } finally {
      setIsGeneratingSnapshot(false);
    }
  }, [accountId]);

  const confirmDeletion = useCallback(async () => {
    if (!accountId) return;
    setIsConfirming(true);
    try {
      const response = await accountsApi.confirmDeletion(accountId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo confirmar la eliminación');
      }
      setJob(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al confirmar eliminación');
    } finally {
      setIsConfirming(false);
    }
  }, [accountId]);

  const acknowledgeSnapshot = useCallback(
    async (payload: { downloaded?: boolean; consent?: boolean }) => {
      if (!accountId) return;
      setIsAcknowledgingSnapshot(true);
      try {
        const response = await accountsApi.acknowledgeDeletionSnapshot(accountId, payload);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'No se pudo registrar el consentimiento');
        }
        setJob(response.data);
        setError(null);
      } catch (err: any) {
        setError(err?.message || 'Error al registrar consentimiento');
      } finally {
        setIsAcknowledgingSnapshot(false);
      }
    },
    [accountId]
  );

  const downloadSnapshot = useCallback(async () => {
    if (!accountId) return;
    setIsDownloadingSnapshot(true);
    try {
      const blob = await accountsApi.downloadDeletionSnapshot(accountId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fluxcore-account-${accountId}-snapshot.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setError(null);
      await refreshJob();
    } catch (err: any) {
      setError(err?.message || 'Error al descargar snapshot');
    } finally {
      setIsDownloadingSnapshot(false);
    }
  }, [accountId, refreshJob]);

  return {
    job,
    error,
    isLoadingJob,
    isRequesting,
    isGeneratingSnapshot,
    isConfirming,
    isAcknowledgingSnapshot,
    isDownloadingSnapshot,
    requestDeletion,
    generateSnapshot,
    acknowledgeSnapshot,
    downloadSnapshot,
    confirmDeletion,
    refreshJob,
  };
}
