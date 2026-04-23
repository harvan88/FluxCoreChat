import { actionExecutor } from '../apps/api/src/services/fluxcore/action-executor.service';
import { db, fluxcoreSignals, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import { kernel } from '../apps/api/src/core/kernel';


// Mismo conversationId que usa tu DB de test
const CONVERSATION_ID = '5ad75a5f-f0ea-4cc8-a94c-812f67a4f446';
const ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr. Jones u otra
const TARGET_ID = '535949b8-58a9-4310-87a7-42a2480f5746';
// ID de Plantilla: "Información de tratamiento" (4804b6a8-30cb-4944-92f9-2e7f0f6915ea)
const TEMPLATE_ID = '4804b6a8-30cb-4944-92f9-2e7f0f6915ea';

async function main() {
    console.log('=== TEST UNITARIO: SOberanía de Plantillas ===\n');

    // 1. Contador de Signals previos
    const prevSignals = await db.select().from(fluxcoreSignals).where(eq(fluxcoreSignals.factType, 'AI_RESPONSE_GENERATED'));
    console.log(`[INIT] Total AI_RESPONSE_GENERATED en Kernel: ${prevSignals.length}`);

    // 2. Contador de Messages previos
    const prevMsgs = await db.select().from(messages).where(eq(messages.conversationId, CONVERSATION_ID));
    console.log(`[INIT] Total Mensajes en ChatCore (Conv ${CONVERSATION_ID.slice(0,8)}): ${prevMsgs.length}`);

    // 3. Simular Acción de Template de IA
    const action = {
        type: 'send_template',
        templateId: TEMPLATE_ID,
        conversationId: CONVERSATION_ID,
        variables: { Tratamiento: 'Prueba Forense Automática', Precio_de_tratamiento: '$99.999', Caracteristicas: 'Validación de Soberanía' }
    } as any;

    console.log(`\n🚀 [EXEC] FluxCore dispara comando send_template...`);
    const result = await actionExecutor.execute([action], {
        turnId: 99999, // Ficticio
        conversationId: CONVERSATION_ID,
        accountId: ACCOUNT_ID,
        targetAccountId: TARGET_ID,
        runtimeId: 'test-runtime',
        runtimeConfig: { model: 'test', runtimeId: 'test' } as any
    });

    console.log(`✅ [EXEC RESULT]:`, result.results[0]?.success, 'MessageID Asignado:', result.results[0]?.messageId);

    // 4. Verificación Fuerte
    await new Promise(r => setTimeout(r, 2000)); // Esperar async ChatProjector

    const currentSignals = await db.select().from(fluxcoreSignals).where(eq(fluxcoreSignals.factType, 'AI_RESPONSE_GENERATED'));
    console.log(`\n[VERIFY] Total AI_RESPONSE_GENERATED en Kernel AHORA: ${currentSignals.length}`);
    
    if (currentSignals.length > prevSignals.length) {
        console.log(`➡️  ÉXITO SOberano: La señal se escribió en el Kernel antes de salir.`);
        console.log(currentSignals[currentSignals.length - 1].evidenceRaw);
    } else {
        console.log(`❌ FRACASO: La señal de Kernel NO se emitió.`);
    }

    const currentMsgs = await db.select().from(messages).where(eq(messages.conversationId, CONVERSATION_ID));
    console.log(`\n[VERIFY] Total Mensajes en ChatCore AHORA: ${currentMsgs.length}`);
    if (currentMsgs.length > prevMsgs.length) {
        console.log(`➡️  ÉXITO Proyección: ChatProjector interceptó el Kernel y guardó en ChatCore.`);
        console.log(`Test Message:` + JSON.stringify(currentMsgs[0].content));
    } else {
        console.log(`❌ FRACASO: ChatCore no recibió el mensaje.`);
    }
    
    process.exit(0);
}

main().catch(console.error);
