#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

console.log('=== Últimos 5 mensajes en conversación ===\n');

const messages = await db.execute(sql`
    SELECT id, type, content, generated_by, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
    ORDER BY created_at DESC
    LIMIT 5
`) as any;

for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const text = msg.content?.text || '(sin texto)';
    const by = msg.generated_by || 'human';
    console.log(`[${time}] ${msg.type.toUpperCase()} (by: ${by})`);
    console.log(`  ID: ${msg.id.slice(0, 8)}`);
    console.log(`  Text: ${text.substring(0, 80)}\n`);
}

process.exit(0);
