
import { coreEventBus } from '../apps/api/src/core/events';
import { aiOrchestrator } from '../apps/api/src/services/ai-orchestrator.service';

console.log('--- START DEBUG ---');
console.log('Orchestrator imported:', !!aiOrchestrator);

// Test listener local
coreEventBus.on('core:message_received', (p) => {
    console.log('LOCAL LISTENER: Event received');
});

console.log('Emitting event...');
coreEventBus.emit('core:message_received', {
    envelope: { id: 'test' } as any,
    result: { success: true, automation: { mode: 'automatic', shouldProcess: true } } as any
});
console.log('--- END DEBUG ---');
