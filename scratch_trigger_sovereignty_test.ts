
import { cognitiveDispatcher } from './apps/api/src/services/fluxcore/cognitive-dispatcher.service';
import { runtimeGateway } from './apps/api/src/services/fluxcore/runtime-gateway.service';
import { AsistentesLocalRuntime } from './apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime';
import { db, accounts, conversations, messages } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

// Registrar el runtime manualmente para el contexto del script
runtimeGateway.register(new AsistentesLocalRuntime());

async function triggerSovereigntyTest() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const conversationId = 'f0f0c12e-b2e2-4e60-9afc-5bc47fbf127e'; // ID del reporte anterior
    const text = '¿Están abiertos ahora?';

    console.log(`--- 🚀 DISPARANDO PRUEBA DE SOBERANÍA ---`);
    console.log(`Mensaje: "${text}"`);
    console.log(`Account: ${accountId}`);

    try {
        // Ejecutar el dispatcher directamente para generar telemetría
        const result = await cognitiveDispatcher.dispatch({
            accountId,
            conversationId,
            text,
            senderId: 'user-test-sovereignty'
        });

        console.log(`\n--- ✅ RESPUESTA RECIBIDA ---`);
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error en el test:', e);
    }
    
    process.exit(0);
}

triggerSovereigntyTest().catch(console.error);
