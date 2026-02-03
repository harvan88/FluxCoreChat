import { db, accountDeletionJobs, accountDeletionLogs } from '@fluxcore/db';
import { eq, inArray } from 'drizzle-orm';
import { ensureAccountDeletionAllowed } from '../services/account-deletion.guard';
import { accountDeletionExternalService } from '../services/account-deletion.external';
import { accountPurgeService } from '../services/account-deletion.local';
import { broadcastSystemEvent } from '../websocket/system-events';
import { metricsService } from '../services/metrics.service';

export type DeletionJob = typeof accountDeletionJobs.$inferSelect;
export type DeletionJobStatus = 'external_cleanup' | 'local_cleanup' | 'completed' | 'failed';

const ACTIVE_STATUSES: DeletionJobStatus[] = ['external_cleanup', 'local_cleanup'];

const logAccountDeletionEvent = (event: Record<string, unknown>) => {
  console.info(
    '[AccountDeletion]',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...event,
    }),
  );
};

export const getNextDeletionJob = async (): Promise<DeletionJob | null> => {
  const [job] = await db
    .select()
    .from(accountDeletionJobs)
    .where(inArray(accountDeletionJobs.status as any, ACTIVE_STATUSES as any))
    .orderBy(accountDeletionJobs.updatedAt)
    .limit(1);

  return job ?? null;
};

export const getDeletionJobById = async (jobId: string): Promise<DeletionJob | null> => {
  const [job] = await db
    .select()
    .from(accountDeletionJobs)
    .where(eq(accountDeletionJobs.id, jobId))
    .limit(1);

  return job ?? null;
};

export const processDeletionJob = async (job: DeletionJob) => {
  if (!ACTIVE_STATUSES.includes(job.status as DeletionJobStatus)) {
    return;
  }

  metricsService.increment('account_deletion.jobs_processing_total', 1, { phase: job.status });

  await ensureAccountDeletionAllowed(job.accountId, {
    requesterUserId: job.requesterUserId,
    requesterAccountId: job.requesterAccountId ?? undefined,
    details: {
      phase: job.status,
      jobId: job.id,
    },
  });

  if (job.status === 'external_cleanup') {
    await processExternalCleanup(job);
  } else if (job.status === 'local_cleanup') {
    await processLocalCleanup(job);
  }
};

export const markDeletionJobFailed = async (job: DeletionJob, reason: string) => {
  metricsService.increment('account_deletion.jobs_failed_total', 1, {
    phase: job.status,
  });

  await db
    .update(accountDeletionJobs)
    .set({
      status: 'failed',
      phase: 'failed',
      failureReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(accountDeletionJobs.id, job.id));

  await logDeletionJob(job.accountId, job.id, 'failed', reason);

  broadcastSystemEvent({
    type: 'account:deletion_failed',
    accountId: job.accountId,
    jobId: job.id,
    reason,
  });

  logAccountDeletionEvent({
    event: 'job_failed',
    jobId: job.id,
    accountId: job.accountId,
    reason,
    phase: job.status,
  });
};

const processExternalCleanup = async (job: DeletionJob) => {
  const startedAt = job.metadata?.externalCleanupStartedAt ?? new Date().toISOString();
  const start = Date.now();

  await accountDeletionExternalService.run(job);

  const refreshedJob = await getDeletionJobById(job.id);
  const metadata = {
    ...((refreshedJob?.metadata ?? job.metadata) || {}),
    externalCleanupStartedAt: startedAt,
    externalCleanupFinishedAt: new Date().toISOString(),
  };
  const externalState = (refreshedJob?.externalState ?? job.externalState) || {};

  await db
    .update(accountDeletionJobs)
    .set({
      status: 'local_cleanup',
      phase: 'local_cleanup',
      metadata,
      externalState,
      updatedAt: new Date(),
    })
    .where(eq(accountDeletionJobs.id, job.id));

  await logDeletionJob(job.accountId, job.id, 'local_cleanup', 'External cleanup completed');
  logAccountDeletionEvent({
    event: 'phase_completed',
    nextPhase: 'local_cleanup',
    jobId: job.id,
    accountId: job.accountId,
  });

  metricsService.increment('account_deletion.phase_completed_total', 1, {
    phase: 'external_cleanup',
  });
  metricsService.recordTiming('account_deletion.external_cleanup', Date.now() - start, {
    accountId: job.accountId,
  });
};

const processLocalCleanup = async (job: DeletionJob) => {
  const startedAt = job.metadata?.localCleanupStartedAt ?? new Date().toISOString();
  const start = Date.now();

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

  await logDeletionJob(job.accountId, job.id, 'completed', 'Local cleanup completed', { summary });
  logAccountDeletionEvent({
    event: 'job_completed',
    jobId: job.id,
    accountId: job.accountId,
    summary,
  });

  broadcastSystemEvent({
    type: 'account:deleted',
    accountId: job.accountId,
    jobId: job.id,
  });

  metricsService.increment('account_deletion.phase_completed_total', 1, {
    phase: 'local_cleanup',
  });
  metricsService.recordTiming('account_deletion.local_cleanup', Date.now() - start, {
    accountId: job.accountId,
  });

  const confirmedAt = job.metadata?.confirmedAt ? Date.parse(job.metadata.confirmedAt as string) : job.updatedAt?.getTime?.() ?? Date.now();
  metricsService.recordTiming('account_deletion.total_duration', Date.now() - confirmedAt, {
    accountId: job.accountId,
  });
};

const logDeletionJob = async (
  accountId: string,
  jobId: string,
  status: DeletionJobStatus,
  reason: string,
  details: Record<string, unknown> = {},
) => {
  await db.insert(accountDeletionLogs).values({
    accountId,
    jobId,
    status,
    reason,
    details,
    createdAt: new Date(),
  });
};
