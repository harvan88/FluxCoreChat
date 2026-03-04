// Script para diagnosticar el problema de duplicación de mensajes
// Ejecutar en consola del navegador durante una conversación activa

(function diagnoseMessageDuplication() {
  console.log('🔍 DIAGNÓSTICO DE DUPLICACIÓN DE MENSAJES');
  console.log('='.repeat(50));
  
  // 1. Verificar accountId actual
  const selectedAccountId = window.useUIStore?.getState?.()?.selectedAccountId;
  console.log('📍 AccountId seleccionado:', selectedAccountId);
  
  // 2. Verificar mensajes actuales
  const messages = window.useChat?.getState?.()?.messages || [];
  console.log(`📄 Mensajes cargados: ${messages.length}`);
  
  messages.forEach((msg, index) => {
    console.log(`  ${index + 1}. ID: ${msg.id}`);
    console.log(`     Sender: ${msg.senderAccountId}`);
    console.log(`     Texto: "${msg.content.text}"}`);
    console.log(`     ¿Es mío?: ${msg.senderAccountId === selectedAccountId ? '✅ SÍ' : '❌ NO'}`);
    console.log(`     Firma: ${msg.senderAccountId}:${msg.content.text || ''}::${msg.generatedBy}`);
    console.log('');
  });
  
  // 3. Verificar si hay duplicados por contenido
  const contentMap = new Map();
  messages.forEach(msg => {
    const text = msg.content.text || '';
    if (!contentMap.has(text)) {
      contentMap.set(text, []);
    }
    contentMap.get(text).push(msg);
  });
  
  console.log('🔄 ANÁLISIS DE DUPLICADOS POR CONTENIDO:');
  contentMap.forEach((msgs, text) => {
    if (msgs.length > 1) {
      console.log(`⚠️  TEXTO DUPLICADO: "${text}"`);
      msgs.forEach((msg, i) => {
        console.log(`   ${i + 1}. Sender: ${msg.senderAccountId}, ID: ${msg.id}`);
      });
    }
  });
  
  // 4. Verificar conexión WebSocket
  console.log('🔌 ESTADO WEBSOCKET:');
  console.log(`   Status: ${window.useWebSocket?.getState?.()?.status || 'desconocido'}`);
  console.log(`   AccountId: ${window.useWebSocket?.getState?.()?.accountId || 'desconocido'}`);
  
  // 5. Monitorear próximos mensajes
  console.log('👂 MONITOREO ACTIVADO - Envía un mensaje para ver el flujo:');
  
  // Interceptar addReceivedMessage si existe
  const originalAddReceivedMessage = window.useChat?.getState?.()?.addReceivedMessage;
  if (originalAddReceivedMessage) {
    const useChatState = window.useChat.getState();
    useChatState.addReceivedMessage = function(message) {
      console.log('📨 MENSAJE RECIBIDO POR WEBSOCKET:');
      console.log('   ID:', message.id);
      console.log('   Sender:', message.senderAccountId);
      console.log('   Texto:', `"${message.content.text}"`);
      console.log('   ¿Es mío?:', message.senderAccountId === selectedAccountId);
      console.log('   Firma:', `${message.senderAccountId}:${message.content.text || ''}::${message.generatedBy}`);
      
      // Llamar al original
      return originalAddReceivedMessage.call(this, message);
    };
  }
  
  // 6. Verificar estado de la UI
  console.log('🎨 ESTADO DE LA UI:');
  const uiState = window.useUIStore?.getState?.();
  if (uiState) {
    console.log(`   Selected Account: ${uiState.selectedAccountId}`);
    console.log(`   Selected Conversation: ${uiState.selectedConversationId}`);
    console.log(`   Active Conversation: ${uiState.activeConversation?.id}`);
  }
  
  console.log('\n✅ Diagnóstico completado. Envía un mensaje para ver el flujo en tiempo real.');
})();
