import type { JobsOptions, Job } from 'bullmq';
import { createQueue, createWorker } from '../queues/bullmq';
import { getDeletionJobById, markDeletionJobFailed, processDeletionJob } from './account-deletion.processor';

const QUEUE_NAME = 'account-deletion';

type AccountDeletionQueueData = {
  jobId: string;
};

const defaultJobOptions: JobsOptions = {
  attempts: Number(process.env.ACCOUNT_DELETION_QUEUE_ATTEMPTS ?? '5'),
  backoff: {
    type: 'exponential',
    delay: Number(process.env.ACCOUNT_DELETION_QUEUE_BACKOFF_MS ?? '2000'),
  },
  removeOnComplete: 100,
  removeOnFail: 1000,
};

let queue: ReturnType<typeof createQueue<AccountDeletionQueueData>> | null = null;
let worker: ReturnType<typeof createWorker<AccountDeletionQueueData>> | null = null;

const getQueue = () => {
  if (!queue) {
    queue = createQueue<AccountDeletionQueueData>(QUEUE_NAME, {
      defaultJobOptions,
    });
  }
  return queue;
};

export const enqueueAccountDeletionJob = async (jobId: string) => {
  await getQueue().add(jobId, { jobId });
};

export const getAccountDeletionQueueStats = async () => {
  const q = getQueue();
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
    q.getDelayedCount(),
    q.getPausedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
};

export const startAccountDeletionQueue = () => {
  if (worker) {
    return;
  }

  const concurrency = Number(process.env.ACCOUNT_DELETION_QUEUE_CONCURRENCY ?? '2');

  worker = createWorker<AccountDeletionQueueData>(
    QUEUE_NAME,
    async (bullJob: Job<AccountDeletionQueueData>) => {
      const jobId = bullJob.data?.jobId;
      if (!jobId) {
        console.warn('[AccountDeletionQueue] Missing jobId in payload');
        return;
      }

      const job = await getDeletionJobById(jobId);
      if (!job) {
        console.warn('[AccountDeletionQueue] Deletion job not found', jobId);
        return;
      }

      await processDeletionJob(job);
    },
    { concurrency },
  );

  worker.on('failed', async (bullJob: Job<AccountDeletionQueueData> | undefined, error: Error) => {
    const jobId = bullJob?.data?.jobId;
    if (!jobId) {
      return;
    }

    const job = await getDeletionJobById(jobId);
    if (!job) {
      return;
    }

    await markDeletionJobFailed(job, error?.message ?? 'Unknown error');
  });

  console.log('🧹 AccountDeletion queue worker started (BullMQ)');
};

export const stopAccountDeletionQueue = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }

  if (queue) {
    await queue.close();
    queue = null;
  }
};
