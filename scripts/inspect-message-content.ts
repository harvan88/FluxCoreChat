#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';

const messages = await db.execute(sql`
    SELECT id, type, content, generated_by, created_at
    FROM messages
    WHERE conversation_id = ${CONV_ID}
    ORDER BY created_at DESC
    LIMIT 3
`) as any;

console.log('=== Estructura de contenido de mensajes ===\n');

for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleTimeString();
    console.log(`[${time}] ${msg.type} - ${msg.id.slice(0, 8)}`);
    console.log('Content type:', typeof msg.content);
    console.log('Content:', JSON.stringify(msg.content, null, 2));
    console.log('---\n');
}

process.exit(0);
