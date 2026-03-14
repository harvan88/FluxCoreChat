import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = 'postgresql://postgres:postgres@localhost:5432/fluxcore';
const client = postgres(connectionString);
const db = drizzle(client);

console.log('🔄 Ejecutando migration de sobrescritura...');

async function runMigration() {
  try {
    // Paso 1: Agregar columnas nuevas
    console.log('📝 Paso 1: Agregando columnas nuevas...');
    await db.execute(sql`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS overwritten_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS overwritten_by TEXT
    `);
    console.log('✅ Columnas nuevas agregadas');

    // Paso 2: Migrar datos existentes
    console.log('📝 Paso 2: Migrando datos existentes...');
    
    // Primero contar cuántos se van a migrar
    const countBefore = await db.execute(sql`
      SELECT COUNT(*) as count FROM messages WHERE redacted_at IS NOT NULL
    `);
    
    // Luego hacer la migración
    await db.execute(sql`
      UPDATE messages 
      SET overwritten_at = redacted_at, 
          overwritten_by = redacted_by
      WHERE redacted_at IS NOT NULL
    `);
    
    console.log('✅ Datos migrados:', countBefore[0]?.count, 'filas afectadas');

    // Paso 3: Crear índices
    console.log('📝 Paso 3: Creando índices...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_overwritten_at ON messages(overwritten_at);
      CREATE INDEX IF NOT EXISTS idx_messages_overwritten_by ON messages(overwritten_by);
    `);
    console.log('✅ Índices creados');

    // Paso 4: Verificación
    console.log('📝 Paso 4: Verificando migration...');
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM messages WHERE overwritten_at IS NOT NULL
    `);
    const legacyCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM messages WHERE redacted_at IS NOT NULL
    `);
    
    console.log('✅ Verificación:');
    console.log('   - Mensajes con overwritten_at:', countResult[0]?.total);
    console.log('   - Mensajes con redacted_at (legacy):', legacyCount[0]?.total);
    console.log('   - Consistencia:', countResult[0]?.total === legacyCount[0]?.total ? '✅ OK' : '❌ ERROR');

    console.log('🎉 Migration completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
