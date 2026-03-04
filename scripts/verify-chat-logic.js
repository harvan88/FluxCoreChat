// Verificar que ahora muestra los últimos mensajes correctamente
(async function verifyChatLogic() {
  try {
    const conversationId = window.location.pathname.split('/').pop();
    if (!conversationId || conversationId === 'chat') {
      console.error('❌ No se encontró ID de conversación');
      return;
    }
    
    console.log(`🔍 Verificando lógica de chat para: ${conversationId}`);
    
    const response = await fetch(`/api/conversations/${conversationId}/messages?limit=5`);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Error:', data.message);
      return;
    }
    
    const messages = data.data;
    console.log(`📥 Se recibieron ${messages.length} mensajes`);
    
    if (messages.length === 0) {
      console.log('ℹ️ No hay mensajes');
      return;
    }
    
    // Verificar orden descendente (últimos primero)
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    console.log('📋 Primer mensaje (debería ser el MÁS RECIENTE):');
    console.log(`   ID: ${firstMessage.id}`);
    console.log(`   Contenido: ${typeof firstMessage.content === 'string' ? firstMessage.content : firstMessage.content?.text || 'Sin texto'}`);
    console.log(`   Fecha: ${firstMessage.created_at}`);
    
    console.log('📋 Último mensaje (debería ser el MÁS ANTIGUO de los 5):');
    console.log(`   ID: ${lastMessage.id}`);
    console.log(`   Contenido: ${typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content?.text || 'Sin texto'}`);
    console.log(`   Fecha: ${lastMessage.created_at}`);
    
    // Verificar orden correcto
    const firstDate = new Date(firstMessage.created_at);
    const lastDate = new Date(lastMessage.created_at);
    
    if (firstDate > lastDate) {
      console.log('✅ CORRECTO: Mensajes en orden descendente (últimos primero)');
      console.log('🎉 La lógica de chat ahora funciona como WhatsApp/Telegram');
    } else {
      console.log('❌ ERROR: Mensajes en orden incorrecto');
    }
    
    // Mostrar secuencia completa
    console.log('📊 Secuencia de mensajes (del más reciente al más antiguo):');
    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at);
      const content = typeof msg.content === 'string' ? msg.content : msg.content?.text || 'Sin texto';
      console.log(`   [${i + 1}] ${date.toLocaleTimeString()} - ${content.substring(0, 30)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

console.log('✅ Script de verificación cargado. Ejecutando...');
