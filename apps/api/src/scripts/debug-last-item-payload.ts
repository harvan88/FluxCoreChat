import { db, sql } from '@fluxcore/db';

/**
 * Debug para ver la estructura exacta del último item.payload
 */
async function debugLastItemPayload() {
  console.log('🔍 DEBUG DEL ÚLTIMO ITEM.PAYLOAD');

  try {
    // 1. Obtener el último outbox
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

    const item = lastOutbox[0];
    console.log('\n📦 ÚLTIMO OUTBOX:');
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

    // 3. Verificar qué pasa si lo pasamos directamente (como lo hace el worker)
    console.log('\n📞 PASANDO ITEM.PAYLOAD DIRECTAMENTE (COMO EL WORKER)...');
    
    try {
      const { chatCoreGateway } = await import('../services/fluxcore/chatcore-gateway.service');
      
      // El worker pasa item.payload directamente sin parsear
      const result = await chatCoreGateway.certifyIngress(item.payload as any);
      
      console.log('\n✅ RESULTADO CON ITEM.PAYLOAD DIRECTO:');
      console.log('- accepted:', result.accepted);
      console.log('- signalId:', result.signalId);

    } catch (error) {
      console.log('❌ Error con item.payload directo:', error);
    }

    // 4. Verificar qué pasa si lo parseamos primero
    console.log('\n📞 PASANDO ITEM.PAYLOAD PARSEADO (FORMA CORRECTA)...');
    
    try {
      const parsedPayload = JSON.parse(item.payload as string);
      
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

debugLastItemPayload().catch(console.error);
