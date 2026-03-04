#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

console.log('=== SELF-CONVERSATION DIAGNOSTIC ===');

const conversations = await db.execute(sql`
    SELECT c.id, c.channel, c.last_message_at,
           r.account_a_id, r.account_b_id
    FROM conversations c
    JOIN relationships r ON c.relationship_id = r.id
    WHERE r.account_a_id = r.account_b_id
    ORDER BY c.last_message_at DESC NULLS LAST
`) as any[];

if (!conversations.length) {
    console.log('✅ No self conversations found.');
    process.exit(0);
}

console.log(`Encontradas ${conversations.length} conversaciones self.`);

for (const conv of conversations) {
    const msgs = await db.execute(sql`
        SELECT id, generated_by, sender_account_id, content, created_at
        FROM messages
        WHERE conversation_id = ${conv.id}
        ORDER BY created_at DESC
        LIMIT 5
    `) as any[];

    const lastHuman = msgs.find(m => m.generated_by === 'human');
    const lastAI = msgs.find(m => m.generated_by === 'ai');

    console.log(`\nConv ${conv.id} (channel=${conv.channel})`);
    console.log(`  Último mensaje: ${conv.last_message_at}`);
    console.log(`  Último HUMAN: ${lastHuman ? lastHuman.created_at : 'NONE'}`);
    console.log(`  Último AI: ${lastAI ? lastAI.created_at : 'NONE'}`);

    const recentAI = msgs.filter(m => m.generated_by === 'ai');
    if (recentAI.length) {
        console.log('  ⚠️ AI respondió (debería estar bloqueado)');
        for (const m of recentAI) {
            const content = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
            console.log(`    - ${m.created_at}: ${content?.text}`);
        }
    } else {
        console.log('  ✅ Sin respuestas de AI en los últimos mensajes');
    }
}

process.exit(0);
