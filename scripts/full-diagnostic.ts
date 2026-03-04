#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

console.log('=== DIAGNÓSTICO COMPLETO ===\n');

// 1. Policy mode
const [policy] = await db.execute(sql`
    SELECT mode FROM fluxcore_account_policies 
    WHERE account_id = ${HAROLD_ACCOUNT_ID}
`) as any;
console.log('1. Policy mode:', policy?.mode || 'NOT FOUND');

// 2. Active assistant
const [assistant] = await db.execute(sql`
    SELECT id, name, status, runtime
    FROM fluxcore_assistants
    WHERE account_id = ${HAROLD_ACCOUNT_ID} AND status = 'active'
`) as any;
console.log('2. Assistant:', assistant ? `${assistant.name} (${assistant.runtime})` : 'NOT FOUND');

// 3. Last 3 messages
const messages = await db.execute(sql`
    SELECT type, generated_by, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
    ORDER BY created_at DESC
    LIMIT 3
`) as any;
console.log('\n3. Últimos 3 mensajes:');
messages.forEach((m: any) => {
    const time = new Date(m.created_at).toLocaleTimeString();
    console.log(`   [${time}] ${m.type} by ${m.generated_by}`);
});

// 4. Cognition queue
const queue = await db.execute(sql`
    SELECT id, processed_at, last_error, attempts
    FROM fluxcore_cognition_queue
    ORDER BY turn_started_at DESC
    LIMIT 3
`) as any;
console.log('\n4. Cognition queue (últimas 3 entradas):');
if (queue.length === 0) {
    console.log('   (vacía)');
} else {
    queue.forEach((q: any) => {
        const status = q.processed_at ? '✓ procesada' : '⏳ pendiente';
        console.log(`   ID ${q.id}: ${status}, attempts=${q.attempts}`);
        if (q.last_error) {
            console.log(`      Error: ${q.last_error.substring(0, 60)}`);
        }
    });
}

// 5. Journal recent activity
const journal = await db.execute(sql`
    SELECT sequence_number, event_type, created_at
    FROM fluxcore_journal
    ORDER BY sequence_number DESC
    LIMIT 5
`) as any;
console.log('\n5. Últimos 5 eventos del journal:');
journal.forEach((j: any) => {
    const time = new Date(j.created_at).toLocaleTimeString();
    console.log(`   Seq#${j.sequence_number}: ${j.event_type} @ ${time}`);
});

process.exit(0);
