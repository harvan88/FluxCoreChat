import type { JobsOptions, Job } from 'bullmq';
import { createQueue, createWorker } from '../queues/bullmq';
import { getDeletionJobById, markDeletionJobFailed, processDeletionJob } from './account-deletion.processor';
import { metricsService } from '../services/metrics.service';

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
let queueMetricsInterval: NodeJS.Timeout | null = null;

const getQueue = () => {
  if (!queue) {
    queue = createQueue<AccountDeletionQueueData>(QUEUE_NAME, {
      defaultJobOptions,
    });
  }
  return queue;
};

const fetchQueueStats = async () => {
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

const recordQueueMetrics = async () => {
  try {
    const stats = await fetchQueueStats();
    metricsService.gauge('account_deletion.queue.waiting', stats.waiting);
    metricsService.gauge('account_deletion.queue.active', stats.active);
    metricsService.gauge('account_deletion.queue.completed', stats.completed);
    metricsService.gauge('account_deletion.queue.failed', stats.failed);
    metricsService.gauge('account_deletion.queue.delayed', stats.delayed);
    metricsService.gauge('account_deletion.queue.paused', stats.paused);
  } catch (error) {
    console.error('[AccountDeletionQueue] Failed to record queue metrics', error);
  }
};

export const enqueueAccountDeletionJob = async (jobId: string) => {
  await getQueue().add(jobId, { jobId });
};

export const getAccountDeletionQueueStats = async () => {
  return fetchQueueStats();
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
      await recordQueueMetrics();
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
    await recordQueueMetrics();
  });

  console.log('🧹 AccountDeletion queue worker started (BullMQ)');

  queueMetricsInterval = setInterval(() => {
    void recordQueueMetrics();
  }, Number(process.env.ACCOUNT_DELETION_QUEUE_METRICS_INTERVAL_MS ?? '30000'));

  void recordQueueMetrics();
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

  if (queueMetricsInterval) {
    clearInterval(queueMetricsInterval);
    queueMetricsInterval = null;
  }
};
