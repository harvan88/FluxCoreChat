import { db, sql } from '@fluxcore/db';

async function checkAssistantData() {
    try {
        const rows = await db.execute(sql`
            SELECT id, name, model_config, timing_config
            FROM fluxcore_assistants
            LIMIT 5
        `);
        console.log('--- Assistant Data ---');
        for (const row of rows) {
            console.log(`- ID: ${row.id}, Name: ${row.name}`);
            console.log(`  ModelConfig: ${JSON.stringify(row.model_config)}`);
            console.log(`  TimingConfig: ${JSON.stringify(row.timing_config)}`);
        }
    } catch (err) {
        console.error('Error fetching data:', err);
    }
    process.exit(0);
}

checkAssistantData();
