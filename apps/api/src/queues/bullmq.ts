import { Queue, Worker, type JobsOptions, type QueueOptions, type WorkerOptions, type Processor } from 'bullmq';
import { getRedisConnection } from './redis-connection';

type ConnectionOptions = QueueOptions['connection'];

const withConnection = <T extends { connection?: ConnectionOptions }>(options?: T): T & { connection: ConnectionOptions } => {
  const connection = options?.connection ?? getRedisConnection();
  return {
    ...(options || {}),
    connection,
  } as T & { connection: ConnectionOptions };
};

export const createQueue = <T = unknown>(name: string, options?: Partial<QueueOptions>) => {
  return new Queue<T>(name, withConnection(options));
};

export const createWorker = <T = unknown>(name: string, processor: Processor<T>, options?: Partial<WorkerOptions>) => {
  return new Worker<T>(name, processor, withConnection(options));
};

export type EnqueueOptions = JobsOptions;
