/**
 * Quick diagnostic: Check Fluxi runtime state for the FluxCore account
 */
import { db, accountRuntimeConfig, fluxcoreActionAudit, aiTraces, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

const FLUXCORE_ACCOUNT = '5f96c4c5-473b-4574-93ce-53f54225dd18';
const CONVERSATION_ID = 'eadb0912-127c-4738-af5e-18b0ecb52670';

async function main() {
    console.log('\n=== 1. RUNTIME CONFIGS (ALL ACCOUNTS) ===');
    const configs = await db.select().from(accountRuntimeConfig);
    if (configs.length === 0) {
        console.log('  (none configured - all accounts default to @fluxcore/asistentes)');
    } else {
        configs.forEach(c => console.log(`  Account: ${c.accountId} -> Runtime: ${c.activeRuntimeId}`));
    }

    console.log('\n=== 2. WORK DEFINITIONS (FluxCore Account) ===');
    const workDefs = await db.select().from(fluxcoreWorkDefinitions).where(eq(fluxcoreWorkDefinitions.accountId, FLUXCORE_ACCOUNT));
    if (workDefs.length === 0) {
        console.log('  (none - Fluxi has no WorkDefinitions to interpret)');
    } else {
        workDefs.forEach(wd => console.log(`  ${wd.id}: ${wd.name} (version ${wd.version})`));
    }

    console.log('\n=== 3. LATEST TRACES (for conversation) ===');
    const traces = await db.select().from(aiTraces)
        .where(eq(aiTraces.conversationId, CONVERSATION_ID))
        .orderBy(desc(aiTraces.createdAt))
        .limit(3);
    if (traces.length === 0) {
        console.log('  (no traces found for this conversation)');
    } else {
        traces.forEach(t => {
            console.log(`  Trace ${t.id}:`);
            console.log(`    Runtime: ${t.runtime}`);
            console.log(`    Provider: ${t.provider}`);
            console.log(`    Model: ${t.model}`);
            console.log(`    Duration: ${t.durationMs}ms`);
            console.log(`    Created: ${t.createdAt}`);
        });
    }

    console.log('\n=== 4. ACTION AUDIT (for conversation) ===');
    try {
        const audits = await db.select().from(fluxcoreActionAudit)
            .where(eq(fluxcoreActionAudit.conversationId, CONVERSATION_ID))
            .limit(5);
        if (audits.length === 0) {
            console.log('  (no action audits found)');
        } else {
            audits.forEach((a: any) => {
                console.log(`  Action: ${a.actionType} | Status: ${a.status} | Runtime: ${a.runtimeId}`);
            });
        }
    } catch (e: any) {
        console.log(`  (audit query error: ${e.message?.slice(0, 80)})`);
    }

    console.log('\n=== DONE ===');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
