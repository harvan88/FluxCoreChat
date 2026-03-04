#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_ACCOUNT = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('=== DIAGNÓSTICO: CUENTA DANIEL + HAROLD ===\n');

// 1. Encontrar cuenta Daniel
const danielAccount = await db.execute(sql`
    SELECT id, username, display_name
    FROM accounts
    WHERE display_name ILIKE '%daniel%' OR username ILIKE '%daniel%'
    LIMIT 5
`) as any;

console.log('Cuentas con "Daniel":');
for (const acc of danielAccount) {
    console.log(`  ${acc.id.substring(0,8)}: ${acc.display_name} (@${acc.username})`);
}

// Buscar conversaciones recientes (asumiendo Daniel está involucrado)
const danielConvs = await db.execute(sql`
    SELECT c.id, c.relationship_id, c.channel, c.last_message_at
    FROM conversations c
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 10
`) as any;

console.log('\nÚltimas conversaciones:');
for (const conv of danielConvs) {
    console.log(`  ${conv.id.substring(0,8)}: channel=${conv.channel} (rel=${conv.relationship_id?.substring(0,8)})`);
}

if (danielConvs[0]) {
    const convId = danielConvs[0].id;
    const relId = danielConvs[0].relationship_id;
    
    console.log(`\n=== Analizando conversación: ${convId.substring(0,8)} ===`);
    
    // 2. Verificar relationship (no tiene status column)
    const [rel] = await db.execute(sql`
        SELECT account_a_id, account_b_id
        FROM relationships
        WHERE id = ${relId}
    `) as any;
    
    if (rel) {
        console.log(`Relationship:`);
        console.log(`  Account A: ${rel.account_a_id.substring(0,8)}`);
        console.log(`  Account B: ${rel.account_b_id.substring(0,8)}`);
        
        // 3. Verificar política para ambas cuentas
        const policies = await db.execute(sql`
            SELECT account_id, mode
            FROM fluxcore_account_policies
            WHERE account_id IN (${rel.account_a_id}, ${rel.account_b_id})
        `) as any;
        
        console.log(`\nPolíticas:`);
        for (const p of policies) {
            const isHarold = p.account_id === HAROLD_ACCOUNT;
            console.log(`  ${p.account_id.substring(0,8)} ${isHarold ? '(HAROLD)' : '(Daniel?)'}: mode=${p.mode}`);
        }
        
        // 4. Verificar asistentes activos
        const assistants = await db.execute(sql`
            SELECT account_id, id, name, status
            FROM fluxcore_assistants
            WHERE account_id IN (${rel.account_a_id}, ${rel.account_b_id})
            ORDER BY account_id, status DESC, created_at DESC
        `) as any;
        
        console.log(`\nAsistentes:`);
        for (const a of assistants) {
            const isHarold = a.account_id === HAROLD_ACCOUNT;
            console.log(`  ${a.account_id.substring(0,8)} ${isHarold ? '(HAROLD)' : '(Daniel?)'}: ${a.name} - ${a.status}`);
        }
        
        // 5. Verificar últimos mensajes
        const messages = await db.execute(sql`
            SELECT sender_account_id, generated_by, content, created_at
            FROM messages
            WHERE conversation_id = ${convId}
            ORDER BY created_at DESC
            LIMIT 5
        `) as any;
        
        console.log(`\nÚltimos 5 mensajes:`);
        for (const m of messages.reverse()) {
            const isHarold = m.sender_account_id === HAROLD_ACCOUNT;
            const content = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
            const time = new Date(m.created_at).toLocaleTimeString();
            const prefix = m.generated_by === 'ai' ? '🤖' : '👤';
            console.log(`  [${time}] ${prefix} ${isHarold ? 'Harold' : 'Daniel'} (${m.generated_by}): ${content?.text?.substring(0, 40)}`);
        }
    }
}

// 6. HAROLD > HAROLD (self-conversation check)
console.log(`\n=== HAROLD > HAROLD (Self-Conversation) ===`);
const selfConvs = await db.execute(sql`
    SELECT c.id, r.account_a_id, r.account_b_id
    FROM conversations c
    JOIN relationships r ON c.relationship_id = r.id
    WHERE r.account_a_id = ${HAROLD_ACCOUNT}
      AND r.account_b_id = ${HAROLD_ACCOUNT}
`) as any;

if (selfConvs.length > 0) {
    console.log('⚠️  ENCONTRADO: Harold tiene conversación consigo mismo:');
    for (const conv of selfConvs) {
        console.log(`  ${conv.id.substring(0,8)}`);
    }
} else {
    console.log('✅ No hay conversaciones de Harold consigo mismo');
}

process.exit(0);
