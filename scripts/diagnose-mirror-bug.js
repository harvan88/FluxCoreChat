// Script para diagnosticar el problema del espejo de mensajes
// Ejecutar en consola del navegador cuando ambos usuarios estén en la misma conversación

(async function diagnoseMirrorBug() {
  console.log('🔍 DIAGNÓSTICO: Problema del Espejo de Mensajes');
  console.log('='.repeat(50));
  
  try {
    // 1. Obtener información de la cuenta actual
    const selectedAccountId = window.useUIStore?.getState()?.selectedAccountId;
    const currentUser = window.useAuthStore?.getState()?.user;
    
    console.log('📋 Información del Usuario Actual:');
    console.log(`   Account ID: ${selectedAccountId}`);
    console.log(`   User ID: ${currentUser?.id}`);
    console.log(`   Email: ${currentUser?.email}`);
    console.log(`   ¿Coinciden?: ${selectedAccountId === currentUser?.id ? 'SÍ' : 'NO'}`);
    
    // 2. Obtener conversación actual
    const conversationId = window.location.pathname.split('/').pop();
    console.log(`📱 Conversación: ${conversationId}`);
    
    // 3. Analizar mensajes recientes
    const response = await fetch(`/api/conversations/${conversationId}/messages?limit=10`);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Error al obtener mensajes:', data.message);
      return;
    }
    
    const messages = data.data;
    console.log(`📊 Últimos ${messages.length} mensajes:`);
    
    messages.forEach((msg, i) => {
      const isOutgoing = msg.senderAccountId === selectedAccountId;
      const content = typeof msg.content === 'string' ? msg.content : msg.content?.text || 'Sin texto';
      
      console.log(`   [${i + 1}] ${isOutgoing ? '📤 OUTGOING' : '📥 INCOMING'} - ${content.substring(0, 20)}...`);
      console.log(`       Sender: ${msg.senderAccountId?.slice(0, 8)}...`);
      console.log(`       Created: ${msg.created_at}`);
      console.log('');
    });
    
    // 4. Verificar si hay mensajes duplicados
    const contentMap = new Map();
    let duplicatesFound = 0;
    
    messages.forEach(msg => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      const key = `${msg.senderAccountId}:${content}`;
      
      if (contentMap.has(key)) {
        duplicatesFound++;
        console.log(`🚨 DUPLICADO ENCONTRADO:`);
        console.log(`   Mensaje 1: ${contentMap.get(key).created_at} - ${contentMap.get(key).senderAccountId?.slice(0, 8)}...`);
        console.log(`   Mensaje 2: ${msg.created_at} - ${msg.senderAccountId?.slice(0, 8)}...`);
      } else {
        contentMap.set(key, {
          created_at: msg.created_at,
          senderAccountId: msg.senderAccountId
        });
      }
    });
    
    if (duplicatesFound === 0) {
      console.log('✅ No se encontraron mensajes duplicados exactos');
    } else {
      console.log(`🚨 Se encontraron ${duplicatesFound} mensajes duplicados`);
    }
    
    // 5. Monitorear WebSocket
    console.log('🔌 Monitoreando mensajes WebSocket...');
    console.log('   Envía un mensaje ahora para ver el flujo completo...');
    
    // Interceptar mensajes WebSocket
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [url, options] = args;
      
      if (url.includes('/messages') && options?.method === 'POST') {
        console.log('📤 ENVIANDO MENSAJE:');
        console.log(`   URL: ${url}`);
        console.log(`   Body: ${options.body}`);
        
        // Parsear el body para ver el senderAccountId
        try {
          const body = JSON.parse(options.body);
          console.log(`   SenderAccountId en body: ${body.senderAccountId}`);
          console.log(`   ¿Coincide con selectedAccountId?: ${body.senderAccountId === selectedAccountId ? 'SÍ' : 'NO'}`);
        } catch (e) {
          console.log('   No se pudo parsear el body');
        }
      }
      
      return originalFetch.apply(this, args);
    };
    
    console.log('🎯 DIAGNÓSTICO COMPLETADO');
    console.log('📝 Si ves problemas:');
    console.log('   1. selectedAccountId !== user.id → Problema de autenticación');
    console.log('   2. Mensajes duplicados → Problema de envío múltiple');
    console.log('   3. SenderAccountId incorrecto → Problema en el frontend');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
})();

console.log('✅ Script de diagnóstico cargado. Ejecutando...');
