import { randomUUID } from 'crypto';
import { db, accountDeletionJobs, type AccountDeletionJob } from '@fluxcore/db';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { accountDeletionGuard } from './account-deletion.guard';
import { broadcastSystemEvent } from '../websocket/system-events';
import { accountDeletionSnapshotService } from './account-deletion.snapshot.service';
import { featureFlags } from '../config/feature-flags';
import { enqueueAccountDeletionJob } from '../workers/account-deletion.queue';
import type { AccountDeletionAuthMode, AccountDeletionAuthResult } from '../middleware/account-deletion-auth';

const ACTIVE_JOB_STATUSES = ['pending', 'snapshot', 'snapshot_ready', 'external_cleanup', 'local_cleanup'] as const;
const SNAPSHOT_PHASES = ['snapshot', 'snapshot_ready'] as const;
const CONFIRMABLE_STATUSES = ['pending', 'snapshot', 'snapshot_ready'] as const;

type ActiveJobStatus = (typeof ACTIVE_JOB_STATUSES)[number];
type SnapshotPhase = (typeof SNAPSHOT_PHASES)[number];
type AccountDeletionJobStatus = (typeof CONFIRMABLE_STATUSES)[number];

type DeletionDataHandling = 'download_snapshot' | 'delete_all';

interface DeletionPreferences {
  dataHandling?: DeletionDataHandling;
}

interface DeletionContext {
  accountId: string;
  requesterUserId: string;
  auth: AccountDeletionAuthResult;
  preferences?: DeletionPreferences;
}

interface SnapshotDownloadMetadata {
  token: string;
  createdAt: string;
  expiresAt: string;
}

const SNAPSHOT_DOWNLOAD_TOKEN_TTL_MS = 1000 * 60 * 60 * 48; // 48h

interface SnapshotAckPayload {
  downloaded?: boolean;
  consent?: boolean;
  userAgent?: string;
}

const DEFAULT_DATA_HANDLING: DeletionDataHandling = 'download_snapshot';

class AccountDeletionService {
  async requestDeletion(context: DeletionContext) {
    const { accountId, requesterUserId, auth } = context;

    const requesterAccountId = auth.mode === 'owner' ? auth.sessionAccountId ?? undefined : undefined;

    await accountDeletionGuard.ensureAllowed(accountId, {
      requesterUserId,
      requesterAccountId,
      details: { phase: 'requestDeletion' },
    });

    const existingJob = await this.getActiveJob(accountId);

    if (existingJob) {
      return existingJob;
    }

    const dataHandling = context.preferences?.dataHandling ?? DEFAULT_DATA_HANDLING;

    const [job] = await db
      .insert(accountDeletionJobs)
      .values({
        accountId,
        requesterUserId,
        requesterAccountId: requesterAccountId ?? null,
        status: 'pending',
        phase: 'snapshot',
        metadata: {
          dataHandling,
        },
      })
      .returning();

    return job;
  }

  async prepareSnapshot(context: DeletionContext) {
    const { accountId, requesterUserId, auth } = context;
    const job = await this.getActiveJob(accountId);
    if (!job) {
      throw new Error('No deletion job found for this account');
    }

    await this.ensureRequester(job, requesterUserId, auth.mode);

    if ((SNAPSHOT_PHASES as unknown as SnapshotPhase[]).includes(job.phase as SnapshotPhase) && job.status === 'snapshot_ready') {
      return job;
    }

    const snapshot = await accountDeletionSnapshotService.generate(accountId, job.id);

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        status: 'snapshot_ready',
        phase: 'snapshot_ready',
        snapshotUrl: snapshot.url,
        snapshotReadyAt: new Date(snapshot.generatedAt),
        metadata: {
          ...job.metadata,
          snapshotGeneratedAt: snapshot.generatedAt,
          snapshotSizeBytes: snapshot.sizeBytes,
          snapshotPath: snapshot.path,
        },
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    return updated;
  }

  async confirmDeletion(context: DeletionContext) {
    const { accountId, requesterUserId, auth } = context;
    const job = await this.getActiveJob(accountId);
    if (!job) {
      throw new Error('No deletion job found for this account');
    }

    await this.ensureRequester(job, requesterUserId, auth.mode);

    const dataHandling = (job.metadata as any)?.dataHandling ?? DEFAULT_DATA_HANDLING;
    const requiresSnapshot = dataHandling !== 'delete_all';
    const allowedStatuses: AccountDeletionJobStatus[] = ['pending', 'snapshot', 'snapshot_ready'];

    if (!allowedStatuses.includes(job.status as AccountDeletionJobStatus)) {
      throw new Error('Deletion job not in a confirmable state');
    }

    const metadata = job.metadata ? { ...(job.metadata as Record<string, any>) } : {};

    if (requiresSnapshot && !this.snapshotExists(job)) {
      metadata.snapshotGeneration = {
        ...(metadata.snapshotGeneration || {}),
        pending: true,
        requestedAt: new Date().toISOString(),
      };
    }

    const snapshotDownloadToken = requiresSnapshot ? this.createSnapshotDownloadTokenMetadata() : undefined;

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        status: 'external_cleanup',
        phase: 'external_cleanup',
        metadata: {
          ...metadata,
          confirmedAt: new Date().toISOString(),
          consent: {
            acknowledgedAt: job.snapshotAcknowledgedAt?.toISOString?.() ?? job.snapshotAcknowledgedAt,
            downloadedAt: job.snapshotDownloadedAt?.toISOString?.() ?? job.snapshotDownloadedAt,
            dataHandling,
            skippedSnapshot: requiresSnapshot ? undefined : true,
          },
          ...(snapshotDownloadToken ? { snapshotDownloadToken } : {}),
        },
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    broadcastSystemEvent({
      type: 'account:deletion_confirmed',
      accountId,
      jobId: job.id,
    });

    if (featureFlags.accountDeletionQueue) {
      await enqueueAccountDeletionJob(job.id);
    }

    return updated;
  }

  async acknowledgeSnapshot(context: DeletionContext & { payload: SnapshotAckPayload }) {
    const { accountId, requesterUserId, auth, payload } = context;

    if (!payload.downloaded && !payload.consent) {
      const error = new Error('Snapshot acknowledgement requires downloaded or consent flag');
      (error as any).code = 'ACCOUNT_DELETION_ACK_INVALID';
      throw error;
    }

    const job = await this.getActiveJob(accountId);
    if (!job) {
      throw new Error('No deletion job found for this account');
    }

    await this.ensureRequester(job, requesterUserId, auth.mode);

    if (job.status !== 'snapshot_ready') {
      const error = new Error('Snapshot acknowledgement is only available while snapshot is ready');
      (error as any).code = 'ACCOUNT_DELETION_INVALID_PHASE';
      throw error;
    }

    if (payload.consent && !job.snapshotDownloadedAt && !payload.downloaded) {
      const error = new Error('Snapshot must be downloaded before acknowledging consent');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_REQUIRED';
      throw error;
    }

    const now = new Date();
    const downloadAt = payload.downloaded ? now : undefined;
    const consentAt = payload.consent ? now : undefined;

    const nextDownloadCount = payload.downloaded ? (job.snapshotDownloadCount ?? 0) + 1 : job.snapshotDownloadCount ?? 0;
    const acknowledgementEntries = Array.isArray((job.metadata as any)?.snapshotAcknowledgements)
      ? ([...(job.metadata as any).snapshotAcknowledgements] as any[])
      : [];

    if (payload.downloaded) {
      acknowledgementEntries.push({ type: 'download', at: downloadAt?.toISOString(), userAgent: payload.userAgent });
    }

    if (payload.consent) {
      acknowledgementEntries.push({ type: 'consent', at: consentAt?.toISOString(), userAgent: payload.userAgent });
    }

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        snapshotDownloadedAt: downloadAt ?? job.snapshotDownloadedAt ?? null,
        snapshotDownloadCount: nextDownloadCount,
        snapshotAcknowledgedAt: consentAt ?? job.snapshotAcknowledgedAt ?? null,
        metadata: {
          ...job.metadata,
          snapshotAcknowledgements: acknowledgementEntries,
        },
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    return updated;
  }

  async getSnapshotArtifact(context: DeletionContext) {
    const { accountId, requesterUserId, auth } = context;
    const job = await this.getActiveJob(accountId);
    if (!job) {
      throw new Error('No deletion job found for this account');
    }

    await this.ensureRequester(job, requesterUserId, auth.mode);

    if (job.status !== 'snapshot_ready') {
      const error = new Error('Snapshot not available for download');
      (error as any).code = 'ACCOUNT_DELETION_INVALID_PHASE';
      throw error;
    }

    const snapshotPath = (job.metadata as any)?.snapshotPath as string | undefined;
    if (!snapshotPath) {
      const error = new Error('Snapshot artifact path missing');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_MISSING';
      throw error;
    }

    return { job, snapshotPath };
  }

  async getJobForAccount(accountId: string) {
    const [job] = await db
      .select()
      .from(accountDeletionJobs)
      .where(eq(accountDeletionJobs.accountId, accountId))
      .orderBy(desc(accountDeletionJobs.createdAt))
      .limit(1);

    return job ?? null;
  }

  async getJobById(jobId: string) {
    const [job] = await db
      .select()
      .from(accountDeletionJobs)
      .where(eq(accountDeletionJobs.id, jobId))
      .limit(1);

    return job ?? null;
  }

  async getSnapshotDownloadStatusByToken(jobId: string, token: string) {
    const job = await this.getJobById(jobId);
    if (!job) {
      const error = new Error('Deletion job not found');
      (error as any).code = 'ACCOUNT_DELETION_JOB_NOT_FOUND';
      throw error;
    }

    const tokenMetadata = this.ensureValidSnapshotDownloadToken(job, token);
    const snapshotPath = (job.metadata as any)?.snapshotPath as string | undefined;

    return {
      jobId: job.id,
      accountId: job.accountId,
      status: job.status,
      phase: job.phase,
      snapshotReadyAt: job.snapshotReadyAt,
      downloadAvailable: Boolean(snapshotPath),
      expiresAt: tokenMetadata.expiresAt,
      completedAt: job.status === 'completed' ? job.updatedAt : null,
    };
  }

  async getSnapshotArtifactByToken(jobId: string, token: string) {
    const job = await this.getJobById(jobId);
    if (!job) {
      const error = new Error('Deletion job not found');
      (error as any).code = 'ACCOUNT_DELETION_JOB_NOT_FOUND';
      throw error;
    }

    this.ensureValidSnapshotDownloadToken(job, token);

    const snapshotPath = (job.metadata as any)?.snapshotPath as string | undefined;
    if (!snapshotPath) {
      const error = new Error('Snapshot artifact not available for download');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_MISSING';
      throw error;
    }

    return { job, snapshotPath };
  }

  async markSnapshotDownloaded(job: AccountDeletionJob, userAgent?: string) {
    const now = new Date();
    const acknowledgements = Array.isArray((job.metadata as any)?.snapshotAcknowledgements)
      ? ([...(job.metadata as any).snapshotAcknowledgements] as any[])
      : [];

    acknowledgements.push({ type: 'download', at: now.toISOString(), userAgent });

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        snapshotDownloadedAt: job.snapshotDownloadedAt ?? now,
        snapshotDownloadCount: (job.snapshotDownloadCount ?? 0) + 1,
        metadata: {
          ...job.metadata,
          snapshotAcknowledgements: acknowledgements,
          snapshotDownloadToken: {
            ...(job.metadata as any)?.snapshotDownloadToken,
            lastDownloadedAt: now.toISOString(),
          },
        },
        updatedAt: now,
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    return updated;
  }

  private async getActiveJob(accountId: string) {
    const [existingJob] = await db
      .select()
      .from(accountDeletionJobs)
      .where(
        and(
          eq(accountDeletionJobs.accountId, accountId),
          inArray(accountDeletionJobs.status as any, ACTIVE_JOB_STATUSES as unknown as ActiveJobStatus[])
        )
      )
      .limit(1);

    return existingJob || null;
  }

  private ensureRequester(job: { requesterUserId: string }, requesterUserId: string, authMode: AccountDeletionAuthMode) {
    if (job.requesterUserId === requesterUserId) {
      return;
    }

    if (authMode === 'force') {
      return;
    }

    const error = new Error('Not authorized to manage this deletion job');
    (error as any).code = 'ACCOUNT_DELETION_UNAUTHORIZED';
    throw error;
  }

  private createSnapshotDownloadTokenMetadata(): SnapshotDownloadMetadata {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + SNAPSHOT_DOWNLOAD_TOKEN_TTL_MS);
    return {
      token: randomUUID(),
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private getSnapshotDownloadTokenMetadata(job: AccountDeletionJob): SnapshotDownloadMetadata | undefined {
    const metadata = job.metadata as Record<string, any>;
    const tokenMetadata = metadata.snapshotDownloadToken as SnapshotDownloadMetadata | undefined;
    return tokenMetadata;
  }

  private ensureValidSnapshotDownloadToken(job: AccountDeletionJob, token: string): SnapshotDownloadMetadata {
    const metadata = this.getSnapshotDownloadTokenMetadata(job);
    if (!metadata || metadata.token !== token) {
      const error = new Error('Invalid snapshot download token');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_INVALID';
      throw error;
    }

    const expiresAt = new Date(metadata.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      const error = new Error('Snapshot download token expired');
      (error as any).code = 'ACCOUNT_DELETION_SNAPSHOT_TOKEN_EXPIRED';
      throw error;
    }

    return metadata;
  }

  private snapshotExists(job: AccountDeletionJob) {
    const metadata = job.metadata as Record<string, any>;
    return Boolean(job.snapshotReadyAt || metadata?.snapshotPath);
  }
}

export const accountDeletionService = new AccountDeletionService();
