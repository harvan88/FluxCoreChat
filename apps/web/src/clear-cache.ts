// Script para limpiar el estado del frontend
// Copiar y pegar en la consola del navegador (F12)

async function clearFrontendCache() {
  console.log('🧹 LIMPIANDO CACHE DEL FRONTEND...');
  
  try {
    // 1. Limpiar IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      console.log('📊 Bases de datos encontradas:', databases.map(db => db.name || 'unnamed'));
      
      for (const db of databases) {
        if (db.name && db.name.includes('fluxcore')) {
          console.log(`🗑️ Eliminando base de datos: ${db.name}`);
          await indexedDB.deleteDatabase(db.name);
        }
      }
      console.log('✅ IndexedDB limpiada');
    }
    
    // 2. Limpiar localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('fluxcore') || key.includes('selected') || key.includes('account'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log(`🗑️ Eliminando localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    console.log('✅ localStorage limpiado');
    
    // 3. Limpiar sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('fluxcore')) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      console.log(`🗑️ Eliminando sessionStorage key: ${key}`);
      sessionStorage.removeItem(key);
    });
    console.log('✅ sessionStorage limpiado');
    
    // 4. Recargar página
    console.log('🔄 Recargando página...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error limpiando cache:', error);
  }
}

// Ejecutar la limpieza
clearFrontendCache();
