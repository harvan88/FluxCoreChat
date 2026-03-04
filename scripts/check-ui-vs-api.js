// Copiar y pegar en la consola del navegador para verificar discrepancia real

(async function checkMessageDiscrepancy() {
  try {
    // 1. Obtener conversación actual desde la UI
    const conversationId = window.location.pathname.split('/').pop();
    if (!conversationId || conversationId === 'chat') {
      console.error('❌ No se encontró ID de conversación en la URL');
      return;
    }
    
    console.log(`🔍 Verificando conversación: ${conversationId}`);
    
    // 2. Contar mensajes en la UI
    const uiMessages = document.querySelectorAll('[data-message-id], .message-bubble, [class*="message"]');
    const uiCount = uiMessages.length;
    console.log(`📱 Mensajes visibles en UI: ${uiCount}`);
    
    // 3. Obtener mensajes desde API
    const token = localStorage.getItem('fluxcore_token');
    if (!token) {
      console.error('❌ No hay token de autenticación');
      return;
    }
    
    const response = await fetch(`/api/conversations/${conversationId}/messages?limit=100`);
    if (!response.ok) {
      console.error('❌ Error al obtener mensajes de API:', response.status);
      return;
    }
    
    const data = await response.json();
    const apiMessages = data.data || data.messages || [];
    const apiCount = apiMessages.length;
    console.log(`🗄️ Mensajes en API/PostgreSQL: ${apiCount}`);
    
    // 4. Comparar
    const difference = Math.abs(uiCount - apiCount);
    console.log(`📊 Diferencia: ${difference} mensajes`);
    
    if (difference === 0) {
      console.log('✅ No hay discrepancia - UI y API coinciden');
    } else {
      console.warn('⚠️ DISCREPANCIA DETECTADA');
      console.log(`UI muestra: ${uiCount} mensajes`);
      console.log(`API tiene: ${apiCount} mensajes`);
      
      // Mostrar últimos mensajes de API para comparación
      console.log('📋 Últimos 5 mensajes de API:');
      apiMessages.slice(-5).forEach((msg, i) => {
        const content = typeof msg.content === 'string' ? 
          (msg.content.startsWith('{') ? JSON.parse(msg.content).text : msg.content) : 
          msg.content?.text || 'N/A';
        console.log(`  [${apiMessages.length - 5 + i + 1}] ${content} (${msg.created_at})`);
      });
    }
    
    // 5. Verificar si hay mensajes duplicados o faltantes visualmente
    console.log('🔍 Análisis visual:');
    const visibleTexts = Array.from(uiMessages).map(el => {
      const textEl = el.querySelector('[class*="text"], .content, p');
      return textEl?.textContent?.trim() || 'Sin texto';
    });
    
    console.log('Textos visibles en UI:', visibleTexts.slice(-5));
    
    return {
      conversationId,
      uiCount,
      apiCount,
      difference,
      uiMessages: visibleTexts,
      apiMessages: apiMessages.slice(-5).map(m => ({
        content: typeof m.content === 'string' ? 
          (m.content.startsWith('{') ? JSON.parse(m.content).text : m.content) : 
          m.content?.text || 'N/A',
        created_at: m.created_at
      }))
    };
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
})();

console.log('✅ Script cargado. Ejecutando verificación...');
