import { db, sql } from '@fluxcore/db';

async function listColumns(table: string) {
    try {
        const rows = await db.execute(sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = ${table}
            ORDER BY ordinal_position
        `);
        console.log(`\n📊 Columns of ${table}:`);
        for (const row of rows) {
            console.log(`- ${row.column_name} (${row.data_type}, null=${row.is_nullable})`);
        }
    } catch (err) {
        console.error(`Error listing columns of ${table}:`, err);
    }
}

async function run() {
    await listColumns('fluxcore_assistants');
    await listColumns('fluxcore_agents');
    process.exit(0);
}

run();
