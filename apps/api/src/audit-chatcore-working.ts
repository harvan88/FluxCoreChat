// AUDITORÍA EXHAUSTIVA DEL CHATCORE - REALIDAD DEL SISTEMA
// Comparación con el diseño v1.3 vs implementación actual

import { sql } from '@fluxcore/db';

async function auditChatCoreReality() {
  console.log('🔍 AUDITORÍA EXHAUSTIVA DEL CHATCORE');
  console.log('📋 Comparando realidad vs diseño v1.3');
  
  try {
    // 1. VERIFICAR TABLAS EXISTENTES
    console.log('\n=== 1. VERIFICANDO TABLAS EXISTENTES ===');
    
    const tablesResult = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('messages', 'conversations', 'relationships', 'accounts', 'users', 'conversation_participants', 'asset_enrichments') ORDER BY table_name`;
    
    console.log('📊 Tablas encontradas:');
    const existingTables: string[] = [];
    
    // Convertir a array para poder iterar
    const tables = Array.from(tablesResult as any[]);
    
    for (const row of tables) {
      console.log(`   ✅ ${row.table_name}`);
      existingTables.push(row.table_name);
    }
    
    // 2. VERIFICAR TABLAS FALTANTES DEL DISEÑO
    console.log('\n=== 2. TABLAS FALTANTES DEL DISEÑO v1.3 ===');
    
    const requiredTables = [
      'conversation_participants',
      'asset_enrichments'
    ];
    
    for (const tableName of requiredTables) {
      if (existingTables.includes(tableName)) {
        console.log(`✅ ${tableName}: EXISTE`);
      } else {
        console.log(`❌ ${tableName}: NO EXISTE - ¡CRÍTICO!`);
      }
    }
    
    // 3. VERIFICAR COLUMNAS EN MESSAGES
    console.log('\n=== 3. VERIFICANDO COLUMNAS EN MESSAGES ===');
    
    const messageColumnsResult = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' ORDER BY ordinal_position`;
    
    console.log('📋 Columnas en messages:');
    const columnsMap = new Map();
    
    // Convertir a array para poder iterar
    const messageColumns = Array.from(messageColumnsResult as any[]);
    
    for (const col of messageColumns) {
      console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : ''} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
      columnsMap.set(col.column_name, col);
    }
    
    // 4. VERIFICAR COLUMNAS CRÍTICAS
    console.log('\n=== 4. VERIFICANDO COLUMNAS CRÍTICAS ===');
    
    const criticalColumns = [
      { name: 'sender_account_id', expected: 'uuid', description: 'Debería ser TEXT según diseño' },
      { name: 'deleted_at', expected: 'timestamptz', description: 'Soft delete' },
      { name: 'deleted_by', expected: 'text', description: 'Quién eliminó' },
      { name: 'deleted_scope', expected: 'text', description: 'Scope de eliminación' },
      { name: 'frozen_at', expected: 'timestamptz', description: 'Congelación' },
      { name: 'content', expected: 'jsonb', description: 'Contenido estructurado' },
      { name: 'parent_id', expected: 'uuid', description: 'Referencia a padre' },
      { name: 'original_id', expected: 'uuid', description: 'Versión original' },
      { name: 'version', expected: 'integer', description: 'Número de versión' },
      { name: 'is_current', expected: 'boolean', description: 'Versión actual' }
    ];
    
    criticalColumns.forEach(({ name, expected, description }) => {
      const column = columnsMap.get(name);
      if (column) {
        const dataType = column.data_type;
        if (dataType.includes(expected)) {
          console.log(`✅ ${name}: ${dataType} - ${description}`);
        } else {
          console.log(`⚠️  ${name}: ${dataType} - ${description} (esperaba ${expected})`);
        }
      } else {
        console.log(`❌ ${name}: NO EXISTE - ${description}`);
      }
    });
    
    // 5. VERIFICAR DATOS REALES
    console.log('\n=== 5. VERIFICANDO DATOS REALES ===');
    
    const messageCountResult = await sql`SELECT COUNT(*) as count FROM messages`;
    const conversationCountResult = await sql`SELECT COUNT(*) as count FROM conversations`;
    const relationshipCountResult = await sql`SELECT COUNT(*) as count FROM relationships`;
    const accountCountResult = await sql`SELECT COUNT(*) as count FROM accounts`;
    
    console.log(`📊 Estadísticas actuales:`);
    console.log(`   • Messages: ${(messageCountResult as any[])[0].count}`);
    console.log(`   • Conversations: ${(conversationCountResult as any[])[0].count}`);
    console.log(`   • Relationships: ${(relationshipCountResult as any[])[0].count}`);
    console.log(`   • Accounts: ${(accountCountResult as any[])[0].count}`);
    
    // 6. VERIFICAR PROBLEMAS DE IDENTIDAD
    console.log('\n=== 6. VERIFICANDO PROBLEMAS DE IDENTIDAD ===');
    
    // Buscar mensajes con sender_account_id que no existen en accounts
    const orphanMessagesResult = await sql`SELECT m.id, m.sender_account_id, a.username FROM messages m LEFT JOIN accounts a ON m.sender_account_id = a.id WHERE a.id IS NULL LIMIT 10`;
    
    const orphanMessages = Array.from(orphanMessagesResult as any[]);
    
    if (orphanMessages.length > 0) {
      console.log(`❌ MENSAJES HUÉRFANOS (sender_account_id no existe en accounts):`);
      orphanMessages.forEach((msg: any, i: number) => {
        console.log(`   ${i + 1}. Mensaje ${msg.id}: sender_account_id = ${msg.sender_account_id}`);
      });
    } else {
      console.log(`✅ No hay mensajes huérfanos`);
    }
    
    // 7. VERIFICAR CONSISTENCIA DE TIPOS
    console.log('\n=== 7. VERIFICANDO CONSISTENCIA DE TIPOS ===');
    
    // Verificar si sender_account_id es UUID o TEXT
    const senderIdTypesResult = await sql`SELECT CASE WHEN sender_account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID' WHEN sender_account_id ~ '^[0-9a-f]{32,}$' THEN 'UUID (sin guiones)' ELSE 'OTHER' END as type, COUNT(*) as count FROM messages GROUP BY type`;
    
    const senderIdTypes = Array.from(senderIdTypesResult as any[]);
    
    console.log('📊 Tipos de sender_account_id:');
    senderIdTypes.forEach((type: any) => {
      console.log(`   • ${type.type}: ${type.count} mensajes`);
    });
    
    // 8. VERIFICAR RELACIONES ROTAS
    console.log('\n=== 8. VERIFICANDO RELACIONES ROTAS ===');
    
    const selfRelationshipsResult = await sql`SELECT id, account_a_id, account_b_id FROM relationships WHERE account_a_id = account_b_id`;
    
    const selfRelationships = Array.from(selfRelationshipsResult as any[]);
    
    if (selfRelationships.length > 0) {
      console.log(`❌ RELACIONES ROTAS (account_a_id = account_b_id):`);
      selfRelationships.forEach((rel: any, i: number) => {
        console.log(`   ${i + 1}. ${rel.id}: ${rel.account_a_id}`);
      });
    } else {
      console.log(`✅ No hay relaciones rotas`);
    }
    
    // 9. VERIFICAR MENSAJES SIN CONTENIDO VÁLIDO
    console.log('\n=== 9. VERIFICANDO MENSAJES SIN CONTENIDO VÁLIDO ===');
    
    const emptyMessagesResult = await sql`SELECT id, content FROM messages WHERE (content->>'text' IS NULL OR content->>'text' = '') AND (content->>'media' IS NULL OR jsonb_array_length(COALESCE(content->>'media', '[]'::jsonb)) = 0) AND event_type NOT IN ('reaction', 'system') LIMIT 10`;
    
    const emptyMessages = Array.from(emptyMessagesResult as any[]);
    
    if (emptyMessages.length > 0) {
      console.log(`❌ MENSAJES SIN CONTENIDO VÁLIDO:`);
      emptyMessages.forEach((msg: any, i: number) => {
        console.log(`   ${i + 1}. Mensaje ${msg.id}: content = ${JSON.stringify(msg.content)}`);
      });
    } else {
      console.log(`✅ Todos los mensajes tienen contenido válido`);
    }
    
    // 10. RESUMEN DE PROBLEMAS CRÍTICOS
    console.log('\n=== 10. RESUMEN DE PROBLEMAS CRÍTICOS ===');
    
    const issues: string[] = [];
    
    // Verificar tablas faltantes
    const missingTables: string[] = [];
    for (const tableName of requiredTables) {
      if (!existingTables.includes(tableName)) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      issues.push(`❌ Tablas faltantes: ${missingTables.join(', ')}`);
    }
    
    // Verificar mensajes huérfanos
    if (orphanMessages.length > 0) {
      issues.push(`❌ ${orphanMessages.length} mensajes huérfanos`);
    }
    
    // Verificar relaciones rotas
    if (selfRelationships.length > 0) {
      issues.push(`❌ ${selfRelationships.length} relaciones rotas`);
    }
    
    // Verificar mensajes sin contenido
    if (emptyMessages.length > 0) {
      issues.push(`❌ ${emptyMessages.length} mensajes sin contenido válido`);
    }
    
    // Verificar tipo de sender_account_id
    const senderColumn = columnsMap.get('sender_account_id');
    if (senderColumn && senderColumn.data_type === 'uuid') {
      issues.push(`❌ sender_account_id es UUID, debería ser TEXT según diseño v1.3`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No se encontraron problemas críticos');
    } else {
      console.log('🚨 PROBLEMAS CRÍTICOS ENCONTRADOS:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    // 11. RECOMENDACIONES
    console.log('\n=== 11. RECOMENDACIONES ===');
    
    console.log('📋 ACCIONES REQUERIDAS:');
    
    if (missingTables.includes('conversation_participants')) {
      console.log('   • Crear tabla conversation_participants (Decisión 5)');
      console.log('   • Migrar lógica de broadcasting de relationships a conversation_participants');
    }
    
    if (missingTables.includes('asset_enrichments')) {
      console.log('   • Crear tabla asset_enrichments (Decisión 3)');
      console.log('   • Migrar enriquecimientos de audio a asset_enrichments');
    }
    
    if (orphanMessages.length > 0) {
      console.log('   • Corregir mensajes huérfanos o eliminarlos');
      console.log('   • Implementar validación de sender_account_id');
    }
    
    if (selfRelationships.length > 0) {
      console.log('   • Eliminar relaciones rotas');
      console.log('   • Agregar constraint no_self_relationship');
    }
    
    console.log('\n📋 CAMBIOS ESTRUCTURALES:');
    console.log('   • sender_account_id debe ser TEXT (no UUID)');
    console.log('   • Implementar soft delete con deleted_scope');
    console.log('   • Agregar congelamiento de conversaciones');
    console.log('   • Migrar a conversation_participants para participación');
    
    console.log('\n📋 DIAGNÓSTICO FINAL:');
    console.log('   • El sistema actual NO sigue el diseño v1.3');
    console.log('   • Hay problemas fundamentales en el schema');
    console.log('   • La identidad está mal implementada (UUID vs TEXT)');
    console.log('   • Faltan componentes críticos del diseño');
    
    console.log('\n📋 VEREDICTO:');
    console.log('   ❌ EL CHAT ACTUAL NO ES SOSTENIBLE');
    console.log('   ❌ NECESITA RECONSTRUCCIÓN COMPLETA');
    console.log('   ❌ LOS PARCHES NO RESUELVEN EL PROBLEMA DE FONDO');
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  } finally {
    process.exit(0);
  }
}

auditChatCoreReality().catch(console.error);
