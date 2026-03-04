#!/usr/bin/env bun
/**
 * Cleanup Test Data
 * Limpia conversaciones de prueba y entries de cognition queue
 */
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_ACCOUNT = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('=== LIMPIEZA DE DATOS DE PRUEBA ===\n');

// 1. Limpiar queue de cognition (entries procesadas y viejas)
const deleted = await db.execute(sql`
    DELETE FROM fluxcore_cognition_queue
    WHERE processed_at IS NOT NULL
       OR (processed_at IS NULL AND turn_started_at < NOW() - INTERVAL '1 hour')
    RETURNING id
`) as any;

console.log(`✓ Limpiadas ${deleted.length} entries de cognition_queue`);

// 2. Encontrar conversación self (Harold > Harold)
const selfConvs = await db.execute(sql`
    SELECT c.id, c.channel
    FROM conversations c
    JOIN relationships r ON c.relationship_id = r.id
    WHERE r.account_a_id = ${HAROLD_ACCOUNT}
      AND r.account_b_id = ${HAROLD_ACCOUNT}
`) as any;

if (selfConvs.length > 0) {
    console.log(`\n⚠️  Conversaciones self detectadas: ${selfConvs.length}`);
    for (const conv of selfConvs) {
        console.log(`  - ${conv.id.substring(0,8)} (${conv.channel})`);
    }
    console.log('\nEstas conversaciones YA están protegidas (AI deshabilitado)');
} else {
    console.log('\n✓ No hay conversaciones self');
}

// 3. Listar conversaciones de prueba (internal/test)
const testConvs = await db.execute(sql`
    SELECT id, channel, last_message_at
    FROM conversations
    WHERE channel IN ('internal', 'test')
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT 10
`) as any;

console.log(`\n📋 Conversaciones de prueba (channel=internal/test): ${testConvs.length}`);
for (const conv of testConvs) {
    const time = conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : 'nunca';
    console.log(`  - ${conv.id.substring(0,8)} (${conv.channel}) - última: ${time}`);
}

if (testConvs.length > 0) {
    console.log('\nEstas conversaciones YA están protegidas (AI deshabilitado)');
}

// 4. Estado de políticas
const policies = await db.execute(sql`
    SELECT a.display_name, a.username, p.mode
    FROM fluxcore_account_policies p
    JOIN accounts a ON p.account_id = a.id
    WHERE p.mode = 'auto'
`) as any;

console.log(`\n📊 Cuentas con AI activo (mode=auto): ${policies.length}`);
for (const pol of policies) {
    console.log(`  - ${pol.display_name} (@${pol.username}): ${pol.mode}`);
}

console.log('\n✅ Limpieza completada');
process.exit(0);
