#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

// Asistentes de cuentas reales (no test)
const assistants = await db.execute(sql`
    SELECT 
        a.id,
        a.account_id,
        acc.username,
        a.name,
        a.status,
        a.runtime,
        a.timing_config,
        a.model_config
    FROM fluxcore_assistants a
    JOIN accounts acc ON acc.id = a.account_id
    WHERE acc.username NOT LIKE 'test%'
      AND acc.username NOT LIKE 'aiuser%'
      AND acc.username NOT LIKE 'chat%'
    ORDER BY acc.username, a.status
`);

console.log('🤖 ASISTENTES (cuentas reales):');
for (const a of assistants as any[]) {
    console.log(`\n  [@${a.username}] "${a.name}"`);
    console.log(`    id: ${a.id}`);
    console.log(`    account: ${a.account_id}`);
    console.log(`    status: ${a.status} | runtime: ${a.runtime ?? '(none)'}`);
    console.log(`    timingConfig: ${JSON.stringify(a.timing_config)}`);
    console.log(`    modelConfig:  ${JSON.stringify(a.model_config)}`);
}

// Últimos mensajes con su contenido real
console.log('\n\n📨 ÚLTIMOS 15 MENSAJES (contenido real):');
const msgs = await db.execute(sql`
    SELECT 
        m.id,
        m.conversation_id,
        m.type,
        m.generated_by,
        m.created_at,
        m.content,
        m.sender_account_id,
        sa.username AS sender
    FROM messages m
    LEFT JOIN accounts sa ON sa.id = m.sender_account_id
    ORDER BY m.created_at DESC
    LIMIT 15
`);
for (const m of msgs as any[]) {
    const text = (m.content as any)?.text ?? (m.content as any)?.body ?? JSON.stringify(m.content)?.slice(0, 80);
    console.log(`  [${m.type}/${m.generated_by}] @${m.sender ?? '?'} | ${m.created_at}`);
    console.log(`    conv: ${m.conversation_id}`);
    console.log(`    "${text}"`);
}

// Conversations de cuentas reales
console.log('\n\n💬 CONVERSACIONES (cuentas reales, últimas 5):');
const convos = await db.execute(sql`
    SELECT 
        c.id,
        c.channel,
        c.last_message_at,
        c.last_message_text,
        r.account_a_id,
        r.account_b_id,
        a1.username AS user_a,
        a2.username AS user_b
    FROM conversations c
    JOIN relationships r ON r.id = c.relationship_id
    JOIN accounts a1 ON a1.id = r.account_a_id
    JOIN accounts a2 ON a2.id = r.account_b_id
    WHERE (a1.username NOT LIKE 'test%' AND a1.username NOT LIKE 'aiuser%' AND a1.username NOT LIKE 'chat%')
       OR (a2.username NOT LIKE 'test%' AND a2.username NOT LIKE 'aiuser%' AND a2.username NOT LIKE 'chat%')
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 10
`);
for (const c of convos as any[]) {
    console.log(`  [@${c.user_a} ↔ @${c.user_b}] channel=${c.channel}`);
    console.log(`    id=${c.id} | last: "${(c.last_message_text as string)?.slice(0, 60)}"`);
}

process.exit(0);
