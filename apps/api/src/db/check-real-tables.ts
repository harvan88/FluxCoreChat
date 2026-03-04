// VERIFICACIÓN REAL DE TABLAS EN POSTGRESQL
import { sql } from '@fluxcore/db';

async function checkRealTables() {
  console.log('🔍 VERIFICACIÓN REAL DE TABLAS EN POSTGRESQL');
  
  try {
    // 1. Verificar conexión
    await sql`SELECT 1`;
    console.log('✅ Conexión a PostgreSQL exitosa');
    
    // 2. Listar TODAS las tablas en public
    console.log('\n=== TODAS LAS TABLAS EN ESQUEMA PUBLIC ===');
    const allTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const tables = Array.from(allTables as any[]);
    console.log(`📊 Total tablas encontradas: ${tables.length}`);
    
    for (const table of tables) {
      console.log(`   📋 ${table.table_name}`);
    }
    
    // 3. Verificar específicamente las tablas del chat
    console.log('\n=== VERIFICANDO TABLAS DEL CHAT ===');
    const chatTables = ['users', 'accounts', 'relationships', 'conversations', 'conversation_participants', 'messages', 'asset_enrichments'];
    
    for (const tableName of chatTables) {
      const exists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `;
      
      const tableExists = Array.from(exists as any[])[0]?.exists;
      
      if (tableExists) {
        console.log(`   ✅ ${tableName}: EXISTE`);
        
        // Verificar columnas de messages
        if (tableName === 'messages') {
          const columns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            ORDER BY ordinal_position
          `;
          
          console.log(`      📋 Columnas de messages:`);
          for (const col of Array.from(columns as any[])) {
            console.log(`         - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
          }
        }
      } else {
        console.log(`   ❌ ${tableName}: NO EXISTE`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
  } finally {
    process.exit(0);
  }
}

checkRealTables().catch(console.error);
