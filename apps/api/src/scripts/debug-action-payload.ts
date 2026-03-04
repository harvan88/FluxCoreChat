import { db, sql } from '@fluxcore/db';

/**
 * Debug del action payload para encontrar el targetAccountId incorrecto
 */
async function debugActionPayload() {
  console.log('🔍 DEBUG DEL ACTION PAYLOAD');

  try {
    // 1. Verificar el último mensaje con accountId problemático
    const problematicMessage = await db.execute(sql`
      SELECT id, sender_account_id, created_at, content
      FROM messages
      WHERE id = 'de718ddd-03fe-46bd-967b-fd8a50a45715'
      LIMIT 1
    `);

    if (problematicMessage.length === 0) {
      console.log('❌ Mensaje problemático no encontrado');
      return;
    }

    const message = problematicMessage[0];
    console.log('\n📊 MENSAJE PROBLEMÁTICO:');
    console.log('- ID:', message.id);
    console.log('- sender_account_id:', message.sender_account_id);
    console.log('- Created:', message.created_at);

    // 2. Verificar el outbox correspondiente
    const outbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      WHERE message_id = 'de718ddd-03fe-46bd-967b-fd8a50a45715'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (outbox.length > 0) {
      console.log('\n📦 OUTBOX CORRESPONDIENTE:');
      console.log('- ID:', outbox[0].id);
      console.log('- Status:', outbox[0].status);
      
      try {
        const payload = JSON.parse(outbox[0].payload);
        console.log('- accountId:', payload.accountId);
        console.log('- userId:', payload.userId);
        
        // 3. Verificar si el accountId coincide con el sender_account_id
        if (payload.accountId === message.sender_account_id) {
          console.log('✅ accountId coincide con sender_account_id');
        } else {
          console.log('❌ accountId NO coincide con sender_account_id');
          console.log('  - Outbox accountId:', payload.accountId);
          console.log('  - Mensaje sender_account_id:', message.sender_account_id);
        }
        
      } catch (error) {
        console.log('❌ Error parsing payload:', error);
      }
    }

    // 4. Verificar logs del servidor para ver qué está pasando
    console.log('\n🔍 VERIFICANDO LOGS DEL SERVIDOR:');
    console.log('Revisa los logs para ver si hay algún lugar que esté usando:');
    console.log('- targetAccountId: 5c59a05b-4b94-4f78-ab14-9a5fdabe2d31');
    console.log('- action.payload.targetAccountId');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugActionPayload().catch(console.error);
