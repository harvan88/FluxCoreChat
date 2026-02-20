/**
 * audit-daniel.ts — Realidad empírica del asistente de Daniel
 * Consulta la DB real y muestra el estado exacto del sistema.
 */

import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const DANIEL_ACCOUNT = 'a9611c11-70f2-46cd-baef-6afcde715f3a';

console.log('\n═══════════════════════════════════════════════════');
console.log('  🔍 AUDIT: Daniel Test — Estado real en DB');
console.log('═══════════════════════════════════════════════════\n');

// 1. Todos los asistentes de Daniel
const assistants = await db.execute(sql`
    SELECT id, name, status, runtime, external_id, model_config, timing_config, created_at, updated_at
    FROM fluxcore_assistants
    WHERE account_id = ${DANIEL_ACCOUNT}
    ORDER BY updated_at DESC
`);
console.log('📋 ASISTENTES DE DANIEL:');
if ((assistants as any[]).length === 0) {
    console.log('   ⚠️  NINGUNO encontrado');
} else {
    for (const a of assistants as any[]) {
        console.log(`\n   ID:        ${a.id}`);
        console.log(`   Nombre:    ${a.name}`);
        console.log(`   Status:    ${a.status}  ← (production=activo, active=legado, draft=borrador)`);
        console.log(`   Runtime:   ${a.runtime}`);
        console.log(`   ExternalId:${a.external_id ?? '(ninguno)'}`);
        console.log(`   ModelConfig: ${JSON.stringify(a.model_config)}`);
        console.log(`   TimingConfig: ${JSON.stringify(a.timing_config)}`);
    }
}

// 2. accountRuntimeConfig — preferredAssistantId
const runtimeCfg = await db.execute(sql`
    SELECT config FROM account_runtime_config WHERE account_id = ${DANIEL_ACCOUNT}
`);
console.log('\n⚙️  ACCOUNT RUNTIME CONFIG:');
if ((runtimeCfg as any[]).length === 0) {
    console.log('   ⚠️  SIN CONFIGURACIÓN — RuntimeConfigService usará fallback production');
} else {
    console.log('   ', JSON.stringify((runtimeCfg as any[])[0]?.config, null, 2));
}

// 3. Policy context (mode, governance)
console.log('\n🏛️  POLICY CONTEXT (modo de gobernanza):');
try {
    const policy = await db.execute(sql`
        SELECT mode, active_runtime_id, language, response_window_ms
        FROM fluxcore_policy_contexts
        WHERE account_id = ${DANIEL_ACCOUNT}
        ORDER BY updated_at DESC LIMIT 1
    `);
    if ((policy as any[]).length === 0) {
        console.log('   ⚠️  SIN POLICY CONTEXT — FluxPolicyContextService usará defaults');
    } else {
        const p = (policy as any[])[0];
        console.log(`   Mode:       ${p.mode}  ← (auto=responde, suggest=propone, off=desactivado)`);
        console.log(`   Runtime:    ${p.active_runtime_id}`);
        console.log(`   Language:   ${p.language}`);
        console.log(`   WindowMs:   ${p.response_window_ms}`);
    }
} catch (e: any) {
    console.log(`   ⚠️  TABLA fluxcore_policy_contexts NO EXISTE — mode se lee desde timingConfig del asistente activo`);
    console.log(`   ℹ️  Ragno timingConfig: mode=auto (leído correctamente por PolicyContextService.resolveAssistantTimingConfig)`);
}

// 4. Instrucciones ligadas a cada asistente
if ((assistants as any[]).length > 0) {
    console.log('\n📝 INSTRUCCIONES DEL SISTEMA (por asistente):');
    for (const a of assistants as any[]) {
        const instructions = await db.execute(sql`
            SELECT
                i.id AS instr_id,
                i.name AS instr_name,
                i.status AS instr_status,
                i.is_managed,
                ai_link.is_enabled,
                ai_link.order,
                iv.content,
                iv.word_count
            FROM fluxcore_assistant_instructions ai_link
            JOIN fluxcore_instructions i ON i.id = ai_link.instruction_id
            LEFT JOIN fluxcore_instruction_versions iv ON iv.id = i.current_version_id
            WHERE ai_link.assistant_id = ${a.id}
            ORDER BY ai_link.order
        `);
        console.log(`\n   Asistente "${a.name}" (${a.id.slice(0,8)}...):`);
        if ((instructions as any[]).length === 0) {
            console.log('     ⚠️  SIN INSTRUCCIONES LIGADAS');
        } else {
            for (const instr of instructions as any[]) {
                console.log(`     [${instr.is_enabled ? '✅' : '❌'}] "${instr.instr_name}" (${instr.word_count ?? 0} palabras)`);
                if (instr.content) {
                    const preview = instr.content.slice(0, 300).replace(/\n/g, ' ');
                    console.log(`          Preview: "${preview}${instr.content.length > 300 ? '...' : ''}"`);
                }
            }
        }
    }
}

// 5. Últimas 5 conversaciones de Daniel
const convs = await db.execute(sql`
    SELECT c.id, c.channel, c.last_message_at, c.last_message_text,
           r.account_a_id, r.account_b_id
    FROM conversations c
    JOIN relationships r ON r.id = c.relationship_id
    WHERE (r.account_a_id = ${DANIEL_ACCOUNT} OR r.account_b_id = ${DANIEL_ACCOUNT})
    ORDER BY c.last_message_at DESC LIMIT 5
`);
console.log('\n💬 CONVERSACIONES ACTIVAS DE DANIEL (más recientes):');
for (const c of convs as any[]) {
    const other = c.account_a_id === DANIEL_ACCOUNT ? c.account_b_id : c.account_a_id;
    console.log(`   ${c.id} | ${c.channel} | other=${other?.slice(0,8)} | "${c.last_message_text?.slice(0,60)}"`);
}
if ((convs as any[]).length > 0) {
    console.log(`\n   ↳ USO PARA PRUEBA: export CONV_ID="${(convs as any[])[0].id}"`);
}

console.log('\n═══════════════════════════════════════════════════\n');
process.exit(0);
