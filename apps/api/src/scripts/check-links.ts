import { db, sql } from '@fluxcore/db';

async function checkLinks() {
    try {
        const rows = await db.execute(sql`
            SELECT a.id, a.name, COUNT(ai.id) as instruction_count
            FROM fluxcore_assistants a
            LEFT JOIN fluxcore_assistant_instructions ai ON ai.assistant_id = a.id
            GROUP BY a.id, a.name
        `);
        console.log('--- Assistant Links Check ---');
        for (const row of rows) {
            console.log(`- Assistant: ${row.name} (${row.id}), Instructions: ${row.instruction_count}`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
}

checkLinks();
