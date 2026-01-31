import { db } from '@fluxcore/db';
import { accountDeletionJobs, accountDeletionLogs } from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';
import { broadcastSystemEvent } from '../websocket/system-events';
import { ensureAccountDeletionAllowed } from '../services/account-deletion.guard';
import { accountDeletionExternalService } from '../services/account-deletion.external';
import { accountPurgeService } from '../services/account-deletion.local';

type DeletionJobStatus = 'external_cleanup' | 'local_cleanup' | 'completed' | 'failed';

type DeletionJob = typeof accountDeletionJobs.$inferSelect;

class AccountDeletionWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 5000;
  private ticking = false;

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      if (this.ticking) return;
      this.ticking = true;
      this.tick()
        .catch((error) => {
          console.error('[AccountDeletionWorker] tick error', error);
        })
        .finally(() => {
          this.ticking = false;
        });
    }, this.intervalMs);

    console.log('🧹 AccountDeletionWorker started');
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    const job = await this.getNextJob();
    if (!job) {
      return;
    }

    try {
      if (job.status === 'external_cleanup') {
        await this.ensureJobAllowed(job);
        await this.processExternalCleanup(job);
      } else if (job.status === 'local_cleanup') {
        await this.ensureJobAllowed(job);
        await this.processLocalCleanup(job);
      }
    } catch (error) {
      console.error('[AccountDeletionWorker] job failed', job.id, error);
      await this.markFailed(job, (error as Error)?.message ?? 'Unknown error');
    }
  }

  private ensureJobAllowed(job: DeletionJob) {
    return ensureAccountDeletionAllowed(job.accountId, {
      requesterUserId: job.requesterUserId,
      requesterAccountId: job.requesterAccountId ?? undefined,
      details: {
        phase: job.status,
        jobId: job.id,
      },
    });
  }

  private async getNextJob(): Promise<DeletionJob | null> {
    const [job] = await db
      .select()
      .from(accountDeletionJobs)
      .where(inArray(accountDeletionJobs.status as any, ['external_cleanup', 'local_cleanup']))
      .limit(1);

    return job ?? null;
  }

  private async processExternalCleanup(job: DeletionJob) {
    const startedAt = job.metadata?.externalCleanupStartedAt ?? new Date().toISOString();

    await accountDeletionExternalService.run(job);

    const refreshedJob = await this.getJobById(job.id);
    if (!refreshedJob) {
      return null;
    }

    if (this.requiresSnapshot(refreshedJob) && !this.snapshotReady(refreshedJob)) {
      console.log('[AccountDeletionWorker] Snapshot still pending for job', job.id, '- keeping external_cleanup');
      await this.log(job.accountId, job.id, 'external_cleanup', 'Snapshot generation pending, retrying');
      return refreshedJob;
    }

    const metadata = {
      ...((refreshedJob.metadata ?? job.metadata) || {}),
      externalCleanupStartedAt: startedAt,
      externalCleanupFinishedAt: new Date().toISOString(),
    };
    const externalState = (refreshedJob.externalState ?? job.externalState) || {};

    const [updated] = await db
      .update(accountDeletionJobs)
      .set({
        status: 'local_cleanup',
        phase: 'local_cleanup',
        metadata,
        externalState,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id))
      .returning();

    await this.log(job.accountId, job.id, 'local_cleanup', 'External cleanup completed');
    console.log('[AccountDeletionWorker] External cleanup done for job', job.id, '→ local_cleanup');

    return updated;
  }

  private async processLocalCleanup(job: DeletionJob) {
    const startedAt = job.metadata?.localCleanupStartedAt ?? new Date().toISOString();
    if (this.requiresSnapshot(job) && !this.snapshotReady(job)) {
      console.log('[AccountDeletionWorker] Blocking local cleanup, snapshot still pending for job', job.id);
      await this.log(job.accountId, job.id, 'local_cleanup', 'Waiting for snapshot before purge');
      return;
    }

    const summary = await accountPurgeService.purgeAccountData(job.accountId);

    const metadata = {
      ...(job.metadata || {}),
      localCleanupStartedAt: startedAt,
      localCleanupFinishedAt: new Date().toISOString(),
      localCleanupSummary: summary,
    };

    await db
      .update(accountDeletionJobs)
      .set({
        status: 'completed',
        phase: 'completed',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id));

    await this.log(job.accountId, job.id, 'completed', 'Local cleanup completed', {
      summary,
    });
    console.log('[AccountDeletionWorker] Job completed', job.id);

    broadcastSystemEvent({
      type: 'account:deleted',
      accountId: job.accountId,
      jobId: job.id,
    });
  }

  private async markFailed(job: DeletionJob, reason: string) {
    await db
      .update(accountDeletionJobs)
      .set({
        status: 'failed',
        phase: 'failed',
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(accountDeletionJobs.id, job.id));

    await this.log(job.accountId, job.id, 'failed', reason);

    broadcastSystemEvent({
      type: 'account:deletion_failed',
      accountId: job.accountId,
      jobId: job.id,
      reason,
    });
  }

  private async log(
    accountId: string,
    jobId: string,
    status: DeletionJobStatus,
    reason: string,
    details: Record<string, unknown> = {},
  ) {
    await db.insert(accountDeletionLogs).values({
      accountId,
      jobId,
      status,
      reason,
      details,
      createdAt: new Date(),
    });
  }

  private requiresSnapshot(job: DeletionJob) {
    const metadata = (job.metadata ?? {}) as Record<string, unknown>;
    return (metadata?.dataHandling as string | undefined) !== 'delete_all';
  }

  private snapshotReady(job: DeletionJob) {
    const metadata = (job.metadata ?? {}) as Record<string, any>;
    return Boolean(job.snapshotReadyAt || metadata?.snapshotPath);
  }

  private async getJobById(jobId: string): Promise<DeletionJob | null> {
    const [job] = await db
      .select()
      .from(accountDeletionJobs)
      .where(eq(accountDeletionJobs.id, jobId))
      .limit(1);

    return job ?? null;
  }
}

export const accountDeletionWorker = new AccountDeletionWorker();
