import { db, sql } from '@fluxcore/db';

/**
 * Script para crear/actualizar la tabla fluxcore_outbox con la estructura correcta
 * Ejecutar con: bun run scripts/fix-fluxcore-outbox.ts
 */
async function fixFluxcoreOutbox() {
  console.log('🔧 Fixing fluxcore_outbox structure...');
  
  try {
    // Eliminar tabla existente si tiene estructura incorrecta
    console.log('🗑️ Dropping existing fluxcore_outbox...');
    await db.execute(sql`DROP TABLE IF EXISTS fluxcore_outbox CASCADE`);
    
    // Crear tabla con estructura correcta
    console.log('🏗️ Creating fluxcore_outbox with correct structure...');
    await db.execute(sql`
      CREATE TABLE fluxcore_outbox (
          id BIGSERIAL PRIMARY KEY,
          signal_id BIGINT NOT NULL,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent')),
          attempts BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          sent_at TIMESTAMPTZ,
          last_error TEXT
      )
    `);
    
    // Crear índices
    console.log('📊 Creating indexes...');
    await db.execute(sql`
      CREATE INDEX idx_fluxcore_outbox_pending ON fluxcore_outbox(status, created_at)
    `);
    
    await db.execute(sql`
      CREATE INDEX idx_fluxcore_outbox_signal_id ON fluxcore_outbox(signal_id)
    `);
    
    // Agregar foreign key constraint
    console.log('🔗 Adding foreign key constraint...');
    await db.execute(sql`
      ALTER TABLE fluxcore_outbox 
      ADD CONSTRAINT fk_fluxcore_outbox_signal 
      FOREIGN KEY (signal_id) REFERENCES fluxcore_signals(sequence_number) 
      ON DELETE CASCADE
    `);
    
    console.log('✅ fluxcore_outbox structure fixed successfully!');
    
    // Verificar la estructura
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_outbox' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    console.table(result);
    
  } catch (error) {
    console.error('❌ Error fixing fluxcore_outbox:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixFluxcoreOutbox()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixFluxcoreOutbox };
