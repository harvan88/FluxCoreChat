#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_EMAIL = 'harvan@hotmail.es';
const HAROLD_PASSWORD = 'test123';
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

console.log('=== TRAZANDO FLUJO DE MENSAJE ===\n');

// Count messages before
const [beforeCount] = await db.execute(sql`
    SELECT COUNT(*) as count FROM messages WHERE conversation_id = ${CONV_ID}
`) as any;
console.log(`Mensajes antes: ${beforeCount.count}`);

// Login and send
const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HAROLD_EMAIL, password: HAROLD_PASSWORD }),
});
const { token } = await loginRes.json() as any;

console.log('Enviando mensaje...');
const msgRes = await fetch('http://localhost:3000/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
        conversationId: CONV_ID,
        type: 'outgoing',
        text: 'TRACE TEST MESSAGE ' + Date.now(),
    }),
});

const msgData = await msgRes.json() as any;
console.log('Response status:', msgRes.status);
console.log('Response data:', msgData);

// Wait a bit
await new Promise(resolve => setTimeout(resolve, 2000));

// Count messages after
const [afterCount] = await db.execute(sql`
    SELECT COUNT(*) as count FROM messages WHERE conversation_id = ${CONV_ID}
`) as any;
console.log(`\nMensajes después: ${afterCount.count}`);
console.log(`Diferencia: ${afterCount.count - beforeCount.count}`);

// Check queue
const queueEntries = await db.execute(sql`
    SELECT id, conversation_id, processed_at, turn_started_at
    FROM fluxcore_cognition_queue
    WHERE conversation_id = ${CONV_ID}
    ORDER BY turn_started_at DESC
    LIMIT 3
`) as any;

console.log(`\nCognition queue entries para esta conversación: ${queueEntries.length}`);
queueEntries.forEach((q: any) => {
    const status = q.processed_at ? 'procesada' : 'PENDIENTE';
    console.log(`  ID ${q.id}: ${status}`);
});

process.exit(0);
