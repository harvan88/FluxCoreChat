/**
 * COR-004 + COR-003: Actor Model Migration
 * 
 * 1. Actualiza tabla actors para soportar actor_type
 * 2. Añade from_actor_id y to_actor_id a messages
 */
import { sql } from 'drizzle-orm';
import { db } from './index';

async function runMigration() {
  console.log('🔄 Running migration 008: Actor Model (COR-004 + COR-003)...\n');
  
  try {
    // ==========================================
    // PASO 1: Actualizar tabla actors (COR-004)
    // ==========================================
    console.log('📦 PASO 1: Actualizando tabla actors...');
    
    // 1.1 Añadir columna actor_type
    await db.execute(sql`
      ALTER TABLE actors 
      ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20)
    `);
    console.log('  ✅ Columna actor_type añadida');

    // 1.2 Hacer userId y accountId opcionales (remover NOT NULL si existe)
    // Esto se hace recreando la tabla o usando ALTER, pero primero verificamos
    await db.execute(sql`
      ALTER TABLE actors 
      ALTER COLUMN user_id DROP NOT NULL
    `).catch(() => {
      console.log('  ℹ️ user_id ya es opcional o no existe');
    });

    await db.execute(sql`
      ALTER TABLE actors 
      ALTER COLUMN account_id DROP NOT NULL
    `).catch(() => {
      console.log('  ℹ️ account_id ya es opcional o no existe');
    });
    
    // 1.3 Añadir columna extension_id
    await db.execute(sql`
      ALTER TABLE actors 
      ADD COLUMN IF NOT EXISTS extension_id VARCHAR(100)
    `);
    console.log('  ✅ Columna extension_id añadida');

    // 1.4 Añadir columna display_name
    await db.execute(sql`
      ALTER TABLE actors 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)
    `);
    console.log('  ✅ Columna display_name añadida');

    // 1.5 Actualizar registros existentes con actor_type = 'account' si no tienen
    await db.execute(sql`
      UPDATE actors 
      SET actor_type = 'account' 
      WHERE actor_type IS NULL AND account_id IS NOT NULL
    `);
    console.log('  ✅ Registros existentes actualizados con actor_type');

    // 1.6 Hacer actor_type NOT NULL
    await db.execute(sql`
      ALTER TABLE actors 
      ALTER COLUMN actor_type SET NOT NULL
    `).catch(() => {
      // Si falla, significa que hay registros sin actor_type
      console.log('  ⚠️ No se pudo hacer actor_type NOT NULL (puede haber registros sin valor)');
    });

    // 1.7 Crear índice por actor_type
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_actors_type ON actors(actor_type)
    `);
    console.log('  ✅ Índice idx_actors_type creado');

    // 1.8 Remover columna role si existe (ya no la usamos en este modelo)
    // No la removemos para mantener compatibilidad, solo la dejamos
    console.log('  ℹ️ Columna role mantenida para compatibilidad');

    // ==========================================
    // PASO 2: Actualizar tabla messages (COR-003)
    // ==========================================
    console.log('\n📦 PASO 2: Actualizando tabla messages...');

    // 2.1 Añadir columna from_actor_id
    await db.execute(sql`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS from_actor_id UUID REFERENCES actors(id)
    `);
    console.log('  ✅ Columna from_actor_id añadida');

    // 2.2 Añadir columna to_actor_id
    await db.execute(sql`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS to_actor_id UUID REFERENCES actors(id)
    `);
    console.log('  ✅ Columna to_actor_id añadida');

    // 2.3 Crear índices para from/to actor
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_from_actor ON messages(from_actor_id)
    `);
    console.log('  ✅ Índice idx_messages_from_actor creado');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_to_actor ON messages(to_actor_id)
    `);
    console.log('  ✅ Índice idx_messages_to_actor creado');

    // ==========================================
    // PASO 3: Crear actores builtin
    // ==========================================
    console.log('\n📦 PASO 3: Creando actores builtin...');

    // Primero, hacer role opcional si no lo es
    await db.execute(sql`
      ALTER TABLE actors ALTER COLUMN role DROP NOT NULL
    `).catch(() => {
      console.log('  ℹ️ role ya es opcional');
    });

    // 3.1 Crear actor para core-ai si no existe (usar INSERT ON CONFLICT)
    await db.execute(sql`
      INSERT INTO actors (actor_type, extension_id, display_name)
      VALUES ('builtin_ai', '@fluxcore/core-ai', 'FluxCore AI')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✅ Actor @fluxcore/core-ai verificado');

    // 3.2 Crear actor para appointments si no existe
    await db.execute(sql`
      INSERT INTO actors (actor_type, extension_id, display_name)
      VALUES ('extension', '@fluxcore/appointments', 'Sistema de Turnos')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✅ Actor @fluxcore/appointments verificado');

    console.log('\n✅ Migration 008: Actor Model completed!');
    console.log('\n📊 Resumen:');
    console.log('  - actors: actor_type, extension_id, display_name');
    console.log('  - messages: from_actor_id, to_actor_id');
    console.log('  - Actores builtin creados: core-ai, appointments');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
