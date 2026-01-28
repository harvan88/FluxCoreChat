import { db, accountDeletionJobs } from '@fluxcore/db';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { accountDeletionGuard } from './account-deletion.guard';
import { broadcastSystemEvent } from '../websocket/system-events';
import { accountDeletionSnapshotService } from './account-deletion.snapshot.service';
import type { AccountDeletionAuthMode, AccountDeletionAuthResult } from '../middleware/account-deletion-auth';

const ACTIVE_JOB_STATUSES = ['pending', 'snapshot', 'snapshot_ready', 'external_cleanup', 'local_cleanup'] as const;
const SNAPSHOT_PHASES = ['snapshot', 'snapshot_ready'] as const;

type ActiveJobStatus = (typeof ACTIVE_JOB_STATUSES)[number];
type SnapshotPhase = (typeof SNAPSHOT_PHASES)[number];

interface DeletionContext {
  accountId: string;
  requesterUserId: string;
  auth: AccountDeletionAuthResult;
}

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

    const [job] = await db
      .insert(accountDeletionJobs)
      .values({
        accountId,
        requesterUserId,
        requesterAccountId: requesterAccountId ?? null,
        status: 'pending',
        phase: 'snapshot',
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

    if (job.status !== 'snapshot_ready') {
      throw new Error('Snapshot must be ready before confirmation');
    }

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        status: 'external_cleanup',
        phase: 'external_cleanup',
        metadata: {
          ...job.metadata,
          confirmedAt: new Date().toISOString(),
        },
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    broadcastSystemEvent({
      type: 'account:deletion_confirmed',
      accountId,
      jobId: job.id,
    });

    return updated;
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
}

export const accountDeletionService = new AccountDeletionService();
