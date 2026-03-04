import { db, sql } from '@fluxcore/db';

/**
 * Verificación DIRECTA de persistencia sin inferencias
 */
async function verifyDirectPersistence() {
  console.log('🔍 VERIFICACIÓN DIRECTA DE PERSISTENCIA');

  try {
    // 1. Estado ACTUAL de la tabla messages
    const currentMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        sender_account_id,
        content->>'text' as text_content,
        created_at,
        signal_id
      FROM messages 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    console.log('\n📊 ESTADO ACTUAL DE MESSAGES:');
    console.table(currentMessages);

    // 2. Conteo TOTAL por conversación
    const messageCounts = await db.execute(sql`
      SELECT 
        conversation_id,
        COUNT(*) as total_messages,
        MAX(created_at) as last_message
      FROM messages 
      GROUP BY conversation_id 
      ORDER BY last_message DESC
    `);

    console.log('\n📊 MENSAJES POR CONVERSACIÓN:');
    console.table(messageCounts);

    // 3. Verificar mensajes SIN signal (problema de certificación)
    const uncertifiedMessages = await db.execute(sql`
      SELECT 
        id,
        conversation_id,
        content->>'text' as text_content,
        created_at
      FROM messages 
      WHERE signal_id IS NULL
        AND created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 MENSAJES SIN CERTIFICAR (última hora):');
    console.table(uncertifiedMessages);

    // 4. Verificar outbox entries
    const outboxStatus = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MAX(created_at) as last_entry
      FROM chatcore_outbox 
      GROUP BY status
      ORDER BY last_entry DESC
    `);

    console.log('\n📊 ESTADO DEL OUTBOX:');
    console.table(outboxStatus);

    // 5. Verificar signals recientes
    const recentSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        certified_by_adapter,
        observed_at
      FROM fluxcore_signals 
      WHERE observed_at >= NOW() - INTERVAL '1 hour'
      ORDER BY observed_at DESC
      LIMIT 10
    `);

    console.log('\n📊 SIGNALS RECIENTES (última hora):');
    console.table(recentSignals);

    // 6. Verificación CRÍTICA: ¿Existe el mensaje que envió el usuario?
    const testMessage = await db.execute(sql`
      SELECT 
        id,
        content->>'text' as text_content,
        created_at,
        signal_id
      FROM messages 
      WHERE content->>'text' LIKE '%Hola prueba de persistencia%'
        OR content->>'text' LIKE '%Test message%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 BÚSQUEDA DE MENSAJES DE PRUEBA:');
    console.table(testMessage);

    console.log('\n🎯 CONCLUSIÓN DIRECTA:');
    if (testMessage.length > 0) {
      console.log('✅ LOS MENSAJES DE PRUEBA EXISTEN EN LA BASE DE DATOS');
      testMessage.forEach(msg => {
        console.log(`   - ID: ${msg.id}`);
        console.log(`   - Texto: "${msg.text_content}"`);
        console.log(`   - Creado: ${msg.created_at}`);
        console.log(`   - Signal ID: ${msg.signal_id || 'NULL (sin certificar)'}`);
      });
    } else {
      console.log('❌ LOS MENSAJES DE PRUEBA NO EXISTEN EN LA BASE DE DATOS');
      console.log('   - El problema está en la PERSISTENCIA, no en la UI');
    }

  } catch (error) {
    console.error('❌ Error en verificación directa:', error);
    throw error;
  }
}

verifyDirectPersistence().catch(console.error);
