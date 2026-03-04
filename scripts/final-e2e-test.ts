#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_EMAIL = 'harvan@hotmail.es';
const HAROLD_PASSWORD = 'test123';
const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

console.log('=== TEST END-TO-END COMPLETO ===\n');

// 1. Login
console.log('1. Autenticando...');
const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HAROLD_EMAIL, password: HAROLD_PASSWORD }),
});
const { token } = await loginRes.json() as any;
console.log('   ✓ Token obtenido\n');

// 2. Send message with CORRECT format
console.log('2. Enviando mensaje...');
const TEST_TEXT = `Hola, soy Harold. Esta es una prueba final del sistema. ¿Puedes confirmar que recibes este mensaje? Timestamp: ${Date.now()}`;

const msgRes = await fetch('http://localhost:3000/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
        conversationId: CONV_ID,
        senderAccountId: HAROLD_ACCOUNT_ID,
        content: { text: TEST_TEXT },
        type: 'outgoing',
    }),
});

const msgData = await msgRes.json() as any;
console.log(`   Status: ${msgRes.status}`);
if (msgRes.status !== 200) {
    console.log('   ❌ ERROR:', msgData);
    process.exit(1);
}
console.log(`   ✓ Mensaje enviado (ID: ${msgData.data?.messageId?.slice(0, 8)})\n`);

// 3. Wait for AI processing
console.log('3. Esperando procesamiento del AI (12 segundos)...');
await new Promise(resolve => setTimeout(resolve, 12000));

// 4. Check for AI responses
const messages = await db.execute(sql`
    SELECT type, generated_by, content, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
    ORDER BY created_at DESC
    LIMIT 10
`) as any;

console.log('\n4. Resultados:\n');
let aiResponseFound = false;
let humanMessageFound = false;

for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    const text = content?.text || '(sin texto)';
    
    if (msg.generated_by === 'ai') {
        console.log(`   [${time}] 🤖 AI: ${text.substring(0, 80)}`);
        aiResponseFound = true;
    } else if (text.includes('Timestamp:')) {
        console.log(`   [${time}] 👤 Human: ${text.substring(0, 80)}`);
        humanMessageFound = true;
    }
}

console.log('\n=== RESULTADO FINAL ===');
console.log(`Mensaje humano enviado: ${humanMessageFound ? '✅' : '❌'}`);
console.log(`Respuesta AI recibida: ${aiResponseFound ? '✅ ¡ÉXITO!' : '❌ FALLÓ'}`);

if (!aiResponseFound) {
    // Check cognition queue for errors
    const queue = await db.execute(sql`
        SELECT last_error, attempts
        FROM fluxcore_cognition_queue
        WHERE conversation_id = ${CONV_ID}
        ORDER BY turn_started_at DESC
        LIMIT 1
    `) as any;
    
    if (queue[0]?.last_error) {
        console.log(`\n⚠️  Error en cognition queue: ${queue[0].last_error.substring(0, 100)}`);
    }
}

process.exit(aiResponseFound ? 0 : 1);
