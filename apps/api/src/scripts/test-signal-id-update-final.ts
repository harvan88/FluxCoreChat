import { db, sql } from '@fluxcore/db';

/**
 * Probar actualizar el signal_id manualmente - versión final
 */
async function testSignalIdUpdateFinal() {
  console.log('🔍 PROBANDO ACTUALIZACIÓN DE signal_id - VERSIÓN FINAL');

  try {
    // 1. Obtener el último mensaje
    const lastMessage = await db.execute(sql`
      SELECT id, created_at, signal_id, content
      FROM messages
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (lastMessage.length === 0) {
      console.log('❌ No hay mensajes');
      return;
    }

    const message = lastMessage[0];
    console.log('\n📊 ÚLTIMO MENSAJE:');
    console.log('- ID:', message.id);
    console.log('- signal_id:', message.signal_id);
    console.log('- Created:', message.created_at);

    // 2. Actualizar manualmente el signal_id (sin comillas para bigint)
    console.log('\n📝 ACTUALIZANDO signal_id A 241...');
    
    await db.execute(sql`
      UPDATE messages 
      SET signal_id = 241 
      WHERE id = '${message.id}'
    `);

    console.log('✅ signal_id actualizado');

    // 3. Verificar la actualización
    const updatedMessage = await db.execute(sql`
      SELECT id, signal_id
      FROM messages
      WHERE id = '${message.id}'
      LIMIT 1
    `);

    console.log('\n📊 MENSAJE ACTUALIZADO:');
    console.table(updatedMessage);

    // 4. Verificar la señal
    const signal = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at
      FROM fluxcore_signals
      WHERE sequence_number = 241
      LIMIT 1
    `);

    console.log('\n📊 SEÑAL #241:');
    console.table(signal);

    console.log('\n🎉 ¡VINCULACIÓN COMPLETA!');
    console.log('- Mensaje ID:', updatedMessage[0].id);
    console.log('- Signal ID:', updatedMessage[0].signal_id);
    console.log('- Signal Sequence:', signal[0].sequence_number);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testSignalIdUpdateFinal().catch(console.error);
