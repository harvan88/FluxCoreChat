import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Account, AccountDeletionJob, AccountDeletionJobStatus } from '../types';
import { accountsApi } from '../services/accounts';
import { useUIStore } from '../store/uiStore';
import { useAccountStore } from '../store/accountStore';
import { closeAccountDB, setCurrentAccountDB } from '../db';
import {
  useAccountDeletionMonitorStore,
  type AccountDeletionDebugLog,
  type LogSource,
} from '../store/accountDeletionMonitorStore';

const POLLABLE_STATUSES: AccountDeletionJob['status'][] = [
  'pending',
  'snapshot',
  'snapshot_ready',
  'external_cleanup',
  'local_cleanup',
];

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const formatDuration = (elapsedMs: number) => {
  if (elapsedMs < 1000) {
    return `${Math.round(elapsedMs)}ms`;
  }
  if (elapsedMs < 60_000) {
    return `${(elapsedMs / 1000).toFixed(1)}s`;
  }
  return `${(elapsedMs / 60000).toFixed(1)}m`;
};

const pickFallbackAccountId = (accounts: Account[]): string | null => {
  if (!accounts.length) return null;
  const personal = accounts.find((acc) => acc.accountType === 'personal');
  return personal?.id ?? accounts[0].id;
};

interface UseAccountDeletionOptions {
  accountId?: string;
  sessionAccountId?: string;
  accountName?: string | null;
}

export interface UseAccountDeletionResult {
  job: AccountDeletionJob | null;
  isRequesting: boolean;
  isGeneratingSnapshot: boolean;
  isConfirming: boolean;
  isAcknowledgingSnapshot: boolean;
  isDownloadingSnapshot: boolean;
  isLoadingJob: boolean;
  isBackgroundProcessing: boolean;
  error: string | null;
  debugLogs: AccountDeletionDebugLog[];
  selectedDataHandling: 'download_snapshot' | 'delete_all';
  setSelectedDataHandling: (next: 'download_snapshot' | 'delete_all') => void;
  isPasswordVerified: boolean;
  isVerifyingPassword: boolean;
  passwordError: string | null;
  requestDeletion: () => Promise<void>;
  generateSnapshot: () => Promise<void>;
  acknowledgeSnapshot: (payload: { downloaded?: boolean; consent?: boolean }) => Promise<void>;
  downloadSnapshot: () => Promise<void>;
  confirmDeletion: () => Promise<void>;
  refreshJob: () => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  resetPasswordVerification: () => void;
  clearDebugLogs: () => void;
}

export function useAccountDeletion({ accountId, sessionAccountId, accountName }: UseAccountDeletionOptions): UseAccountDeletionResult {
  const [job, setJob] = useState<AccountDeletionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAcknowledgingSnapshot, setIsAcknowledgingSnapshot] = useState(false);
  const [isDownloadingSnapshot, setIsDownloadingSnapshot] = useState(false);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  const [selectedDataHandling, setSelectedDataHandling] = useState<'download_snapshot' | 'delete_all'>('download_snapshot');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<AccountDeletionJobStatus | null>(null);

  const pushMonitorLog = useAccountDeletionMonitorStore((state) => state.pushLog);
  const clearMonitorLogs = useAccountDeletionMonitorStore((state) => state.clearLogs);
  const monitorLogs = useAccountDeletionMonitorStore(
    (state) => state.logs.filter((log) => !accountId || log.accountId === accountId)
  );
  const jobRef = useRef<AccountDeletionJob | null>(null);

  const pushDebugLog = useCallback(
    (log: Pick<AccountDeletionDebugLog, 'type' | 'message'> & { data?: unknown; source?: LogSource }) => {
      pushMonitorLog({
        ...log,
        accountId,
        jobId: jobRef.current?.id,
        source: log.source ?? 'local',
      });
    },
    [accountId, pushMonitorLog]
  );

  const clearDebugLogs = useCallback(() => {
    clearMonitorLogs(accountId);
  }, [accountId, clearMonitorLogs]);

  const syncAccountsAfterDeletion = useCallback(
    async (removedAccountId: string) => {
      const accountStoreState = useAccountStore.getState();
      const uiState = useUIStore.getState();
      const remainingAccounts = accountStoreState.accounts.filter((acc) => acc.id !== removedAccountId);

      const shouldSwitchActive = accountStoreState.activeAccountId === removedAccountId;
      const shouldSwitchSelected = uiState.selectedAccountId === removedAccountId;
      const fallbackAccountId = pickFallbackAccountId(remainingAccounts);

      useAccountStore.setState((state) => ({
        accounts: remainingAccounts,
        activeAccountId: shouldSwitchActive ? fallbackAccountId : state.activeAccountId,
      }));

      uiState.setAccounts(remainingAccounts);

      if (shouldSwitchSelected) {
        uiState.setSelectedAccount(fallbackAccountId);
        if (fallbackAccountId) {
          setCurrentAccountDB(fallbackAccountId);
        }
      }

      if (!remainingAccounts.length) {
        uiState.resetAccountData();
      }

      await closeAccountDB(removedAccountId);
    },
    []
  );

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
      pushDebugLog({ type: 'info', message: 'Consultando estado del job…', data: { accountId } });
      const response = await accountsApi.getAccountDeletionJob(accountId);
      if (response.success) {
        const nextJob = response.data ?? null;
        setJob(nextJob);
        jobRef.current = nextJob;
        if (!nextJob) {
          setSelectedDataHandling('download_snapshot');
          setIsPasswordVerified(false);
        } else {
          const jobHandling = (nextJob.metadata as any)?.dataHandling === 'delete_all' ? 'delete_all' : 'download_snapshot';
          setSelectedDataHandling(jobHandling);
        }
        const prevStatus = lastStatusRef.current;
        const processing = Boolean(nextJob && ['external_cleanup', 'local_cleanup'].includes(nextJob.status));
        setIsBackgroundProcessing(processing);
        if (nextJob) {
          lastStatusRef.current = nextJob.status;
          if (nextJob.status !== prevStatus) {
            pushDebugLog({
              type: 'info',
              message: `Estado del job cambiado: ${prevStatus ?? 'none'} → ${nextJob.status}`,
              data: { job: nextJob },
            });
          }
          if (nextJob.status === 'completed') {
            clearPoll();
            if (prevStatus !== 'completed') {
              useUIStore.getState().pushToast({
                type: 'success',
                title: 'Cuenta eliminada',
                description: `${nextJob.accountId === accountId ? 'Tu cuenta' : 'Una cuenta' } se eliminó correctamente.`,
              });
              useUIStore.getState().setActiveActivity('conversations');
            }
          } else if (nextJob.status === 'failed') {
            if (prevStatus !== 'failed') {
              useUIStore.getState().pushToast({
                type: 'error',
                title: 'Eliminación fallida',
                description: nextJob.failureReason ?? 'El proceso de eliminación no se pudo completar.',
              });
            }
          }
        }
        setError(null);
        pushDebugLog({ type: 'success', message: 'Estado actualizado correctamente', data: { job: nextJob } });
      } else {
        setError(response.error || 'No se pudo obtener el estado de eliminación');
        pushDebugLog({ type: 'error', message: 'Error al consultar estado', data: { error: response.error } });
      }
    } catch (err: any) {
      setError(err?.message || 'Error al obtener estado de eliminación');
      pushDebugLog({ type: 'error', message: 'Excepción al refrescar estado', data: { message: err?.message } });
    } finally {
      setIsLoadingJob(false);
    }
  }, [accountId, pushDebugLog]);

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
      const start = now();
      pushDebugLog({ type: 'info', message: 'Solicitando eliminación…', data: { accountId, sessionAccountId } });
      const response = await accountsApi.requestDeletion(accountId, {
        sessionAccountId,
        dataHandling: selectedDataHandling,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo solicitar la eliminación');
      }
      setJob(response.data);
      jobRef.current = response.data;
      const jobHandling = (response.data.metadata as any)?.dataHandling === 'delete_all' ? 'delete_all' : selectedDataHandling;
      setSelectedDataHandling(jobHandling);
      setIsPasswordVerified(false);
      setPasswordError(null);
      setError(null);
      pushDebugLog({
        type: 'success',
        message: `Eliminación solicitada (${formatDuration(now() - start)})`,
        data: { job: response.data },
      });
    } catch (err: any) {
      setError(err?.message || 'Error al solicitar eliminación');
      pushDebugLog({ type: 'error', message: 'Error solicitando eliminación', data: { message: err?.message } });
    } finally {
      setIsRequesting(false);
    }
  }, [accountId, sessionAccountId, selectedDataHandling, pushDebugLog]);

  const generateSnapshot = useCallback(async () => {
    if (!accountId) return;
    setIsGeneratingSnapshot(true);
    try {
      const start = now();
      pushDebugLog({ type: 'info', message: 'Generando snapshot…', data: { accountId } });
      const response = await accountsApi.prepareDeletionSnapshot(accountId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo generar el snapshot');
      }
      setJob(response.data);
      setError(null);
      pushDebugLog({
        type: 'success',
        message: `Snapshot generado (${formatDuration(now() - start)})`,
        data: { job: response.data },
      });
    } catch (err: any) {
      setError(err?.message || 'Error al generar snapshot');
      pushDebugLog({ type: 'error', message: 'Error generando snapshot', data: { message: err?.message } });
    } finally {
      setIsGeneratingSnapshot(false);
    }
  }, [accountId, pushDebugLog]);

  const confirmDeletion = useCallback(async () => {
    if (!accountId) return;
    setIsConfirming(true);
    try {
      const start = now();
      pushDebugLog({
        type: 'info',
        message: 'Confirmando eliminación…',
        data: { accountId, sessionAccountId },
      });
      const response = await accountsApi.confirmDeletion(accountId, { sessionAccountId });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo confirmar la eliminación');
      }
      setJob(response.data);
      setIsBackgroundProcessing(true);
      setError(null);
      pushDebugLog({
        type: 'success',
        message: `Eliminación confirmada (${formatDuration(now() - start)})`,
        data: { job: response.data },
      });
      useUIStore.getState().setActiveActivity('conversations');
      useUIStore.getState().pushToast({
        type: 'info',
        title: 'Procesando eliminación',
        description: 'Estamos eliminando tus datos en segundo plano. Puedes continuar usando FluxCore.',
      });
      await syncAccountsAfterDeletion(accountId);
    } catch (err: any) {
      setError(err?.message || 'Error al confirmar eliminación');
      useUIStore.getState().pushToast({
        type: 'error',
        title: 'No se pudo iniciar la eliminación',
        description: err?.message || 'Intenta nuevamente o contacta soporte.',
      });
      pushDebugLog({ type: 'error', message: 'Error confirmando eliminación', data: { message: err?.message } });
    } finally {
      setIsConfirming(false);
    }
  }, [accountId, accountName, sessionAccountId, pushDebugLog, syncAccountsAfterDeletion]);

  const acknowledgeSnapshot = useCallback(
    async (payload: { downloaded?: boolean; consent?: boolean }) => {
      if (!accountId) return;
      setIsAcknowledgingSnapshot(true);
      try {
        const start = now();
        pushDebugLog({ type: 'info', message: 'Registrando consentimiento de snapshot…', data: payload });
        const response = await accountsApi.acknowledgeDeletionSnapshot(accountId, payload);
        if (!response.success || !response.data) {
          throw new Error(response.error || 'No se pudo registrar el consentimiento');
        }
        setJob(response.data);
        setError(null);
        pushDebugLog({
          type: 'success',
          message: `Consentimiento registrado (${formatDuration(now() - start)})`,
          data: { job: response.data },
        });
      } catch (err: any) {
        setError(err?.message || 'Error al registrar consentimiento');
        pushDebugLog({ type: 'error', message: 'Error registrando consentimiento', data: { message: err?.message } });
      } finally {
        setIsAcknowledgingSnapshot(false);
      }
    },
    [accountId, pushDebugLog]
  );

  const downloadSnapshot = useCallback(async () => {
    if (!accountId) return;
    setIsDownloadingSnapshot(true);
    try {
      const start = now();
      pushDebugLog({ type: 'info', message: 'Descargando snapshot…', data: { accountId } });
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
      pushDebugLog({ type: 'success', message: `Snapshot descargado (${formatDuration(now() - start)})` });
    } catch (err: any) {
      setError(err?.message || 'Error al descargar snapshot');
      pushDebugLog({ type: 'error', message: 'Error descargando snapshot', data: { message: err?.message } });
    } finally {
      setIsDownloadingSnapshot(false);
    }
  }, [accountId, refreshJob, pushDebugLog]);

  const verifyPassword = useCallback(
    async (password: string) => {
      if (!password) {
        setPasswordError('Ingresa tu contraseña');
        setIsPasswordVerified(false);
        return false;
      }
      setIsVerifyingPassword(true);
      setPasswordError(null);
      try {
        const start = now();
        pushDebugLog({ type: 'info', message: 'Verificando contraseña…' });
        const response = await accountsApi.verifyPassword(password);
        if (!response.success || !response.data?.valid) {
          throw new Error(response.error || 'Contraseña incorrecta');
        }
        setIsPasswordVerified(true);
        pushDebugLog({ type: 'success', message: `Contraseña verificada (${formatDuration(now() - start)})` });
        return true;
      } catch (err: any) {
        setIsPasswordVerified(false);
        const message = err?.message || 'Contraseña incorrecta';
        setPasswordError(message);
        pushDebugLog({ type: 'error', message: 'Error verificando contraseña', data: { message } });
        return false;
      } finally {
        setIsVerifyingPassword(false);
      }
    },
    [pushDebugLog]
  );

  const resetPasswordVerification = useCallback(() => {
    setIsPasswordVerified(false);
    setPasswordError(null);
  }, []);

  return {
    job,
    error,
    isLoadingJob,
    isRequesting,
    isGeneratingSnapshot,
    isConfirming,
    isAcknowledgingSnapshot,
    isDownloadingSnapshot,
    isBackgroundProcessing,
    debugLogs: monitorLogs,
    selectedDataHandling,
    setSelectedDataHandling,
    isPasswordVerified,
    isVerifyingPassword,
    passwordError,
    requestDeletion,
    generateSnapshot,
    acknowledgeSnapshot,
    downloadSnapshot,
    confirmDeletion,
    refreshJob,
    verifyPassword,
    resetPasswordVerification,
    clearDebugLogs,
  };
}
