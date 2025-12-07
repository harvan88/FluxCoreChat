/**
 * COR-002: Ejecutar migración 007_message_status
 */
import { sql } from 'drizzle-orm';
import { db } from './index';

async function runMigration() {
  console.log('🔄 Running migration 007_message_status...');
  
  try {
    // Añadir columna status
    await db.execute(sql`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'synced'
    `);
    console.log('  ✅ Column status added');

    // Añadir comentario
    await db.execute(sql`
      COMMENT ON COLUMN messages.status IS 'Status del mensaje: local_only, pending_backend, synced, sent, delivered, seen'
    `);
    console.log('  ✅ Comment added');

    // Crear índice por status
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)
    `);
    console.log('  ✅ Index idx_messages_status created');

    // Crear índice compuesto
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_status ON messages(conversation_id, status)
    `);
    console.log('  ✅ Index idx_messages_conversation_status created');

    console.log('\n✅ Migration 007_message_status completed!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
