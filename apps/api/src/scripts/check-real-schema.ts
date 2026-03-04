import { db, sql } from '@fluxcore/db';

/**
 * Script para verificar el schema real en la base de datos
 */
async function checkRealSchema() {
  console.log('🔍 Checking real database schema...');

  try {
    // Verificar estructura real de la tabla messages
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'messages'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📊 Real messages table structure:');
    console.table(columns);

    // Verificar estructura de fluxcore_addresses
    const addressColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_addresses'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Real fluxcore_addresses table structure:');
    console.table(addressColumns);

    // Verificar un mensaje reciente para ver los tipos reales
    const recentMessage = await db.execute(sql`
      SELECT id, conversation_id, sender_account_id, signal_id, created_at
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
        AND generated_by = 'human'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    console.log('\n📊 Recent message sample:');
    console.table(recentMessage);

  } catch (error) {
    console.error('❌ Error checking real schema:', error);
    throw error;
  }
}

checkRealSchema().catch(console.error);
