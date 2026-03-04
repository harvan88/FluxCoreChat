#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';
const HAROLD_ACCOUNT = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('=== VERIFICACIÓN DE RESPUESTA AI ===\n');

// Verificar últimos 10 mensajes
const messages = await db.execute(sql`
    SELECT id, type, generated_by, content, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
    ORDER BY created_at DESC
    LIMIT 10
`) as any;

console.log(`Total mensajes en conversación: ${messages.length}\n`);

let lastHuman = null;
let lastAI = null;

for (const msg of messages.reverse()) {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
    const text = content?.text || '(sin texto)';
    const prefix = msg.generated_by === 'ai' ? '🤖' : '👤';
    
    console.log(`[${time}] ${prefix} ${msg.generated_by}: ${text.substring(0, 60)}`);
    
    if (msg.generated_by === 'human') lastHuman = msg;
    if (msg.generated_by === 'ai') lastAI = msg;
}

console.log('\n=== DIAGNÓSTICO ===');
console.log(`Último mensaje humano: ${lastHuman ? new Date(lastHuman.created_at).toLocaleTimeString() : 'NINGUNO'}`);
console.log(`Último mensaje AI: ${lastAI ? new Date(lastAI.created_at).toLocaleTimeString() : 'NINGUNO'}`);

if (lastHuman && (!lastAI || new Date(lastAI.created_at) < new Date(lastHuman.created_at))) {
    console.log('\n❌ AI NO HA RESPONDIDO al último mensaje humano');
    
    // Verificar queue
    const queue = await db.execute(sql`
        SELECT id, processed_at, last_error, attempts
        FROM fluxcore_cognition_queue
        WHERE conversation_id = ${CONV_ID}
        ORDER BY turn_started_at DESC
        LIMIT 1
    `) as any;
    
    if (queue[0]) {
        console.log(`\nQueue entry ID ${queue[0].id}:`);
        console.log(`  Procesada: ${queue[0].processed_at ? 'SÍ' : 'NO'}`);
        console.log(`  Intentos: ${queue[0].attempts}`);
        if (queue[0].last_error) {
            console.log(`  Error: ${queue[0].last_error.substring(0, 100)}`);
        }
    } else {
        console.log('\n⚠️  No hay entry en cognition_queue para esta conversación');
    }
} else if (lastAI && new Date(lastAI.created_at) > new Date(lastHuman?.created_at || 0)) {
    console.log('\n✅ AI RESPONDIÓ correctamente');
} else {
    console.log('\n⚠️  Sin mensajes recientes para evaluar');
}

process.exit(0);
