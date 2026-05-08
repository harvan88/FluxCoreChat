import aiService from './apps/api/src/services/ai.service';
import { bootstrapKernel } from './apps/api/src/bootstrap/kernel.bootstrap';

async function test() {
  try {
    await bootstrapKernel();
    const status = await aiService.getStatusForAccount('ace5d88a-1a80-4f43-805b-f31184e59595');
    console.log('STATUS:', status);
  } catch (err: any) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  }
  process.exit(0);
}

test();
