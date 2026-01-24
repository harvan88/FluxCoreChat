
import { messageCore } from '../apps/api/src/core/message-core';

async function main() {
    // Datos extraídos de tus logs
    const conversationId = '1de569d1-4ded-4502-954e-bb8b417e9509';
    const myAccountId = 'cadcb892-c4d1-42e5-bbac-6655047cbb56'; // Tu cuenta actual
    const otherAccountId = 'a9611c11-70f2-46cd-baef-6afcde715f3a'; // La otra parte (Cliente)

    console.log('🎭 Simulando mensaje de CLIENTE...');
    console.log(`   De: ${otherAccountId} (Cliente)`);
    console.log(`   Para: ${myAccountId} (Tu Negocio)`);
    console.log(`   Conv: ${conversationId}`);

    const text = "Hola, necesito consultar un precio. ¿Están abiertos?";
    console.log(`\n📨 Enviando: "${text}"`);

    const result = await messageCore.receive({
        conversationId,
        senderAccountId: otherAccountId, // El cliente envía
        content: { text },
        type: 'incoming',
        generatedBy: 'human',
        // El target es la cuenta receptora (tú)
        targetAccountId: myAccountId
    });

    console.log('✅ Mensaje entregado al Core:', result.success);
    if (result.automation) {
        console.log('🤖 Automation Result:', result.automation);
        if (result.automation.mode === 'automatic') {
            console.log('🚀 AUTOMATIC mode detected! La IA debería responder en unos segundos.');
        } else {
            console.warn('⚠️ Automation NO es automatic:', result.automation.mode);
        }
    }
}

main().catch(console.error).then(() => process.exit(0));
