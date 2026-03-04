// Script para verificar que ahora muestra los últimos mensajes
// Ejecutar en consola del navegador

(async function verifyMessageOrder() {
  try {
    const conversationId = window.location.pathname.split('/').pop();
    if (!conversationId || conversationId === 'chat') {
      console.error('❌ No se encontró ID de conversación');
      return;
    }
    
    console.log(`🔍 Verificando orden de mensajes para conversación: ${conversationId}`);
    
    const response = await fetch(`/api/conversations/${conversationId}/messages?limit=5`);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Error:', data.message);
      return;
    }
    
    const messages = data.data;
    console.log(`📥 Se recibieron ${messages.length} mensajes`);
    
    if (messages.length === 0) {
      console.log('ℹ️ No hay mensajes en esta conversación');
      return;
    }
    
    // Verificar orden: el primer mensaje debería ser el más reciente
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    console.log('📋 Primer mensaje (debería ser el más reciente):');
    console.log(`   ID: ${firstMessage.id}`);
    console.log(`   Contenido: ${typeof firstMessage.content === 'string' ? firstMessage.content : firstMessage.content?.text || 'Sin texto'}`);
    console.log(`   Fecha: ${firstMessage.created_at}`);
    
    console.log('📋 Último mensaje (debería ser el más antiguo):');
    console.log(`   ID: ${lastMessage.id}`);
    console.log(`   Contenido: ${typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content?.text || 'Sin texto'}`);
    console.log(`   Fecha: ${lastMessage.created_at}`);
    
    // Verificar que las fechas estén en orden correcto
    const firstDate = new Date(firstMessage.created_at);
    const lastDate = new Date(lastMessage.created_at);
    
    if (firstDate > lastDate) {
      console.log('✅ CORRECTO: Los mensajes están en orden descendente (últimos primero)');
      console.log(`   Diferencia de tiempo: ${Math.round((firstDate - lastDate) / 1000 / 60)} minutos`);
    } else {
      console.log('❌ ERROR: Los mensajes siguen en orden ascendente (antiguos primero)');
    }
    
    // Mostrar orden completo
    console.log('📊 Orden completo de fechas:');
    messages.forEach((msg, i) => {
      const date = new Date(msg.created_at);
      console.log(`   [${i + 1}] ${date.toLocaleString()} - ${typeof msg.content === 'string' ? msg.content : msg.content?.text || 'Sin texto'}`);
    });
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
})();

console.log('✅ Script de verificación cargado. Ejecutando...');
