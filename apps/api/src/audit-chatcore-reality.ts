// AUDITORÍA EXHAUSTIVA DEL CHATCORE - REALIDAD DEL SISTEMA
// Comparación con el diseño v1.3 vs implementación actual

import { db } from '@fluxcore/db';

async function auditChatCoreReality() {
  console.log('🔍 AUDITORÍA EXHAUSTIVA DEL CHATCORE');
  console.log('📋 Comparando realidad vs diseño v1.3');
  
  try {
    // 1. VERIFICAR SCHEMA ACTUAL
    console.log('\n=== 1. VERIFICANDO SCHEMA ACTUAL ===');
    
    const tables = await db`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('messages', 'conversations', 'relationships', 'accounts', 'users')
      ORDER BY table_name, ordinal_position
    `;
    
    console.log('📊 Tablas y columnas encontradas:');
    const currentSchema = new Map();
    
    tables.forEach((row: any) => {
      if (!currentSchema.has(row.table_name)) {
        currentSchema.set(row.table_name, []);
      }
      currentSchema.get(row.table_name)!.push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default
      });
    });
    
    currentSchema.forEach((columns, tableName) => {
      console.log(`\n📋 ${tableName}:`);
      columns.forEach(col => {
        console.log(`   • ${col.column}: ${col.type} ${col.nullable === 'YES' ? '(nullable)' : ''} ${col.default ? `(default: ${col.default})` : ''}`);
      });
    });
    
    // 2. VERIFICAR TABLAS FALTANTES DEL DISEÑO
    console.log('\n=== 2. TABLAS FALTANTES DEL DISEÑO v1.3 ===');
    
    const requiredTables = [
      'conversation_participants',
      'asset_enrichments'
    ];
    
    for (const tableName of requiredTables) {
      const exists = await db`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `;
      
      if (exists[0].exists) {
        console.log(`✅ ${tableName}: EXISTE`);
      } else {
        console.log(`❌ ${tableName}: NO EXISTE - ¡CRÍTICO!`);
      }
    }
    
    // 3. VERIFICAR COLUMNAS CRÍTICAS EN MESSAGES
    console.log('\n=== 3. VERIFICANDO COLUMNAS CRÍTICAS EN MESSAGES ===');
    
    const messagesColumns = currentSchema.get('messages') || [];
    
    const criticalColumns = [
      { name: 'sender_account_id', expected: 'TEXT', description: 'Debería ser TEXT según diseño' },
      { name: 'deleted_at', expected: 'TIMESTAMPTZ', description: 'Soft delete' },
      { name: 'deleted_by', expected: 'TEXT', description: 'Quién eliminó' },
      { name: 'deleted_scope', expected: 'TEXT', description: 'Scope de eliminación' },
      { name: 'frozen_at', expected: 'TIMESTAMPTZ', description: 'Congelación' },
      { name: 'content', expected: 'JSONB', description: 'Contenido estructurado' },
      { name: 'parent_id', expected: 'UUID', description: 'Referencia a padre' },
      { name: 'original_id', expected: 'UUID', description: 'Versión original' },
      { name: 'version', expected: 'INTEGER', description: 'Número de versión' },
      { name: 'is_current', expected: 'BOOLEAN', description: 'Versión actual' }
    ];
    
    criticalColumns.forEach(({ name, expected, description }) => {
      const column = messagesColumns.find(c => c.column === name);
      if (column) {
        if (column.type.includes(expected) || column.type.includes(expected.toLowerCase())) {
          console.log(`✅ ${name}: ${column.type} - ${description}`);
        } else {
          console.log(`⚠️  ${name}: ${column.type} - ${description} (esperaba ${expected})`);
        }
      } else {
        console.log(`❌ ${name}: NO EXISTE - ${description}`);
      }
    });
    
    // 4. VERIFICAR CONSTRAINTS IMPORTANTES
    console.log('\n=== 4. VERIFICANDO CONSTRAINTS ===');
    
    const constraints = await db`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.table_name = 'messages'
      ORDER BY tc.constraint_name
    `;
    
    console.log('📋 Constraints en messages:');
    constraints.forEach((constraint: any) => {
      console.log(`   • ${constraint.constraint_name}: ${constraint.constraint_type}`);
      if (constraint.check_clause) {
        console.log(`     ${constraint.check_clause}`);
      }
    });
    
    // 5. VERIFICAR DATOS REALES
    console.log('\n=== 5. VERIFICANDO DATOS REALES ===');
    
    const messageCount = await db`SELECT COUNT(*) as count FROM messages`;
    const conversationCount = await db`SELECT COUNT(*) as count FROM conversations`;
    const relationshipCount = await db`SELECT COUNT(*) as count FROM relationships`;
    const accountCount = await db`SELECT COUNT(*) as count FROM accounts`;
    
    console.log(`📊 Estadísticas actuales:`);
    console.log(`   • Messages: ${messageCount[0].count}`);
    console.log(`   • Conversations: ${conversationCount[0].count}`);
    console.log(`   • Relationships: ${relationshipCount[0].count}`);
    console.log(`   • Accounts: ${accountCount[0].count}`);
    
    // 6. VERIFICAR PROBLEMAS DE IDENTIDAD
    console.log('\n=== 6. VERIFICANDO PROBLEMAS DE IDENTIDAD ===');
    
    // Buscar mensajes con sender_account_id que no existen en accounts
    const orphanMessages = await db`
      SELECT m.id, m.sender_account_id, a.username
      FROM messages m
      LEFT JOIN accounts a ON m.sender_account_id = a.id
      WHERE a.id IS NULL
      LIMIT 10
    `;
    
    if (orphanMessages.length > 0) {
      console.log(`❌ MENSAJES HUÉRFANOS (sender_account_id no existe en accounts):`);
      orphanMessages.forEach((msg: any, i) => {
        console.log(`   ${i + 1}. Mensaje ${msg.id}: sender_account_id = ${msg.sender_account_id}`);
      });
    } else {
      console.log(`✅ No hay mensajes huérfanos`);
    }
    
    // 7. VERIFICAR CONSISTENCIA DE TIPOS
    console.log('\n=== 7. VERIFICANDO CONSISTENCIA DE TIPOS ===');
    
    // Verificar si sender_account_id es UUID o TEXT
    const senderIdTypes = await db`
      SELECT 
        CASE 
          WHEN sender_account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID'
          WHEN sender_account_id ~ '^[0-9a-f]{32,}$' THEN 'UUID (sin guiones)'
          ELSE 'OTHER'
        END as type,
        COUNT(*) as count
      FROM messages
      GROUP BY type
    `;
    
    console.log('📊 Tipos de sender_account_id:');
    senderIdTypes.forEach((type: any) => {
      console.log(`   • ${type.type}: ${type.count} mensajes`);
    });
    
    // 8. VERIFICAR RELACIONES ROTAS
    console.log('\n=== 8. VERIFICANDO RELACIONES ROTAS ===');
    
    const selfRelationships = await db`
      SELECT id, account_a_id, account_b_id
      FROM relationships
      WHERE account_a_id = account_b_id
    `;
    
    if (selfRelationships.length > 0) {
      console.log(`❌ RELACIONES ROTAS (account_a_id = account_b_id):`);
      selfRelationships.forEach((rel: any, i) => {
        console.log(`   ${i + 1}. ${rel.id}: ${rel.account_a_id}`);
      });
    } else {
      console.log(`✅ No hay relaciones rotas`);
    }
    
    // 9. VERIFICAR MENSAJES SIN CONTENIDO VÁLIDO
    console.log('\n=== 9. VERIFICANDO MENSAJES SIN CONTENIDO VÁLIDO ===');
    
    const emptyMessages = await db`
      SELECT id, content
      FROM messages
      WHERE 
        (content->>'text' IS NULL OR content->>'text' = '')
        AND (content->>'media' IS NULL OR jsonb_array_length(COALESCE(content->>'media', '[]'::jsonb)) = 0)
        AND event_type NOT IN ('reaction', 'system')
      LIMIT 10
    `;
    
    if (emptyMessages.length > 0) {
      console.log(`❌ MENSAJES SIN CONTENIDO VÁLIDO:`);
      emptyMessages.forEach((msg: any, i) => {
        console.log(`   ${i + 1}. Mensaje ${msg.id}: content = ${JSON.stringify(msg.content)}`);
      });
    } else {
      console.log(`✅ Todos los mensajes tienen contenido válido`);
    }
    
    // 10. RESUMEN DE PROBLEMAS CRÍTICOS
    console.log('\n=== 10. RESUMEN DE PROBLEMAS CRÍTICOS ===');
    
    const issues = [];
    
    // Verificar tablas faltantes
    const missingTables = [];
    for (const tableName of requiredTables) {
      const exists = await db`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `;
      if (!exists[0].exists) {
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
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  } finally {
    process.exit(0);
  }
}

auditChatCoreReality().catch(console.error);
