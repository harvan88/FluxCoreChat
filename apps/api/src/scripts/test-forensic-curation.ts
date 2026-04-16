
import { db, aiTraces } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

/**
 * Test de Curaduría Forense (End-to-End Logic)
 * 
 * Este test valida que:
 * 1. La persistencia manual guarde los datos en la estructura correcta (requestBody.contextSnapshot).
 * 2. El mapeo de fechas sea compatible con PostgreSQL.
 */
async function testForensicCuration() {
  console.log('🧪 Iniciando Test de Integración: Curaduría Forense');

  const testAccountId = '520954df-cd5b-499a-a435-a5c0be4fb4e8'; // Floristería
  const testMessageId = `test-msg-${Date.now()}`;

  // 1. Simular datos capturados en el frontend
  const mockTraceData = {
    accountId: testAccountId,
    conversationId: '6f73b6d1-0137-4202-8cdb-0f4700998133',
    messageId: testMessageId,
    runtime: 'local-test',
    provider: 'groq',
    model: 'llama-3.1',
    mode: 'manual_audit',
    requestContext: {
      _cognitiveSteps: {
        'FASE_TEST': { input: { q: 'hola' }, output: { res: 'mundo' }, status: 'completed' }
      },
      actionCount: 1,
      actionTypes: ['send_message']
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  console.log('📡 1. Simulando persistencia manual (persistTrace)...');
  
  // Usamos el servicio real si es accesible, o simulamos la lógica del ws-handler
  const { aiTraceService } = await import('../services/ai-trace.service');
  const traceId = await aiTraceService.persistTrace(mockTraceData);

  if (!traceId) {
    throw new Error('❌ Error: persistTrace devolvió NULL. Ver logs de servidor.');
  }
  console.log(`✅ 1. Traza persistida con ID: ${traceId}`);

  // 2. Verificar estructura en Base de Datos
  console.log('🔍 2. Verificando estructura en DB...');
  const [row] = await db.select().from(aiTraces).where(eq(aiTraces.id, traceId as string)).limit(1);

  if (!row) throw new Error('❌ Error: La traza no se encuentra en la DB.');
  
  const cognitiveSteps = (row.requestBody as any)?.contextSnapshot?._cognitiveSteps;
  if (!cognitiveSteps || !cognitiveSteps['FASE_TEST']) {
    console.error('Estructura actual:', JSON.stringify(row.requestBody, null, 2));
    throw new Error('❌ Error: La estructura de _cognitiveSteps es incorrecta o está vacía.');
  }
  console.log('✅ 2. Estructura de DB validada (requestBody.contextSnapshot._cognitiveSteps OK)');

  // 3. Simular carga en Frontend (Logic Check)
  console.log('🖥️ 3. Simulando carga en Frontend (useTelemetry logic)...');
  const traceFromApi = row; // Lo que devuelve el API
  const requestBody = (traceFromApi.requestBody as any) || {};
  const context = requestBody.contextSnapshot || {};
  const FE_cognitiveSteps = context._cognitiveSteps || {};
  
  if (Object.keys(FE_cognitiveSteps).length === 0) {
    throw new Error('❌ Error: El mapeo del Frontend (loadHistory) fallaría con esta estructura.');
  }
  console.log(`✅ 3. Mapeo Frontend validado (${Object.keys(FE_cognitiveSteps).length} fases encontradas)`);

  console.log('\n✨ TEST EXITOSO: El sistema de curaduría forense es íntegro.');
  
  // Limpieza
  await db.delete(aiTraces).where(eq(aiTraces.id, traceId as string));
  console.log('🧹 Datos de test eliminados.');
  process.exit(0);
}

testForensicCuration().catch(err => {
  console.error('\n❌ TEST FALLIDO:');
  console.error(err.message);
  process.exit(1);
});
