/**
 * Script para verificar discrepancias entre IndexedDB (frontend) y PostgreSQL (backend)
 * Ejecutar en el contexto del navegador (consola de desarrollador)
 */

// Función para obtener mensajes de IndexedDB
async function getIndexedDBMessages() {
  try {
    // Obtener todas las bases de datos FluxCoreDB
    const databases = await indexedDB.databases();
    const fluxCoreDBs = databases.filter(db => db.name && db.name.startsWith('FluxCoreDB_'));
    
    console.log('📊 Bases de datos FluxCore encontradas:', fluxCoreDBs.map(db => db.name));
    
    const allMessages = [];
    
    for (const dbInfo of fluxCoreDBs) {
      const dbName = dbInfo.name;
      console.log(`🔍 Verificando DB: ${dbName}`);
      
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const messages = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      allMessages.push({
        dbName,
        accountId: dbName.replace('FluxCoreDB_', ''),
        messages: messages,
        count: messages.length
      });
      
      db.close();
    }
    
    return allMessages;
  } catch (error) {
    console.error('❌ Error al obtener mensajes de IndexedDB:', error);
    return [];
  }
}

// Función para obtener mensajes de PostgreSQL via API
async function getPostgreSQLMessages() {
  try {
    // Obtener conversaciones primero
    const convResponse = await fetch('/api/conversations');
    const conversations = await convResponse.json();
    
    if (!conversations.success) {
      throw new Error('Error al obtener conversaciones');
    }
    
    const allMessages = [];
    
    for (const conversation of conversations.data) {
      const msgResponse = await fetch(`/api/conversations/${conversation.id}/messages`);
      const messages = await msgResponse.json();
      
      if (messages.success) {
        allMessages.push({
          conversationId: conversation.id,
          messages: messages.data,
          count: messages.data.length
        });
      }
    }
    
    return allMessages;
  } catch (error) {
    console.error('❌ Error al obtener mensajes de PostgreSQL:', error);
    return [];
  }
}

// Función principal de comparación
async function compareMessageStores() {
  console.log('🚀 Iniciando comparación de mensajes entre IndexedDB y PostgreSQL');
  
  // Obtener datos de ambas fuentes
  const [indexedDBData, postgresData] = await Promise.all([
    getIndexedDBMessages(),
    getPostgreSQLMessages()
  ]);
  
  console.log('📈 Resultados de IndexedDB:');
  console.table(indexedDBData.map(db => ({
    dbName: db.dbName,
    accountId: db.accountId,
    messageCount: db.count
  })));
  
  console.log('📈 Resultados de PostgreSQL:');
  console.table(postgresData.map(conv => ({
    conversationId: conv.conversationId,
    messageCount: conv.count
  })));
  
  // Calcular totales
  const totalIndexedDB = indexedDBData.reduce((sum, db) => sum + db.count, 0);
  const totalPostgres = postgresData.reduce((sum, conv) => sum + conv.count, 0);
  
  console.log('📊 Totales:');
  console.log(`IndexedDB: ${totalIndexedDB} mensajes`);
  console.log(`PostgreSQL: ${totalPostgres} mensajes`);
  console.log(`Diferencia: ${Math.abs(totalIndexedDB - totalPostgres)} mensajes`);
  
  // Análisis detallado por conversación
  console.log('🔍 Análisis detallado:');
  
  // Agrupar mensajes de IndexedDB por conversationId
  const indexedDBByConv = {};
  indexedDBData.forEach(db => {
    db.messages.forEach(msg => {
      const convId = msg.conversationId;
      if (!indexedDBByConv[convId]) {
        indexedDBByConv[convId] = [];
      }
      indexedDBByConv[convId].push(msg);
    });
  });
  
  // Comparar conversación por conversación
  const allConvIds = new Set([
    ...Object.keys(indexedDBByConv),
    ...postgresData.map(conv => conv.conversationId)
  ]);
  
  const discrepancies = [];
  
  allConvIds.forEach(convId => {
    const indexedDBCount = indexedDBByConv[convId]?.length || 0;
    const postgresConv = postgresData.find(conv => conv.conversationId === convId);
    const postgresCount = postgresConv?.count || 0;
    
    if (indexedDBCount !== postgresCount) {
      discrepancies.push({
        conversationId: convId,
        indexedDBCount,
        postgresCount,
        difference: indexedDBCount - postgresCount
      });
    }
  });
  
  if (discrepancies.length > 0) {
    console.log('⚠️ Discrepancias encontradas:');
    console.table(discrepancies);
    
    // Mostrar detalles de la primera discrepancia
    const firstDiscrepancy = discrepancies[0];
    const convId = firstDiscrepancy.conversationId;
    
    console.log(`🔬 Detalles de conversación ${convId}:`);
    
    const indexedDBMessages = indexedDBByConv[convId] || [];
    const postgresMessages = postgresData.find(conv => conv.conversationId === convId)?.messages || [];
    
    console.log('IndexedDB messages:', indexedDBMessages.length);
    indexedDBMessages.forEach((msg, i) => {
      console.log(`  [${i}] ID: ${msg.id}, Content: ${JSON.stringify(msg.content)}, SyncState: ${msg.syncState}`);
    });
    
    console.log('PostgreSQL messages:', postgresMessages.length);
    postgresMessages.forEach((msg, i) => {
      console.log(`  [${i}] ID: ${msg.id}, Content: ${msg.content}, Created: ${msg.created_at}`);
    });
  } else {
    console.log('✅ No se encontraron discrepancias en el conteo de mensajes');
  }
  
  return {
    indexedDBData,
    postgresData,
    totalIndexedDB,
    totalPostgres,
    discrepancies
  };
}

// Ejecutar la comparación
compareMessageStores().then(result => {
  console.log('🏁 Análisis completado');
  console.log('Resultados guardados en window.messageComparisonResult');
  window.messageComparisonResult = result;
}).catch(error => {
  console.error('❌ Error en la comparación:', error);
});

// También exponer la función para ejecución manual
window.compareMessageStores = compareMessageStores;
console.log('💡 Para ejecutar manualmente: window.compareMessageStores()');
