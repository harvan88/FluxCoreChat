import { db, sql } from '@fluxcore/db';

/**
 * Verificar tablas de conversaciones
 */
async function checkConversationTables() {
  console.log('🔍 VERIFICANDO TABLAS DE CONVERSACIONES');

  try {
    // Verificar todas las tablas que empiezan con conversation
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%conversation%'
      ORDER BY table_name
    `);

    console.log('\n📊 TABLAS DE CONVERSACIONES:');
    if (tables.length === 0) {
      console.log('❌ No hay tablas de conversaciones');
    } else {
      tables.forEach(table => {
        console.log(`✅ ${table.table_name}`);
      });
    }

    // Verificar si existe conversation_participants
    const participantTable = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'conversation_participants'
      ) as exists
    `);

    console.log(`\n📊 Tabla conversation_participants existe: ${participantTable[0].exists ? '✅ SÍ' : '❌ NO'}`);

    // Verificar estructura de conversations si existe
    if (tables.some(t => t.table_name === 'conversations')) {
      const convStructure = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'conversations'
        ORDER BY ordinal_position
      `);

      console.log('\n📊 ESTRUCTURA DE CONVERSATIONS:');
      console.table(convStructure);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkConversationTables().catch(console.error);
