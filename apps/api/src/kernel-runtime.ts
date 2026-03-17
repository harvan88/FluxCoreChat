import { bootstrapKernel } from './bootstrap/kernel.bootstrap';
import { kernelDispatcher } from './core/kernel-dispatcher';
import { startProjectors } from './core/kernel/projector-runner';

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
}

startKernelRuntime().catch((error) => {
  console.error('[KernelRuntime] Fatal error — process exiting', error);
  process.exit(1);
});

const handleShutdown = (signal: NodeJS.Signals) => {
  console.log(`[KernelRuntime] Received ${signal}, shutting down...`);
  kernelDispatcher.stop();
  process.exit(0);
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal as NodeJS.Signals, handleShutdown);
});
