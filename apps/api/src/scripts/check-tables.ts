import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar tablas de projectors
 */
async function checkTables() {
  console.log('🔍 Checking projector tables...');

  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%projector%'
      ORDER BY table_name
    `);
    
    console.log('📊 Projector tables:');
    console.table(tables);

    // Verificar estructura de la tabla si existe
    if (tables.length > 0) {
      const tableName = tables[0].table_name;
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);
      
      console.log(`\n📊 Columns in ${tableName}:`);
      console.table(columns);
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
    throw error;
  }
}

checkTables().catch(console.error);
