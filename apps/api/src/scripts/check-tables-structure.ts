import { db, sql } from '@fluxcore/db';

async function checkTables() {
  try {
    // Verificar estructura de accounts
    const accountsColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'accounts'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas de accounts:');
    console.table(accountsColumns);
    
    // Verificar estructura de conversations
    const convColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Columnas de conversations:');
    console.table(convColumns);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTables().catch(console.error);
