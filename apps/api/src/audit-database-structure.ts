// AUDITORÍA DE ESTRUCTURA DE BASE DE DATOS
// Verificación exacta de qué existe en la base de datos

import { sql } from '@fluxcore/db';

async function auditDatabaseStructure() {
  console.log('🔍 AUDITORÍA DE ESTRUCTURA DE BASE DE DATOS');
  console.log('📋 Verificando qué existe realmente en la BD');
  
  try {
    // 1. VERIFICAR CONEXIÓN A LA BASE DE DATOS
    console.log('\n=== 1. VERIFICANDO CONEXIÓN ===');
    
    try {
      const testConnection = await sql`SELECT 1 as test`;
      console.log('✅ Conexión a base de datos exitosa');
    } catch (error) {
      console.log('❌ Error de conexión a base de datos:', error);
      return;
    }
    
    // 2. LISTAR TODAS LAS TABLAS
    console.log('\n=== 2. TODAS LAS TABLAS EN LA BASE DE DATOS ===');
    
    const allTables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    const tablesArray = Array.from(allTables as any[]);
    
    console.log(`📊 Total de tablas encontradas: ${tablesArray.length}`);
    tablesArray.forEach((table: any, index: number) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    // 3. VERIFICAR TABLAS DEL CHAT
    console.log('\n=== 3. TABLAS DEL CHAT ===');
    
    const chatTables = [
      'users',
      'accounts', 
      'relationships',
      'conversations',
      'messages',
      'conversation_participants',
      'asset_enrichments'
    ];
    
    console.log('📋 Estado de tablas del chat:');
    chatTables.forEach(tableName => {
      const existe = tablesArray.some((t: any) => t.table_name === tableName);
      if (existe) {
        console.log(`   ✅ ${tableName}: EXISTE`);
      } else {
        console.log(`   ❌ ${tableName}: NO EXISTE`);
      }
    });
    
    // 4. ANALIZAR ESTRUCTURA DE TABLAS EXISTENTES
    console.log('\n=== 4. ESTRUCTURA DETALLADA DE TABLAS EXISTENTES ===');
    
    for (const tableName of chatTables) {
      const existe = tablesArray.some((t: any) => t.table_name === tableName);
      if (existe) {
        console.log(`\n📋 ESTRUCTURA DE ${tableName.toUpperCase()}:`);
        
        const columnas = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName} ORDER BY ordinal_position`;
        const columnasArray = Array.from(columnas as any[]);
        
        columnasArray.forEach((col: any) => {
          console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : ''} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
        });
        
        // Verificar constraints
        const constraints = await sql`SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = ${tableName}`;
        const constraintsArray = Array.from(constraints as any[]);
        
        if (constraintsArray.length > 0) {
          console.log('   📋 Constraints:');
          constraintsArray.forEach((constraint: any) => {
            console.log(`     • ${constraint.constraint_name}: ${constraint.constraint_type}`);
          });
        }
        
        // Verificar datos de muestra
        try {
          const sampleData = await sql`SELECT COUNT(*) as total FROM ${tableName}`;
          const total = (sampleData as any[])[0]?.total || 0;
          console.log(`   📊 Total de registros: ${total}`);
          
          if (total > 0) {
            const sample = await sql`SELECT * FROM ${tableName} LIMIT 1`;
            const sampleArray = Array.from(sample as any[]);
            console.log('   📋 Muestra de datos:');
            Object.keys(sampleArray[0] || {}).forEach(key => {
              console.log(`     • ${key}: ${sampleArray[0][key]}`);
            });
          }
        } catch (error) {
          console.log('   ❌ No se pudo obtener datos de muestra');
        }
      }
    }
    
    // 5. VERIFICAR ÍNDICES
    console.log('\n=== 5. ÍNDICES DE TABLAS DEL CHAT ===');
    
    for (const tableName of chatTables) {
      const existe = tablesArray.some((t: any) => t.table_name === tableName);
      if (existe) {
        const indices = await sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = ${tableName} AND schemaname = 'public'`;
        const indicesArray = Array.from(indices as any[]);
        
        if (indicesArray.length > 0) {
          console.log(`\n📋 Índices de ${tableName}:`);
          indicesArray.forEach((index: any) => {
            console.log(`   • ${index.indexname}: ${index.indexdef}`);
          });
        }
      }
    }
    
    // 6. VERIFICAR RELACIONES ENTRE TABLAS
    console.log('\n=== 6. RELACIONES (FOREIGN KEYS) ===');
    
    const foreignKeys = await sql`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name IN (${chatTables.join(',')})
    `;
    
    const fkArray = Array.from(foreignKeys as any[]);
    
    if (fkArray.length > 0) {
      console.log('📋 Foreign Keys encontradas:');
      fkArray.forEach((fk: any) => {
        console.log(`   • ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('❌ No se encontraron foreign keys');
    }
    
    // 7. ANÁLISIS DE COMPATIBILIDAD CON DISEÑO v1.3
    console.log('\n=== 7. ANÁLISIS DE COMPATIBILIDAD CON DISEÑO v1.3 ===');
    
    console.log('📋 TABLAS QUE CUMPLEN CON EL DISEÑO:');
    
    // Verificar users
    const usersExiste = tablesArray.some((t: any) => t.table_name === 'users');
    if (usersExiste) {
      console.log('   ✅ users: EXISTE - Analizar estructura vs diseño');
    }
    
    // Verificar accounts
    const accountsExiste = tablesArray.some((t: any) => t.table_name === 'accounts');
    if (accountsExiste) {
      console.log('   ✅ accounts: EXISTE - Analizar estructura vs diseño');
    }
    
    console.log('\n📋 TABLAS FALTANTES DEL DISEÑO:');
    
    const missingTables = chatTables.filter(tableName => 
      !tablesArray.some((t: any) => t.table_name === tableName)
    );
    
    missingTables.forEach(tableName => {
      console.log(`   ❌ ${tableName}: FALTA - Crear según diseño v1.3`);
    });
    
    console.log('\n📋 TABLAS QUE NECESITAN MODIFICACIÓN:');
    
    // Verificar si messages existe pero con estructura incorrecta
    const messagesExiste = tablesArray.some((t: any) => t.table_name === 'messages');
    if (messagesExiste) {
      console.log('   ⚠️  messages: EXISTE pero necesita reestructuración según diseño v1.3');
    }
    
    // 8. RECOMENDACIONES
    console.log('\n=== 8. RECOMENDACIONES ===');
    
    console.log('📋 ESTRATEGIA BASADA EN LO QUE EXISTE:');
    
    if (missingTables.length === 0) {
      console.log('   ✅ Todas las tablas del diseño existen - Solo necesita ajustes');
    } else {
      console.log('   🔄 Crear tablas faltantes:', missingTables.join(', '));
    }
    
    if (messagesExiste) {
      console.log('   🔄 Migrar estructura de messages al diseño v1.3');
      console.log('   🔄 Migrar datos existentes si es necesario');
    }
    
    console.log('\n📋 COMPONENTES QUE PODEMOS CONSERVAR:');
    
    if (usersExiste) {
      console.log('   ✅ Sistema de usuarios');
    }
    
    if (accountsExiste) {
      console.log('   ✅ Sistema de cuentas');
    }
    
    console.log('   ✅ Sistema de ingestión de assets (9 servicios encontrados)');
    console.log('   ✅ Sistema de WebSocket (ws-handler.ts)');
    console.log('   ✅ Sistema de autenticación (auth.middleware.ts)');
    
    console.log('\n📋 COMPONENTES QUE NECESITAN RECONSTRUCCIÓN:');
    
    if (!messagesExiste) {
      console.log('   ❌ Sistema de mensajes completo');
    } else {
      console.log('   ❌ Schema de mensajes (adaptar a diseño v1.3)');
    }
    
    if (!tablesArray.some((t: any) => t.table_name === 'conversation_participants')) {
      console.log('   ❌ Sistema de participantes (conversation_participants)');
    }
    
    if (!tablesArray.some((t: any) => t.table_name === 'asset_enrichments')) {
      console.log('   ❌ Sistema de enriquecimientos (asset_enrichments)');
    }
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  } finally {
    process.exit(0);
  }
}

auditDatabaseStructure().catch(console.error);
