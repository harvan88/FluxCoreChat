#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_EMAIL = 'harvan@hotmail.es';
const HAROLD_PASSWORD = 'test123';
const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

console.log('=== ENVIANDO MENSAJE CON LOGS CRÍTICOS ===\n');

// Login
const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HAROLD_EMAIL, password: HAROLD_PASSWORD }),
});

if (!loginRes.ok) {
    console.log('❌ Login failed:', loginRes.status);
    process.exit(1);
}

const { token } = await loginRes.json() as any;
console.log('✓ Login exitoso\n');

// Send message with CORRECT format
const TEST_TEXT = `Test con logs - ${new Date().toISOString()}`;

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

if (!msgRes.ok) {
    console.log('❌ Send failed:', msgRes.status);
    const error = await msgRes.json();
    console.log('Error:', error);
    process.exit(1);
}

console.log('✓ Mensaje enviado\n');
console.log('👀 REVISAR LOGS DEL SERVIDOR para ver el flujo completo\n');
console.log('Esperando 10 segundos...');

await new Promise(resolve => setTimeout(resolve, 10000));

// Check for AI response
const messages = await db.execute(sql`
    SELECT type, generated_by, content, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
      AND created_at > NOW() - INTERVAL '1 minute'
    ORDER BY created_at DESC
`) as any;

console.log(`\n📊 Mensajes recientes: ${messages.length}`);
const aiMsg = messages.find((m: any) => m.generated_by === 'ai');

if (aiMsg) {
    const content = typeof aiMsg.content === 'string' ? JSON.parse(aiMsg.content) : aiMsg.content;
    console.log('✅ AI RESPONDIÓ:', content?.text?.substring(0, 80));
} else {
    console.log('❌ AI NO RESPONDIÓ');
}

process.exit(0);
