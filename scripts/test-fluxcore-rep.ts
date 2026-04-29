
/**
 * TEST: FLUXCORE REPRESENTATIVE FLOW
 * Scenario: Dr. Jones sends a message to FluxCore.
 * FluxCore (Fluxi) responds proposing a template creation.
 */

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000/ws';

// Account IDs from user context
const DR_JONES_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';
const FLUXCORE_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18';
const CONVERSATION_ID = 'eadb0912-127c-4738-af5e-18b0ecb52670';

async function main() {
    console.log('🧪 TEST: FLUXCORE REPRESENTATIVE FLOW');
    console.log('=====================================');
    console.log(`👤 Dr. Jones (${DR_JONES_ID.slice(0, 8)}) → 🤖 FluxCore (${FLUXCORE_ID.slice(0, 8)})`);

    const messageText = 'Hola FluxCore, necesito una plantilla para dar la bienvenida a mis pacientes de ortodoncia.';

    // 1. Send message as Dr. Jones
    console.log('📡 Sending message...');
    const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-account-id': DR_JONES_ID,
        },
        body: JSON.stringify({
            conversationId: CONVERSATION_ID,
            content: { text: messageText },
            senderAccountId: DR_JONES_ID,
            targetAccountId: FLUXCORE_ID, // Recipient is FluxCore
            type: 'outgoing'
        })
    });

    if (!res.ok) {
        console.error('❌ Failed to send message:', await res.text());
        return;
    }

    const msg = await res.json();
    console.log('✅ Message sent. ID:', msg.id);

    console.log('\n⏳ Waiting for FluxCore (Fluxi) to process and respond...');
    console.log('Check the server logs for [CognitiveDispatcher] and [FluxiRuntime] activity.');
    console.log('FluxCore should propose a "template_creation_v1" work.');
}

main().catch(console.error);
