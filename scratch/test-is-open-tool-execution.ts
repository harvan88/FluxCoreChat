import { createCapabilityExecutionService } from '../apps/api/src/services/capability-execution.service';

// Mock dependencies
const mockDeps = {
  fetchRagContext: async () => ({ context: 'rag context' }),
  listTemplates: async () => [],
  sendTemplate: async () => ({ messageId: '123', status: 'sent' }),
};

const executionService = createCapabilityExecutionService(mockDeps);

const context = {
  accountId: '65d340af-97ff-4c9b-85d2-b378badeacf4',
  conversationId: 'test-conv-123',
  userMessage: '¿Están abiertos?',
};

async function runTests() {
  console.log('--- TEST 1: Llamada sin locationId (usará default) ---');
  const res1 = await executionService.executeTool('is_business_open', {}, context);
  console.log('Resultado 1:', JSON.stringify(res1, null, 2));

  console.log('\n--- TEST 2: Llamada con locationId específico (Sede B) ---');
  const res2 = await executionService.executeTool('is_business_open', { 
    locationId: '0014183a-52c5-478e-a62d-60c2c9009e31' 
  }, context);
  console.log('Resultado 2:', JSON.stringify(res2, null, 2));

  console.log('\n--- TEST 3: Llamada en fecha especial (Día de la Madre - 6 de Mayo) ---');
  const res3 = await executionService.executeTool('is_business_open', { 
    at: '2026-05-06T10:00:00-03:00' 
  }, context);
  console.log('Resultado 3:', JSON.stringify(res3, null, 2));
  
  console.log('\n--- TEST 4: Llamada en horario cerrado (Lunes 03:00 AM) ---');
  const res4 = await executionService.executeTool('is_business_open', { 
    at: '2026-05-04T03:00:00-03:00' 
  }, context);
  console.log('Resultado 4:', JSON.stringify(res4, null, 2));
}

runTests().catch(console.error);
