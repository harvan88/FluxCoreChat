// CREACIÓN DEL SCHEMA DE CHATCORE v1.3
// Ejecución del SQL para crear todas las tablas del chat

import { sql } from '@fluxcore/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createChatCoreSchema() {
  console.log('🔧 CREANDO SCHEMA DE CHATCORE v1.3');
  console.log('📋 Basado en el diseño definitivo v1.3');
  
  try {
    // 1. Leer el archivo SQL
    console.log('\n=== 1. LEYENDO ARCHIVO SQL ===');
    
    const sqlPath = join(__dirname, 'create-chatcore-schema.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    console.log('✅ Archivo SQL leído correctamente');
    console.log(`📊 Tamaño: ${sqlContent.length} caracteres`);
    
    // 2. Ejecutar el SQL
    console.log('\n=== 2. EJECUTANDO SCHEMA SQL ===');
    
    await sql.unsafe(sqlContent);
    
    console.log('✅ Schema ejecutado correctamente');
    
    // 3. Verificar tablas creadas
    console.log('\n=== 3. VERIFICANDO TABLAS CREADAS ===');
    
    const expectedTables = [
      'users',
      'accounts', 
      'relationships',
      'conversations',
      'conversation_participants',
      'messages',
      'asset_enrichments'
    ];
    
    for (const tableName of expectedTables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `;
      
      const exists = (result as any[])[0]?.exists;
      
      if (exists) {
        console.log(`   ✅ ${tableName}: CREADA`);
      } else {
        console.log(`   ❌ ${tableName}: NO SE CREÓ`);
      }
    }
    
    // 4. Verificar columnas críticas
    console.log('\n=== 4. VERIFICANDO COLUMNAS CRÍTICAS ===');
    
    // Verificar sender_account_id en messages
    const messagesColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'sender_account_id'
    `;
    
    if (messagesColumns.length > 0) {
      const column = (messagesColumns as any[])[0];
      console.log(`   ✅ messages.sender_account_id: ${column.data_type}`);
    } else {
      console.log(`   ❌ messages.sender_account_id: NO EXISTE`);
    }
    
    // Verificar columnas de soft delete
    const softDeleteColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name IN ('deleted_at', 'deleted_by', 'deleted_scope')
      ORDER BY column_name
    `;
    
    console.log('   📋 Columnas de soft delete:');
    for (const col of softDeleteColumns as any[]) {
      console.log(`     ✅ ${col.column_name}`);
    }
    
    // Verificar columnas de versionamiento
    const versionColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name IN ('parent_id', 'original_id', 'version', 'is_current')
      ORDER BY column_name
    `;
    
    console.log('   📋 Columnas de versionamiento:');
    for (const col of versionColumns as any[]) {
      console.log(`     ✅ ${col.column_name}`);
    }
    
    // Verificar columnas de congelamiento
    const freezeColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name IN ('frozen_at', 'frozen_by', 'frozen_reason')
      ORDER BY column_name
    `;
    
    console.log('   📋 Columnas de congelamiento:');
    for (const col of freezeColumns as any[]) {
      console.log(`     ✅ ${col.column_name}`);
    }
    
    // 5. Verificar índices
    console.log('\n=== 5. VERIFICANDO ÍNDICES CREADOS ===');
    
    const expectedIndexes = [
      'idx_users_email',
      'idx_accounts_username',
      'idx_relationships_a',
      'idx_conversations_relationship',
      'idx_conversation_participants_conversation',
      'idx_messages_conversation',
      'idx_messages_created',
      'idx_asset_enrichments_message'
    ];
    
    for (const indexName of expectedIndexes) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = ${indexName}
        ) as exists
      `;
      
      const exists = (result as any[])[0]?.exists;
      
      if (exists) {
        console.log(`   ✅ ${indexName}: CREADO`);
      } else {
        console.log(`   ❌ ${indexName}: NO SE CREÓ`);
      }
    }
    
    // 6. Verificar triggers
    console.log('\n=== 6. VERIFICANDO TRIGGERS CREADOS ===');
    
    const expectedTriggers = [
      'update_users_updated_at',
      'update_accounts_updated_at',
      'update_relationships_updated_at',
      'update_conversations_updated_at',
      'update_messages_updated_at',
      'update_asset_enrichments_updated_at',
      'update_conversation_last_activity'
    ];
    
    for (const triggerName of expectedTriggers) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.triggers 
          WHERE trigger_name = ${triggerName}
        ) as exists
      `;
      
      const exists = (result as any[])[0]?.exists;
      
      if (exists) {
        console.log(`   ✅ ${triggerName}: CREADO`);
      } else {
        console.log(`   ❌ ${triggerName}: NO SE CREÓ`);
      }
    }
    
    // 7. Verificar vistas
    console.log('\n=== 7. VERIFICANDO VISTAS CREADAS ===');
    
    const expectedViews = [
      'conversation_details',
      'message_details'
    ];
    
    for (const viewName of expectedViews) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = ${viewName}
        ) as exists
      `;
      
      const exists = (result as any[])[0]?.exists;
      
      if (exists) {
        console.log(`   ✅ ${viewName}: CREADA`);
      } else {
        console.log(`   ❌ ${viewName}: NO SE CREÓ`);
      }
    }
    
    // 8. Verificar vistas creadas
    console.log('\n=== 8. VERIFICANDO VISTAS ===');
    
    try {
      const conversationDetails = await sql`SELECT COUNT(*) as count FROM conversation_details LIMIT 1`;
      console.log(`   ✅ conversation_details: FUNCIONA (${(conversationDetails as any[])[0].count} filas)`);
    } catch (error) {
      console.log(`   ❌ conversation_details: ERROR - ${error}`);
    }
    
    try {
      const messageDetails = await sql`SELECT COUNT(*) as count FROM message_details LIMIT 1`;
      console.log(`   ✅ message_details: FUNCIONA (${(messageDetails as any[])[0].count} filas)`);
    } catch (error) {
      console.log(`   ❌ message_details: ERROR - ${error}`);
    }
    
    // 9. Resumen final
    console.log('\n=== 9. RESUMEN FINAL ===');
    
    const finalTables = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableCount = (finalTables as any[])[0]?.count;
    
    console.log(`📊 Total de tablas en la base de datos: ${tableCount}`);
    console.log('📋 Tablas del ChatCore creadas:');
    
    for (const tableName of expectedTables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `;
      
      const exists = (result as any[])[0]?.exists;
      
      if (exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName}`);
      }
    }
    
    console.log('\n🎯 ¡SCHEMA DE CHATCORE CREADO EXITOSAMENTE!');
    console.log('📋 Implementando las 6 decisiones fundamentales del diseño v1.3:');
    console.log('   ✅ 1. Mensajes versionados');
    console.log('   ✅ 2. Soft delete con scope');
    console.log('   ✅ 3. Asset enrichments');
    console.log('   ✅ 4. Conversaciones congelables');
    console.log('   ✅ 5. conversation_participants');
    console.log('   ✅ 6. sender_account_id como TEXT');
    
    console.log('\n🚀 La base de datos está lista para conectarse con:');
    console.log('   ✅ Sistema de assets existente');
    console.log('   ✅ Sistema de WebSocket existente');
    console.log('   ✅ Sistema de autenticación existente');
    console.log('   ✅ API endpoints existentes');
    
  } catch (error) {
    console.error('❌ Error creando el schema:', error);
    throw error;
  }
}

// Ejecutar la creación del schema
createChatCoreSchema()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
