import { sql } from 'drizzle-orm';
import { db } from '@fluxcore/db';

async function main() {
    console.log('🔍 Verifying migration 038 + adapter seed...\n');

    // 1. Registered adapters
    const adapters = await db.execute(sql`
        SELECT adapter_id, driver_id, adapter_class, adapter_version
        FROM fluxcore_reality_adapters
        ORDER BY created_at
    `) as any;
    console.log('📡 Reality Adapters:');
    for (const row of (adapters.rows ?? adapters)) {
        console.log(`   ${row.adapter_id} | ${row.driver_id} | ${row.adapter_class}`);
    }

    // 2. fluxcore_actors columns
    const actorCols = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'fluxcore_actors'
        AND column_name IN ('type', 'external_key', 'tenant_id', 'created_from_signal')
        ORDER BY column_name
    `) as any;
    console.log('\n🧑 fluxcore_actors new columns:');
    const actorColRows = actorCols.rows ?? actorCols;
    for (const row of actorColRows) {
        console.log(`   ${row.column_name}: ${row.data_type}`);
    }

    // 3. fluxcore_actor_identity_links table
    const linkTable = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'fluxcore_actor_identity_links'
        ORDER BY ordinal_position
    `) as any;
    console.log('\n🔗 fluxcore_actor_identity_links columns:');
    const linkRows = linkTable.rows ?? linkTable;
    for (const row of linkRows) {
        console.log(`   ${row.column_name}: ${row.data_type}`);
    }

    // 4. conversations new columns
    const convCols = await db.execute(sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'conversations'
        AND column_name IN ('visitor_token', 'identity_linked_at', 'linked_account_id')
        ORDER BY column_name
    `) as any;
    console.log('\n💬 conversations new columns:');
    const convColRows = convCols.rows ?? convCols;
    for (const row of convColRows) {
        console.log(`   ${row.column_name}: ${row.data_type}`);
    }

    const adapterRows: any[] = adapters.rows ?? adapters;
    const allGood =
        adapterRows.some((r: any) => r.adapter_id === 'chatcore-gateway') &&
        adapterRows.some((r: any) => r.adapter_id === 'chatcore-webchat-gateway') &&
        actorColRows.length === 4 &&
        linkRows.length >= 5 &&
        convColRows.length === 3;

    console.log(allGood ? '\n✅ All invariants verified!' : '\n⚠️  Some checks failed — review above.');
    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
