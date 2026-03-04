import { db, sql } from '@fluxcore/db';

/**
 * Migrar el esquema de fluxcore_projector_cursors para que coincida con Drizzle
 */
async function migrateProjectorCursorsSchema() {
  console.log('🔧 MIGRANDO ESQUEMA DE fluxcore_projector_cursors');

  try {
    // 1. Verificar esquema actual
    const currentSchema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_cursors'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA ACTUAL:');
    console.table(currentSchema);

    // 2. Agregar columnas faltantes
    const missingColumns = [
      {
        name: 'last_processed_at',
        type: 'timestamp',
        nullable: 'NO',
        default: 'NOW()'
      },
      {
        name: 'error_count',
        type: 'bigint',
        nullable: 'NO',
        default: '0'
      },
      {
        name: 'last_error',
        type: 'text',
        nullable: 'YES',
        default: null
      }
    ];

    for (const column of missingColumns) {
      try {
        await db.execute(sql`
          ALTER TABLE fluxcore_projector_cursors 
          ADD COLUMN ${column.name} ${column.type} ${column.nullable === 'NO' ? 'NOT NULL' : ''} DEFAULT ${column.default}
        `);
        console.log(`✅ Columna ${column.name} agregada`);
      } catch (error) {
        console.log(`⚠️ No se pudo agregar ${column.name}: ${error}`);
      }
    }

    // 3. Verificar esquema final
    const finalSchema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'fluxcore_projector_cursors'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA FINAL:');
    console.table(finalSchema);

    // 4. Verificar datos
    const data = await db.execute(sql`
      SELECT * FROM fluxcore_projector_cursors
    `);

    console.log('\n📊 DATOS ACTUALES:');
    console.table(data);

    console.log('\n🎯 MIGRACIÓN COMPLETADA ✅');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

migrateProjectorCursorsSchema().catch(console.error);
