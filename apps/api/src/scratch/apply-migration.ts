import { db, sql } from '@fluxcore/db';

async function main() {
    console.log('🚀 Aplicando columnas de soberanía...');
    try {
        await db.execute(sql`
            ALTER TABLE fluxcore_account_policies 
            ADD COLUMN IF NOT EXISTS ai_include_name boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS ai_include_bio boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS ai_include_locations boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS ai_include_schedule boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS ai_include_social_links boolean DEFAULT true,
            ADD COLUMN IF NOT EXISTS ai_include_private_context boolean DEFAULT true;
        `);
        console.log('✅ Columnas añadidas con éxito.');
    } catch (err) {
        console.error('❌ Error aplicando columnas:', err);
    }
    process.exit(0);
}

main();
