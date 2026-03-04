#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_USER_ID = '535949b8-58a9-4310-87a7-42a2480f5746';
const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';
const TEST_MESSAGE = 'Hola Daniel, esta es una prueba del sistema de AI. Por favor responde.';

console.log('Enviando mensaje de prueba...');

// Get auth token
const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'harvan@hotmail.es', password: 'test123' }),
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
        senderAccountId: HAROLD_ACCOUNT_ID,
        content: { text: TEST_MESSAGE },
        type: 'outgoing',
    }),
});

const msgData = await msgRes.json() as any;
console.log('✓ Mensaje enviado:', msgData.data?.messageId?.slice(0, 8));

// Wait for turn processing
await new Promise(resolve => setTimeout(resolve, 8000));

// Check queue
const queueResult = await db.execute(sql`
    SELECT id, processed_at, last_error
    FROM fluxcore_cognition_queue
    WHERE processed_at IS NULL
    ORDER BY turn_started_at DESC
    LIMIT 1
`) as any;

if (queueResult[0]) {
    console.log('⚠ Queue entry pending:', queueResult[0].id);
    if (queueResult[0].last_error) {
        console.log('   Error:', queueResult[0].last_error.substring(0, 100));
    }
} else {
    console.log('✓ Queue procesada - revisar logs para ver respuesta AI');
}

process.exit(0);
