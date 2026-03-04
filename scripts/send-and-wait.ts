#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_EMAIL = 'harvan@hotmail.es';
const HAROLD_PASSWORD = 'test123';
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

console.log('Enviando mensaje de prueba...\n');

// Login
const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HAROLD_EMAIL, password: HAROLD_PASSWORD }),
});
const { token } = await loginRes.json() as any;
console.log('✓ Token obtenido');

// Send message
const msgRes = await fetch('http://localhost:3000/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
        conversationId: CONV_ID,
        type: 'outgoing',
        text: 'Hola, este es un mensaje de prueba. ¿Puedes responder?',
    }),
});

const msgData = await msgRes.json() as any;
console.log('✓ Mensaje enviado\n');

// Wait and check for AI response
console.log('Esperando respuesta del AI (15 segundos)...');
await new Promise(resolve => setTimeout(resolve, 15000));

const messages = await db.execute(sql`
    SELECT type, generated_by, content, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
    ORDER BY created_at DESC
    LIMIT 5
`) as any;

console.log('\n=== Últimos mensajes ===');
for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    const text = content?.text?.substring(0, 60) || '(sin texto)';
    console.log(`[${time}] ${msg.type} by ${msg.generated_by}`);
    console.log(`   ${text}\n`);
}

const aiMessages = messages.filter((m: any) => m.generated_by === 'ai');
if (aiMessages.length > 0) {
    console.log('✅ AI RESPONDIÓ!');
} else {
    console.log('❌ AI NO RESPONDIÓ');
}

process.exit(0);
