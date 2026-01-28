import { db } from '@fluxcore/db';
import { accounts, accountDeletionJobs } from '@fluxcore/db';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { accountDeletionGuard } from './account-deletion.guard';
import { broadcastSystemEvent } from '../websocket/system-events';
import { systemAdminService } from './system-admin.service';
import { accountDeletionSnapshotService } from './account-deletion.snapshot.service';

const ACTIVE_JOB_STATUSES = ['pending', 'snapshot', 'snapshot_ready', 'external_cleanup', 'local_cleanup'] as const;
const SNAPSHOT_PHASES = ['snapshot', 'snapshot_ready'] as const;

type ActiveJobStatus = (typeof ACTIVE_JOB_STATUSES)[number];
type SnapshotPhase = (typeof SNAPSHOT_PHASES)[number];

interface DeletionRequestContext {
  accountId: string;
  requesterUserId: string;
  requesterAccountId?: string;
}

class AccountDeletionService {
  async requestDeletion(context: DeletionRequestContext) {
    const { accountId, requesterUserId, requesterAccountId } = context;

    await accountDeletionGuard.ensureAllowed(accountId, {
      requesterUserId,
      requesterAccountId,
      details: { phase: 'requestDeletion' },
    });

    const [account] = await db
      .select({ id: accounts.id, ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    const isOwner = account.ownerUserId === requesterUserId;
    const sessionMatchesTarget = requesterAccountId ? requesterAccountId === accountId : false;
    const hasForce = await systemAdminService.hasScope(requesterUserId, 'ACCOUNT_DELETE_FORCE');

    if (!(hasForce || (isOwner && sessionMatchesTarget))) {
      const error = new Error('Not authorized to delete this account');
      (error as any).code = 'ACCOUNT_DELETION_UNAUTHORIZED';
      throw error;
    }

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

  async prepareSnapshot(accountId: string, requesterUserId: string) {
    const job = await this.getActiveJob(accountId);
    if (!job) {
      throw new Error('No deletion job found for this account');
    }

    await this.ensureRequester(job, requesterUserId);

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

  async confirmDeletion(accountId: string, requesterUserId: string) {
    const job = await this.getActiveJob(accountId);
    if (!job) {
      throw new Error('No deletion job found for this account');
    }

    await this.ensureRequester(job, requesterUserId);

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

  private async ensureRequester(job: { requesterUserId: string }, requesterUserId: string) {
    if (job.requesterUserId === requesterUserId) {
      return;
    }

    const hasForce = await systemAdminService.hasScope(requesterUserId, 'ACCOUNT_DELETE_FORCE');
    if (!hasForce) {
      const error = new Error('Not authorized to manage this deletion job');
      (error as any).code = 'ACCOUNT_DELETION_UNAUTHORIZED';
      throw error;
    }
  }
}

export const accountDeletionService = new AccountDeletionService();
