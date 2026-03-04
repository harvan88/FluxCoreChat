#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

console.log('=== VERIFICACIÓN DE TABLAS KERNEL ===\n');

const tables = [
    'fluxcore_account_policies',
    'fluxcore_assistants',
    'fluxcore_cognition_queue',
    'fluxcore_projector_cursors',
    'messages',
    'conversations',
];

for (const table of tables) {
    try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`)) as any;
        const count = result[0]?.count || 0;
        console.log(`✓ ${table}: ${count} registros`);
    } catch (error: any) {
        console.log(`❌ ${table}: ERROR - ${error.message}`);
    }
}

// Verificar policy mode
const [policy] = await db.execute(sql`
    SELECT mode, response_delay_ms FROM fluxcore_account_policies 
    WHERE account_id = '3e94f74e-e6a0-4794-bd66-16081ee3b02d'
`) as any;
console.log(`\nPolicy mode para Harold: ${policy?.mode || 'NO ENCONTRADA'}`);

// Verificar assistant activo
const [assistant] = await db.execute(sql`
    SELECT name, status, runtime FROM fluxcore_assistants
    WHERE account_id = '3e94f74e-e6a0-4794-bd66-16081ee3b02d' AND status = 'active'
`) as any;
console.log(`Assistant activo: ${assistant?.name || 'NO ENCONTRADO'} (runtime: ${assistant?.runtime})`);

// Verificar cognition queue reciente
const queueCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM fluxcore_cognition_queue 
    WHERE created_at > NOW() - INTERVAL '1 hour'
`) as any;
console.log(`\nCognition queue (última hora): ${queueCount[0]?.count || 0} entradas`);

process.exit(0);
