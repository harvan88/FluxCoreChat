
import { aiTraceService } from '../services/ai-trace.service';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('🚀 [Diagnostic] Starting Persistence Test...');
  
  const testTrace = {
    accountId: '3e94f74e-e6a0-4794-bd66-16081ee3b02d', // ID de cuenta del usuario
    conversationId: uuidv4(),
    messageId: uuidv4(),
    runtime: 'diagnostic',
    provider: 'local-test',
    model: 'gpt-mock',
    mode: 'auto' as const,
    startedAt: new Date(),
    completedAt: new Date(),
    durationMs: 100,
    requestBody: { test: 'Scalability Audit v8.8' },
    requestContext: {
      _cognitiveSteps: {
        'FASE 0': { status: 'ok', detail: 'Diagnostic Mock Phase 0' },
        'FASE 1': { status: 'ok', detail: 'Diagnostic Mock Phase 1' },
      }
    }
  };

  console.log('📦 [Diagnostic] Attempting to persist trace...');
  
  try {
    const traceId = await aiTraceService.persistTrace(testTrace as any);
    
    if (traceId) {
      console.log(`✅ [Diagnostic] SUCCESS! Trace persisted with ID: ${traceId}`);
      process.exit(0);
    } else {
      console.error('❌ [Diagnostic] FAILURE: Service returned null (check ai-trace logs above)');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('💥 [Diagnostic] CRASH during persistence:');
    console.error(err.stack);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
