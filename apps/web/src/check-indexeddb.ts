// Script para verificar IndexedDB en el navegador
// Copiar y pegar en la consola del navegador

async function checkIndexedDB() {
  console.log('🔍 VERIFICANDO INDEXEDDB...');
  
  try {
    // Abrir la base de datos
    const request = indexedDB.open('fluxcore-offline', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('✅ Base de datos abierta:', db.name);
      
      // Verificar si existe el object store de mensajes
      if (db.objectStoreNames.contains('messages')) {
        console.log('✅ Object store "messages" encontrado');
        
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const messages = getAllRequest.result;
          console.log(`📊 Total de mensajes en IndexedDB: ${messages.length}`);
          
          // Filtrar mensajes de la conversación específica
          const conversationId = '51b841be-1830-4d17-a354-af7f03bee332';
          const conversationMessages = messages.filter((msg: any) => 
            msg.conversationId === conversationId
          );
          
          console.log(`📊 Mensajes de la conversación ${conversationId}: ${conversationMessages.length}`);
          
          // Buscar mensajes "hola"
          const holaMessages = conversationMessages.filter((msg: any) => 
            msg.content?.text?.toLowerCase().trim() === 'hola'
          );
          
          console.log(`📊 Mensajes "hola" en IndexedDB: ${holaMessages.length}`);
          
          holaMessages.forEach((msg: any, i: number) => {
            console.log(`${i + 1}. ID: ${msg.id}`);
            console.log(`   Emisor: ${msg.senderAccountId}`);
            console.log(`   Tipo: ${msg.type}`);
            console.log(`   Fecha: ${msg.createdAt}`);
            console.log(`   Contenido: ${JSON.stringify(msg.content)}`);
          });
          
          // Verificar si hay duplicados por ID
          const ids = messages.map((msg: any) => msg.id);
          const uniqueIds = new Set(ids);
          
          if (ids.length !== uniqueIds.size) {
            console.log(`❌ ¡IDS DUPLICADOS EN INDEXEDDB!`);
            console.log(`   Total: ${ids.length}, Únicos: ${uniqueIds.size}`);
          } else {
            console.log(`✅ No hay IDs duplicados en IndexedDB`);
          }
        };
        
        getAllRequest.onerror = () => {
          console.error('❌ Error leyendo mensajes de IndexedDB');
        };
        
      } else {
        console.log('❌ Object store "messages" no encontrado');
      }
    };
    
    request.onerror = () => {
      console.error('❌ Error abriendo IndexedDB');
    };
    
  } catch (error) {
    console.error('❌ Error verificando IndexedDB:', error);
  }
}

// Ejecutar la verificación
checkIndexedDB();
