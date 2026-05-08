import { bootstrapKernel } from './bootstrap/kernel.bootstrap';
import { kernelDispatcher } from './core/kernel-dispatcher';
import { startProjectors } from './core/kernel/projector-runner';

import { automationScheduler } from './services/automation-scheduler.service';
import { wesScheduler } from './services/wes-scheduler.service';
import { mediaOrchestrator } from './services/media-orchestrator.service';
import { cognitionWorker } from './workers/cognition-worker';
import { chatCoreOutboxService } from './services/chatcore-outbox.service';
import { accountDeletionWorker } from './workers/account-deletion.worker';
import { featureFlags } from './config/feature-flags';
import { startAccountDeletionQueue, stopAccountDeletionQueue } from './workers/account-deletion.queue';
import { closeRedisConnection } from './queues/redis-connection';
import { runtimeGateway } from './services/fluxcore/runtime-gateway.service';
import { asistentesLocalRuntime } from './services/fluxcore/runtimes/asistentes-local.runtime';
import { asistentesOpenAIRuntime } from './services/fluxcore/runtimes/asistentes-openai.runtime';
import { fluxiRuntime } from './services/fluxcore/runtimes/fluxi.runtime';

const cleanupTasks: Array<() => Promise<void> | void> = [];
const addCleanupTask = (task: () => Promise<void> | void) => {
  cleanupTasks.push(task);
};

async function startKernelRuntime() {
  console.log('🧠 [KernelRuntime] Bootstrapping FluxCore kernel process');

  try {
    await bootstrapKernel();
  } catch (error) {
    console.error('[KernelRuntime] Failed during bootstrapKernel', error);
    throw error;
  }

  try {
    await kernelDispatcher.start();
  } catch (error) {
    console.error('[KernelRuntime] Failed to start kernel dispatcher', error);
    throw error;
  }

  try {
    startProjectors();
  } catch (error) {
    console.error('[KernelRuntime] Failed to start projectors', error);
    throw error;
  }

  console.log('   - Services Initialization');
  automationScheduler.init();
  wesScheduler.init();
  mediaOrchestrator.init();

  console.log('   - FluxCore v8.2 Runtime Registration');
  runtimeGateway.register(asistentesLocalRuntime);
  runtimeGateway.register(asistentesOpenAIRuntime);
  runtimeGateway.register(fluxiRuntime);

  console.log('   - CognitionWorker (Always ON)');
  cognitionWorker.start();
  addCleanupTask(() => cognitionWorker.stop());

  const useAccountDeletionQueue = featureFlags.accountDeletionQueue;

  if (useAccountDeletionQueue) {
    startAccountDeletionQueue();
    addCleanupTask(async () => {
      await stopAccountDeletionQueue();
      await closeRedisConnection();
    });
    console.log('🧹 AccountDeletion processing running on BullMQ queue');
  } else {
    accountDeletionWorker.start();
    addCleanupTask(() => accountDeletionWorker.stop());
    console.log('🧹 AccountDeletion processing running on interval worker');
  }

  addCleanupTask(() => wesScheduler.stop());

  chatCoreOutboxService.startWorker();
  console.log('📮 ChatCore Outbox worker started for Kernel certification');
  
  console.log('✅ Kernel & Services started successfully in Worker Mode');
}

startKernelRuntime().catch((error) => {
  console.error('[KernelRuntime] Fatal error — process exiting', error);
  process.exit(1);
});

const handleShutdown = async (signal: NodeJS.Signals) => {
  console.log(`[KernelRuntime] Received ${signal}, shutting down...`);
  kernelDispatcher.stop();
  
  for (const task of cleanupTasks.reverse()) {
    try {
      await task();
    } catch (error) {
      console.error('[KernelRuntime] cleanup task failed', error);
    }
  }
  process.exit(0);
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal as NodeJS.Signals, handleShutdown);
});
