// VERIFICACIÓN DE CONEXIÓN Y BASE DE DATOS
// Para entender qué está pasando con la conexión

import { sql } from '@fluxcore/db';

async function verifyConnection() {
  console.log('🔍 VERIFICANDO CONEXIÓN A BASE DE DATOS');
  
  try {
    // 1. Probar conexión básica
    console.log('\n=== 1. PROBANDO CONEXIÓN BÁSICA ===');
    
    try {
      const result = await sql`SELECT 1 as test, NOW() as timestamp`;
      console.log('✅ Conexión exitosa:', result);
    } catch (error) {
      console.log('❌ Error de conexión:', error);
      return;
    }
    
    // 2. Listar todas las tablas (incluyendo system tables)
    console.log('\n=== 2. LISTANDO TODAS LAS TABLAS ===');
    
    try {
      const allTables = await sql`
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY table_schema, table_name
      `;
      
      const tablesArray = Array.from(allTables as any[]);
      
      console.log(`📊 Total de tablas (no sistema): ${tablesArray.length}`);
      
      if (tablesArray.length > 0) {
        console.log('📋 Tablas encontradas:');
        tablesArray.forEach((table: any) => {
          console.log(`   • ${table.table_schema}.${table.table_name}`);
        });
      } else {
        console.log('❌ No se encontraron tablas de usuario');
      }
    } catch (error) {
      console.log('❌ Error listando tablas:', error);
    }
    
    // 3. Verificar schema actual
    console.log('\n=== 3. VERIFICANDO SCHEMA ACTUAL ===');
    
    try {
      const currentSchema = await sql`SELECT current_schema() as schema`;
      console.log('📋 Schema actual:', currentSchema);
    } catch (error) {
      console.log('❌ Error obteniendo schema:', error);
    }
    
    // 4. Verificar si podemos crear una tabla de prueba
    console.log('\n=== 4. PROBANDO CREAR TABLA DE PRUEBA ===');
    
    try {
      await sql`DROP TABLE IF EXISTS test_table`;
      await sql`CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT)`;
      console.log('✅ Tabla de prueba creada');
      
      await sql`INSERT INTO test_table (name) VALUES ('test')`;
      console.log('✅ Dato insertado');
      
      const result = await sql`SELECT * FROM test_table`;
      console.log('📋 Datos:', result);
      
      await sql`DROP TABLE test_table`;
      console.log('✅ Tabla de prueba eliminada');
    } catch (error) {
      console.log('❌ Error con tabla de prueba:', error);
    }
    
    // 5. Verificar permisos
    console.log('\n=== 5. VERIFICANDO PERMISOS ===');
    
    try {
      const currentUser = await sql`SELECT current_user as user`;
      console.log('📋 Usuario actual:', currentUser);
      
      const hasCreate = await sql`
        SELECT has_schema_privilege('public', 'create') as can_create,
               has_schema_privilege('public', 'usage') as can_usage
      `;
      console.log('📋 Permisos en schema public:', hasCreate);
    } catch (error) {
      console.log('❌ Error verificando permisos:', error);
    }
    
    // 6. Verificar si las tablas del chat existen con otro nombre
    console.log('\n=== 6. BUSCANDO TABLAS SIMILARES ===');
    
    const chatTableNames = ['user', 'account', 'relationship', 'conversation', 'message'];
    
    for (const tableName of chatTableNames) {
      try {
        const similarTables = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name ILIKE '%${tableName}%'
        `;
        
        const similarArray = Array.from(similarTables as any[]);
        
        if (similarArray.length > 0) {
          console.log(`📋 Tablas similares a "${tableName}":`);
          similarArray.forEach((table: any) => {
            console.log(`   • ${table.table_name}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error buscando tablas similares a ${tableName}:`, error);
      }
    }
    
    // 7. Verificar conexión específica para ver si es otra BD
    console.log('\n=== 7. VERIFICANDO INFORMACIÓN DE CONEXIÓN ===');
    
    try {
      const dbInfo = await sql`
        SELECT current_database() as database,
               current_schema() as schema,
               version() as version
      `;
      
      const info = Array.from(dbInfo as any[])[0];
      
      console.log('📋 Información de conexión:');
      console.log(`   • Base de datos: ${info.database}`);
      console.log(`   • Schema: ${info.schema}`);
      console.log(`   • Versión: ${(info.version as string).split(',')[0]}`);
    } catch (error) {
      console.log('❌ Error obteniendo información de conexión:', error);
    }
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    process.exit(0);
  }
}

verifyConnection().catch(console.error);
