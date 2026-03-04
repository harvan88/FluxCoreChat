import { db, sql } from '@fluxcore/db';

/**
 * Debug para ver la estructura exacta de item.payload
 */
async function debugItemPayload() {
  console.log('🔍 DEBUG DE ITEM.PAYLOAD');

  try {
    // 1. Obtener un outbox pendiente
    const pendingOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      WHERE status = 'pending'
      ORDER BY created_at
      LIMIT 1
    `);

    if (pendingOutbox.length === 0) {
      console.log('❌ No hay outbox pendientes');
      return;
    }

    const item = pendingOutbox[0];
    console.log('\n📦 OUTBOX PENDIENTE:');
    console.log('- ID:', item.id);
    console.log('- Message ID:', item.message_id);
    console.log('- Status:', item.status);
    console.log('- Created:', item.created_at);

    // 2. Verificar item.payload directamente
    console.log('\n🔍 VERIFICANDO ITEM.PAYLOAD DIRECTAMENTE:');
    console.log('- Type:', typeof item.payload);
    console.log('- Is string?', typeof item.payload === 'string');
    console.log('- Length:', item.payload.length);
    console.log('- Preview:', item.payload.substring(0, 200) + '...');

    // 3. Verificar qué pasa si lo pasamos directamente
    console.log('\n📞 PASANDO ITEM.PAYLOAD DIRECTAMENTE A CHATCORE GATEWAY...');
    
    try {
      const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
      
      console.log('🔍 ITEM.PAYLOAD DIRECTO:');
      console.log('- accountId:', item.payload.accountId);
      console.log('- userId:', item.payload.userId);
      console.log('- payload:', item.payload.payload);
      console.log('- meta:', item.payload.meta);
      
      const result = await chatCoreGateway.certifyIngress(item.payload);
      
      console.log('\n✅ RESULTADO CON ITEM.PAYLOAD DIRECTO:');
      console.log('- accepted:', result.accepted);
      console.log('- signalId:', result.signalId);

    } catch (error) {
      console.log('❌ Error con item.payload directo:', error);
    }

    // 4. Verificar qué pasa si lo parseamos primero
    console.log('\n📞 PASANDO ITEM.PAYLOAD PARSEADO...');
    
    try {
      const parsedPayload = JSON.parse(item.payload);
      
      console.log('🔍 ITEM.PAYLOAD PARSEADO:');
      console.log('- accountId:', parsedPayload.accountId);
      console.log('- userId:', parsedPayload.userId);
      console.log('- payload:', parsedPayload.payload);
      console.log('- meta:', parsedPayload.meta);
      
      const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
      
      const result = await chatCoreGateway.certifyIngress(parsedPayload);
      
      console.log('\n✅ RESULTADO CON ITEM.PAYLOAD PARSEADO:');
      console.log('- accepted:', result.accepted);
      console.log('- signalId:', result.signalId);

    } catch (error) {
      console.log('❌ Error con item.payload parseado:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugItemPayload().catch(console.error);
