import { db, sql } from '@fluxcore/db';

/**
 * Debug para analizar qué datos llegan a ChatCoreGateway
 */
async function debugChatCoreGatewayInput() {
  console.log('🔍 DEBUG DE CHATCORE GATEWAY INPUT');

  try {
    // 1. Verificar el último outbox procesado
    const lastOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (lastOutbox.length === 0) {
      console.log('❌ No hay outbox');
      return;
    }

    const outbox = lastOutbox[0];
    console.log('\n📦 ÚLTIMO OUTBOX:');
    console.log('- ID:', outbox.id);
    console.log('- Message ID:', outbox.message_id);
    console.log('- Status:', outbox.status);
    console.log('- Created:', outbox.created_at);

    // 2. Parsear payload con detalle
    console.log('\n🔍 ANÁLISIS DEL PAYLOAD:');
    try {
      const payload = JSON.parse(outbox.payload);
      
      console.log('📊 ESTRUCTURA DEL PAYLOAD:');
      console.log('- Type:', typeof payload);
      console.log('- Keys:', Object.keys(payload));
      
      // 3. Verificar cada campo
      console.log('\n🔍 VERIFICACIÓN DE CAMPOS:');
      console.log('- accountId:', payload.accountId, '(type:', typeof payload.accountId, ')');
      console.log('- userId:', payload.userId, '(type:', typeof payload.userId, ')');
      console.log('- payload:', payload.payload, '(type:', typeof payload.payload, ')');
      console.log('- meta:', payload.meta, '(type:', typeof payload.meta, ')');
      
      // 4. Verificar si los campos están vacíos
      console.log('\n🚨 VERIFICACIÓN DE CAMPOS VACÍOS:');
      console.log('- accountId vacío?', !payload.accountId);
      console.log('- userId vacío?', !payload.userId);
      console.log('- payload vacío?', !payload.payload);
      console.log('- meta vacío?', !payload.meta);
      
      // 5. Verificar meta
      if (payload.meta) {
        console.log('\n🔍 ANÁLISIS DE META:');
        console.log('- meta keys:', Object.keys(payload.meta));
        console.log('- meta.messageId:', payload.meta.messageId);
        console.log('- meta.conversationId:', payload.meta.conversationId);
      }

      // 6. Simular llamada a ChatCoreGateway con logs
      console.log('\n📞 SIMULANDO LLAMADA A CHATCORE GATEWAY...');
      
      try {
        const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
        
        console.log('🔍 PARÁMETROS QUE SE PASARÁN:');
        console.log('- accountId:', payload.accountId);
        console.log('- userId:', payload.userId);
        console.log('- payload:', JSON.stringify(payload.payload));
        console.log('- meta:', JSON.stringify(payload.meta));
        
        const result = await chatCoreGateway.certifyIngress({
          accountId: payload.accountId,
          userId: payload.userId,
          payload: payload.payload,
          meta: payload.meta
        });

        console.log('\n✅ RESULTADO DE CHATCORE GATEWAY:');
        console.log('- accepted:', result.accepted);
        console.log('- signalId:', result.signalId);
        console.log('- reason:', result.reason);

      } catch (error) {
        console.log('❌ Error en ChatCoreGateway:', error);
      }

    } catch (error) {
      console.log('❌ Error parsing payload:', error);
      console.log('Raw payload:', outbox.payload);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugChatCoreGatewayInput().catch(console.error);
