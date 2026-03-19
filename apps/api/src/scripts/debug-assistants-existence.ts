import { db, sql } from '@fluxcore/db';

async function checkAssistants() {
  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'fluxcore_assistant%'
    `);
    
    console.log('🔍 Tablas de asistentes encontradas:');
    for (const row of tables) {
      console.log(`- Table: ${row.table_name}`);
    }
    
    const countAssistants = await db.execute(sql`
      SELECT count(*) as total FROM fluxcore_assistants
    `).catch(() => [{ total: 'ERROR: No existe la tabla' }]);
    
    console.log('\n📊 Detalle de asistentes:');
    console.log(`\n📊 Total de asistentes: ${countAssistants[0].total}`);
    
    if (countAssistants[0].total !== 'ERROR: No existe la tabla' && Number(countAssistants[0].total) > 0) {
      const data = await db.execute(sql`
        SELECT id, name, account_id, status, runtime 
        FROM fluxcore_assistants 
        LIMIT 10
      `);
      console.log('\n📄 Primeros 10 asistentes:');
      for (const row of data) {
        console.log(`- ID: ${row.id}, Name: ${row.name}, Acc: ${row.account_id}, Status: ${row.status}, Runtime: ${row.runtime}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking assistants:', error);
  } finally {
    process.exit(0);
  }
}

checkAssistants();
