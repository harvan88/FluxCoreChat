#!/usr/bin/env bun
/**
 * Audit del estado real del sistema:
 * - Cuentas existentes
 * - Asistentes y sus configuraciones (modo, runtime)
 * - Conversaciones activas
 * - Últimos mensajes
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

console.log('═══════════════════════════════════════════════════════════');
console.log('  AUDIT DE ESTADO REAL — FluxCore v8.3');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Cuentas reales
const accounts = await db.execute(sql`
    SELECT a.id, a.username, a.display_name, a.account_type, u.email
    FROM accounts a
    JOIN users u ON u.id = a.owner_user_id
    ORDER BY a.created_at DESC
    LIMIT 20
`);
console.log('📋 CUENTAS:');
for (const a of accounts as any[]) {
    console.log(`  [${a.account_type}] @${a.username} | ${a.display_name} | ${a.email} | ${a.id}`);
}

// 2. Asistentes y su configuración
console.log('\n🤖 ASISTENTES (todos):');
const assistants = await db.execute(sql`
    SELECT 
        a.id,
        a.account_id,
        acc.username,
        acc.display_name,
        a.name,
        a.status,
        a.runtime,
        a.timing_config->>'mode' AS mode,
        a.model_config->>'provider' AS provider,
        a.model_config->>'model' AS model
    FROM fluxcore_assistants a
    JOIN accounts acc ON acc.id = a.account_id
    ORDER BY acc.username, a.status
`);
for (const a of assistants as any[]) {
    const mode = a.mode ?? '(no mode)';
    const model = a.provider ? `${a.provider}/${a.model}` : '(no model)';
    console.log(`  [@${a.username}] "${a.name}" | status=${a.status} | runtime=${a.runtime ?? '(none)'} | mode=${mode} | model=${model}`);
    console.log(`    id=${a.id} | account=${a.account_id}`);
}

// 3. Conversaciones activas con últimos mensajes
console.log('\n💬 CONVERSACIONES RECIENTES (últimas 10 activas):');
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
    WHERE c.last_message_at IS NOT NULL
    ORDER BY c.last_message_at DESC
    LIMIT 10
`);
for (const c of convos as any[]) {
    const lastMsg = (c.last_message_text as string)?.slice(0, 60) ?? '(none)';
    console.log(`  [@${c.user_a} ↔ @${c.user_b}] channel=${c.channel} | ${c.last_message_at}`);
    console.log(`    id=${c.id} | last: "${lastMsg}"`);
}

// 4. Extension installations: modo configurado desde UI
console.log('\n⚙️  CONFIG DE EXTENSIÓN @fluxcore/asistentes (por cuenta):');
const installs = await db.execute(sql`
    SELECT 
        ei.account_id,
        acc.username,
        ei.config->>'mode' AS mode,
        ei.config->>'tone' AS tone,
        ei.config->>'language' AS language,
        ei.enabled
    FROM extension_installations ei
    JOIN accounts acc ON acc.id = ei.account_id
    WHERE ei.extension_id = '@fluxcore/asistentes'
    ORDER BY acc.username
`);
const installsList = Array.from(installs as any[]);
if (installsList.length === 0) {
    console.log('  (ninguna instalación encontrada)');
} else {
    for (const i of installsList) {
        console.log(`  [@${i.username}] enabled=${i.enabled} | mode=${i.mode ?? '(none)'} | tone=${i.tone ?? '(none)'} | lang=${i.language ?? '(none)'}`);
    }
}

// 5. Queue de cognición (últimas 10 entradas)
console.log('\n🧠 COGNITION QUEUE (últimas 10):');
const queue = await db.execute(sql`
    SELECT 
        q.id,
        q.conversation_id,
        q.account_id,
        acc.username,
        q.attempts,
        q.processed_at,
        q.last_error,
        q.turn_window_expires_at
    FROM fluxcore_cognition_queue q
    LEFT JOIN accounts acc ON acc.id = q.account_id
    ORDER BY q.id DESC
    LIMIT 10
`);
for (const q of queue as any[]) {
    const status = q.processed_at ? `✅ processed` : `⏳ pending`;
    const err = q.last_error ? ` | ❌ ${(q.last_error as string).slice(0, 80)}` : '';
    console.log(`  [${status}] id=${q.id} | @${q.username} | attempts=${q.attempts} | conv=${(q.conversation_id as string)?.slice(0,8)}...${err}`);
}

// 6. Últimos mensajes en el sistema
console.log('\n📨 ÚLTIMOS 10 MENSAJES DEL SISTEMA:');
const msgs = await db.execute(sql`
    SELECT 
        m.id,
        m.conversation_id,
        m.type,
        m.generated_by,
        m.created_at,
        LEFT(m.content->>'text', 80) AS text,
        sa.username AS sender
    FROM messages m
    LEFT JOIN accounts sa ON sa.id = m.sender_account_id
    ORDER BY m.created_at DESC
    LIMIT 10
`);
for (const m of msgs as any[]) {
    console.log(`  [${m.type}/${m.generated_by}] @${m.sender ?? '?'} | ${m.created_at}`);
    console.log(`    "${m.text ?? '(sin texto)'}"`);
}

console.log('\n═══════════════════════════════════════════════════════════');
process.exit(0);
