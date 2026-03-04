/**
 * Script de prueba para validar el flujo ChatCore → Kernel
 * Ejecutar con: node test-chatcore-flow.js
 */

const API_BASE = 'http://localhost:3000';

async function testChatCoreFlow() {
  console.log('🧪 Iniciando prueba del flujo ChatCore → Kernel...\n');

  try {
    // 1. Simular mensaje de WhatsApp
    console.log('📱 1. Enviando mensaje WhatsApp simulado...');
    const whatsappResponse = await fetch(`${API_BASE}/test-chatcore/simulate-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hola, quiero información sobre sus servicios de chat'
      })
    });

    const whatsappResult = await whatsappResponse.json();
    console.log('✅ WhatsApp response:', whatsappResult);

    // 2. Simular mensaje de WebChat
    console.log('\n🌐 2. Enviando mensaje WebChat simulado...');
    const webchatResponse = await fetch(`${API_BASE}/test-chatcore/simulate-webchat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hola desde el widget web'
      })
    });

    const webchatResult = await webchatResponse.json();
    console.log('✅ WebChat response:', webchatResult);

    // 3. Esperar a que el outbox procese (5 segundos)
    console.log('\n⏳ 3. Esperando procesamiento del outbox (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Verificación SQL directa
    console.log('\n🔍 4. Ejecutando verificación SQL directa...');
    
    // Query 1: Correlación mensaje-signal
    const correlationQuery = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(signal_id) as messages_with_signal,
        COUNT(*) - COUNT(signal_id) as orphaned_messages,
        ROUND((COUNT(signal_id)::float / COUNT(*) * 100), 2) as correlation_rate_percent
      FROM messages 
      WHERE generated_by = 'human'
        AND created_at >= NOW() - INTERVAL '5 minutes'
    `;

    // Query 2: FactTypes correctos
    const factTypeQuery = `
      SELECT 
        fact_type,
        COUNT(*) as count
      FROM fluxcore_signals 
      WHERE created_at >= NOW() - INTERVAL '5 minutes'
      GROUP BY fact_type
      ORDER BY count DESC
    `;

    // Query 3: Samples de correlación
    const samplesQuery = `
      SELECT 
        m.id as message_id,
        m.conversation_id,
        m.signal_id,
        s.sequence_number,
        s.fact_type,
        s.provenance_external_id,
        m.created_at as message_created,
        s.observed_at as signal_created
      FROM messages m
      LEFT JOIN fluxcore_signals s ON s.sequence_number = m.signal_id
      WHERE m.generated_by = 'human'
        AND m.created_at >= NOW() - INTERVAL '5 minutes'
      ORDER BY m.created_at DESC
      LIMIT 5
    `;

    console.log('📊 Queries SQL para ejecutar manualmente:');
    console.log('\n-- Correlación mensaje-signal:');
    console.log(correlationQuery);
    console.log('\n-- FactTypes:');
    console.log(factTypeQuery);
    console.log('\n-- Samples:');
    console.log(samplesQuery);

    // 5. Evaluación final basada en respuestas
    console.log('\n🎯 5. Evaluación final:');
    
    const success1 = whatsappResult.success;
    const success2 = webchatResult.success;
    
    if (success1 && success2) {
      console.log('✅ Ambos mensajes se procesaron correctamente');
      console.log('✅ WhatsApp messageId:', whatsappResult.messageId);
      console.log('✅ WebChat messageId:', webchatResult.messageId);
      console.log('\n🎉 ¡PRUEBA BÁSICA EXITOSA!');
      console.log('\n📋 PASOS SIGUIENTES:');
      console.log('1. Ejecuta las queries SQL manualmente para verificar correlación');
      console.log('2. Revisa que factType sea "chatcore.message.received"');
      console.log('3. Verifica que signal_id no sea NULL en los mensajes');
      console.log('4. Confirma que el outbox esté vacío después del procesamiento');
      
      return true;
    } else {
      console.log('❌ Algunos mensajes fallaron:');
      if (!success1) console.log('  - WhatsApp:', whatsappResult.error);
      if (!success2) console.log('  - WebChat:', webchatResult.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    return false;
  }
}

// Ejecutar prueba
if (require.main === module) {
  testChatCoreFlow()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testChatCoreFlow };
