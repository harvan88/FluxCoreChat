import { db, sql } from '@fluxcore/db';

/**
 * Auditoría de todos los esquemas problemáticos
 */
async function auditAllSchemas() {
  console.log('🔍 AUDITORÍA DE TODOS LOS ESQUEMAS PROBLEMÁTICOS');

  try {
    // 1. Verificar chatcore_outbox
    console.log('\n📊 1. ESQUEMA DE CHATCORE OUTBOX:');
    try {
      const outboxSchema = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'chatcore_outbox'
        ORDER BY ordinal_position
      `);
      console.table(outboxSchema);
    } catch (error) {
      console.log('❌ Tabla chatcore_outbox no existe o tiene errores');
    }

    // 2. Verificar fluxcore_projector_cursors
    console.log('\n📊 2. ESQUEMA DE FLUXCORE PROJECTOR CURSORS:');
    try {
      const cursorsSchema = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'fluxcore_projector_cursors'
        ORDER BY ordinal_position
      `);
      console.table(cursorsSchema);
    } catch (error) {
      console.log('❌ Tabla fluxcore_projector_cursors no existe o tiene errores');
    }

    // 3. Verificar fluxcore_projector_errors
    console.log('\n📊 3. ESQUEMA DE FLUXCORE PROJECTOR ERRORS:');
    try {
      const errorsSchema = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'fluxcore_projector_errors'
        ORDER BY ordinal_position
      `);
      console.table(errorsSchema);
    } catch (error) {
      console.log('❌ Tabla fluxcore_projector_errors no existe o tiene errores');
    }

    // 4. Listar todas las tablas del sistema
    console.log('\n📊 4. TODAS LAS TABLAS DEL SISTEMA:');
    const allTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📋 TABLAS ENCONTRADAS:');
    allTables.forEach((row: any) => {
      console.log(`- ${row.table_name}`);
    });

    // 5. Verificar qué tablas tienen problemas
    console.log('\n🎯 DIAGNÓSTICO:');
    console.log('❌ Hay múltiples inconsistencias entre:');
    console.log('   - Esquemas TypeScript vs Base de datos real');
    console.log('   - Scripts que usan columnas inexistentes');
    console.log('   - Migraciones que no se aplicaron correctamente');

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

auditAllSchemas().catch(console.error);
