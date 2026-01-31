import { createHmac } from 'node:crypto';

import {
  db,
  accountDeletionJobs,
  type AccountDeletionJob,
  fluxcoreAssistants,
  fluxcoreVectorStoreFiles,
  fluxcoreVectorStores,
} from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';

import { fluxcoreService } from './fluxcore.service';
import { deleteVectorStoreCascade } from './vector-store-deletion.service';
import {
  removeFileFromOpenAIVectorStore,
  deleteOpenAIFile,
} from './openai-sync.service';
import { accountDeletionSnapshotService } from './account-deletion.snapshot.service';

type CleanupPhase = 'assistants' | 'files' | 'vectorStores';
type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface PhaseState {
  status: PhaseStatus;
  attempts: number;
  lastError?: string;
  startedAt?: string;
  finishedAt?: string;
}

interface ExternalCleanupState {
  externalJobId?: string;
  tokenIssuedAt?: string;
  phases: Record<CleanupPhase, PhaseState>;
  lastFluxcorePayload?: Record<string, unknown>;
  failure?: {
    code: string;
    message: string;
    occurredAt: string;
  };
}

const PHASES: CleanupPhase[] = ['assistants', 'files', 'vectorStores'];
const RETRY_DELAYS_MS = [5000, 15000, 45000];

const defaultPhase = (): PhaseState => ({ status: 'pending', attempts: 0 });

const ensureState = (state?: Record<string, unknown>): ExternalCleanupState => {
  const existing = (state ?? {}) as Partial<ExternalCleanupState>;
  const baseState: ExternalCleanupState = {
    externalJobId: existing.externalJobId,
    tokenIssuedAt: existing.tokenIssuedAt,
    lastFluxcorePayload: existing.lastFluxcorePayload,
    failure: existing.failure,
    phases: {
      assistants: defaultPhase(),
      files: defaultPhase(),
      vectorStores: defaultPhase(),
    },
  };

  if (state && typeof state === 'object') {
    for (const phase of PHASES) {
      const stored = existing.phases?.[phase];
      if (stored) {
        baseState.phases[phase] = {
          status: stored.status ?? 'pending',
          attempts: stored.attempts ?? 0,
          lastError: stored.lastError,
          startedAt: stored.startedAt,
          finishedAt: stored.finishedAt,
        };
      }
    }
  }

  return baseState;
};

const nowIso = () => new Date().toISOString();

const benignNotFound = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  if (err?.statusCode === 404 || err?.status === 404) return true;
  const message = err?.message ?? '';
  return typeof message === 'string' && message.includes('404');
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getDeletionSecret = () =>
  process.env.ACCOUNT_DELETION_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  'fluxcore-account-deletion-secret';

function generateDeletionToken(job: AccountDeletionJob) {
  const snapshotAcknowledgedAt = (job as any)?.snapshotAcknowledgedAt;
  const snapshotDownloadedAt = (job as any)?.snapshotDownloadedAt;
  const payload = {
    accountId: job.accountId,
    requesterUserId: job.requesterUserId,
    requesterAccountId: job.requesterAccountId,
    jobId: job.id,
    confirmedAt: job.metadata?.confirmedAt,
    snapshotAcknowledgedAt,
    snapshotDownloadedAt,
    issuedAt: nowIso(),
    exp: Date.now() + 15 * 60 * 1000,
  };

  const secret = getDeletionSecret();
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

interface AccountDeletionExternalDeps {
  deleteAssistant: typeof fluxcoreService.deleteAssistant;
  deleteVectorStoreCascade: typeof deleteVectorStoreCascade;
  removeFileFromOpenAIVectorStore: typeof removeFileFromOpenAIVectorStore;
  deleteOpenAIFile: typeof deleteOpenAIFile;
}

const defaultDeps: AccountDeletionExternalDeps = {
  deleteAssistant: fluxcoreService.deleteAssistant,
  deleteVectorStoreCascade,
  removeFileFromOpenAIVectorStore,
  deleteOpenAIFile,
};

export class AccountDeletionExternalService {
  constructor(private readonly deps: AccountDeletionExternalDeps = defaultDeps) {}

  async run(job: AccountDeletionJob) {
    const state = ensureState(job.externalState as Record<string, unknown> | undefined);
    const metadata = { ...(job.metadata || {}) } as Record<string, unknown>;

    if (this.requiresSnapshot(metadata) && !this.snapshotExists(job)) {
      await this.generateSnapshot(job, metadata);
    }

    if (!state.externalJobId) {
      const token = generateDeletionToken(job);
      state.externalJobId = `local:${job.id}`;
      state.tokenIssuedAt = nowIso();
      state.lastFluxcorePayload = {
        acknowledgedAt: state.tokenIssuedAt,
        adapter: 'local-adapter',
      };
      metadata.externalDeletionToken = token;
      metadata.externalDeletionAcknowledgedAt = state.tokenIssuedAt;
      await this.persistState(job.id, state, metadata);
    }

    await this.processAssistants(job, state, metadata);
    await this.processFiles(job, state, metadata);
    await this.processVectorStores(job, state, metadata);

    return this.persistState(job.id, state, metadata);
  }

  private requiresSnapshot(metadata: Record<string, unknown>) {
    return (metadata?.dataHandling as string | undefined) !== 'delete_all';
  }

  private snapshotExists(job: AccountDeletionJob) {
    const metadata = job.metadata as Record<string, any> | undefined;
    return Boolean(job.snapshotReadyAt || metadata?.snapshotPath);
  }

  private async generateSnapshot(job: AccountDeletionJob, metadata: Record<string, unknown>) {
    const snapshot = await accountDeletionSnapshotService.generate(job.accountId, job.id);

    metadata.snapshotGeneratedAt = snapshot.generatedAt;
    metadata.snapshotSizeBytes = snapshot.sizeBytes;
    metadata.snapshotPath = snapshot.path;
    metadata.snapshotGeneration = {
      ...(metadata.snapshotGeneration as Record<string, unknown> | undefined),
      pending: false,
      completedAt: snapshot.generatedAt,
    };

    await db
      .update(accountDeletionJobs)
      .set({
        snapshotUrl: snapshot.url,
        snapshotReadyAt: new Date(snapshot.generatedAt),
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id));

    job.snapshotUrl = snapshot.url;
    job.snapshotReadyAt = new Date(snapshot.generatedAt) as any;
    job.metadata = metadata;
  }

  private async processAssistants(
    job: AccountDeletionJob,
    state: ExternalCleanupState,
    metadata: Record<string, unknown>,
  ) {
    const phase = state.phases.assistants;
    if (phase.status === 'completed') return;

    this.transitionPhase(phase, 'in_progress');
    await this.persistState(job.id, state, metadata);

    const assistants = await db
      .select({ id: fluxcoreAssistants.id })
      .from(fluxcoreAssistants)
      .where(eq(fluxcoreAssistants.accountId, job.accountId));

    for (const assistant of assistants) {
      await this.runWithRetry('assistants', async () => {
        await this.deps.deleteAssistant(assistant.id, job.accountId);
      });
    }

    this.transitionPhase(phase, 'completed');
    await this.persistState(job.id, state, metadata);
  }

  private async processFiles(
    job: AccountDeletionJob,
    state: ExternalCleanupState,
    metadata: Record<string, unknown>,
  ) {
    const phase = state.phases.files;
    if (phase.status === 'completed') return;

    this.transitionPhase(phase, 'in_progress');
    await this.persistState(job.id, state, metadata);

    const files = await db
      .select({
        id: fluxcoreVectorStoreFiles.id,
        externalId: fluxcoreVectorStoreFiles.externalId,
        vectorStoreId: fluxcoreVectorStoreFiles.vectorStoreId,
        storeExternalId: fluxcoreVectorStores.externalId,
        storeBackend: fluxcoreVectorStores.backend,
      })
      .from(fluxcoreVectorStoreFiles)
      .innerJoin(
        fluxcoreVectorStores,
        and(
          eq(fluxcoreVectorStores.id, fluxcoreVectorStoreFiles.vectorStoreId),
          eq(fluxcoreVectorStores.accountId, job.accountId),
        ),
      )
      .where(eq(fluxcoreVectorStores.accountId, job.accountId));

    for (const file of files) {
      await this.runWithRetry('files', async () => {
        if (file.storeBackend === 'openai' && file.storeExternalId && file.externalId) {
          await this.deps.removeFileFromOpenAIVectorStore(file.storeExternalId, file.externalId);
          await this.deps.deleteOpenAIFile(file.externalId);
        }

        await db
          .delete(fluxcoreVectorStoreFiles)
          .where(
            and(
              eq(fluxcoreVectorStoreFiles.id, file.id),
              eq(fluxcoreVectorStoreFiles.vectorStoreId, file.vectorStoreId),
            ),
          );
      });
    }

    this.transitionPhase(phase, 'completed');
    await this.persistState(job.id, state, metadata);
  }

  private async processVectorStores(
    job: AccountDeletionJob,
    state: ExternalCleanupState,
    metadata: Record<string, unknown>,
  ) {
    const phase = state.phases.vectorStores;
    if (phase.status === 'completed') return;

    this.transitionPhase(phase, 'in_progress');
    await this.persistState(job.id, state, metadata);

    const stores = await db
      .select({ id: fluxcoreVectorStores.id })
      .from(fluxcoreVectorStores)
      .where(eq(fluxcoreVectorStores.accountId, job.accountId));

    for (const store of stores) {
      await this.runWithRetry('vectorStores', async () => {
        await this.deps.deleteVectorStoreCascade(store.id, job.accountId);
      });
    }

    this.transitionPhase(phase, 'completed');
    await this.persistState(job.id, state, metadata);
  }

  private transitionPhase(phase: PhaseState, status: PhaseStatus) {
    if (status === 'in_progress') {
      phase.status = 'in_progress';
      phase.startedAt = phase.startedAt ?? nowIso();
      phase.attempts += 1;
      phase.lastError = undefined;
      return;
    }

    if (status === 'completed') {
      phase.status = 'completed';
      phase.finishedAt = nowIso();
      return;
    }

    if (status === 'failed') {
      phase.status = 'failed';
      phase.finishedAt = nowIso();
    }
  }

  private async runWithRetry<T>(phase: CleanupPhase, action: () => Promise<T>): Promise<T | null> {
    let lastError: unknown;

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await action();
      } catch (error) {
        if (benignNotFound(error)) {
          return null;
        }

        lastError = error;
        console.warn('[AccountDeletionExternal] retry', phase, 'attempt', attempt + 1, error);
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unknown error during external cleanup phase');
  }

  private async persistState(
    jobId: string,
    state: ExternalCleanupState,
    metadata: Record<string, unknown>,
  ) {
    await db
      .update(accountDeletionJobs)
      .set({
        externalState: state as unknown as Record<string, unknown>,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, jobId));

    return state;
  }
}

export const accountDeletionExternalService = new AccountDeletionExternalService();
