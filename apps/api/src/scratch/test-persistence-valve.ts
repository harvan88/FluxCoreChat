
import { db, aiTraces } from '@fluxcore/db';
import { count, eq } from 'drizzle-orm';
import { monitoringRegistry } from '../telemetry/tracer';
import { cognitiveDispatcher } from '../services/fluxcore/cognitive-dispatcher.service';
import { runtimeGateway } from '../services/fluxcore/runtime-gateway.service';

async function testPersistenceValve() {
    // Registrar runtime dummy para que el dispatch no falle
    runtimeGateway.register({
        runtimeId: 'asistentes-local',
        displayName: 'Test Runtime',
        handleMessage: async () => [{ type: 'send_message', content: 'Respuesta de prueba' }]
    });

    const testAccountId = '3e94f74e-e6a0-4794-bd66-16081ee3b02d'; // Harvan Test ID
    const conversationId = '5ad75a5f-f0ea-4cc8-a94c-812f67a4f446';
    
    console.log('--- INICIO PRUEBA DE VÁLVULA DE PERSISTENCIA ---');

    // 1. Verificar estado inicial
    const [initialCount] = await db.select({ value: count() }).from(aiTraces).where(eq(aiTraces.accountId, testAccountId));
    console.log(`[1] Trazas iniciales en DB para ${testAccountId}: ${initialCount.value}`);

    // 2. Simular Turno con Válvula OFF
    console.log('[2] Simulando turno con Válvula OFF...');
    monitoringRegistry.unregister(testAccountId); // Asegurar que está fuera
    
    await cognitiveDispatcher.dispatch({
        accountId: testAccountId,
        conversationId,
        content: { text: "Prueba Válvula OFF" },
        runtimeConfig: { provider: 'openai', model: 'gpt-4' }
    } as any);

    const [afterOffCount] = await db.select({ value: count() }).from(aiTraces).where(eq(aiTraces.accountId, testAccountId));
    console.log(`[2] Trazas después de Válvula OFF: ${afterOffCount.value} (Esperado: igual que inicial)`);

    // 3. Simular Turno con Válvula ON (Modo REC)
    console.log('[3] Simulando turno con Válvula ON (Modo REC)...');
    monitoringRegistry.register(testAccountId, true); // Registrar y activar persistencia
    
    await cognitiveDispatcher.dispatch({
        accountId: testAccountId,
        conversationId,
        content: { text: "Prueba Válvula ON" },
        runtimeConfig: { provider: 'openai', model: 'gpt-4' }
    } as any);

    const [afterOnCount] = await db.select({ value: count() }).from(aiTraces).where(eq(aiTraces.accountId, testAccountId));
    console.log(`[3] Trazas después de Válvula ON: ${afterOnCount.value} (Esperado: ${Number(initialCount.value) + 1})`);

    // 4. Limpiar
    console.log('[4] Limpiando registro de monitoreo...');
    monitoringRegistry.unregister(testAccountId);

    if (Number(afterOnCount.value) > Number(initialCount.value) && Number(afterOffCount.value) === Number(initialCount.value)) {
        console.log('✅ PRUEBA EXITOSA: La válvula funciona correctamente.');
    } else {
        console.log('❌ PRUEBA FALLIDA: Revisar lógica de persistencia.');
    }
}

testPersistenceValve().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
