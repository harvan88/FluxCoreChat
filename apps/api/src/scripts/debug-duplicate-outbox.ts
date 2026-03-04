import { db, sql } from '@fluxcore/db';

/**
 * Debug para encontrar por qué hay duplicidad de outbox
 */
async function debugDuplicateOutbox() {
  console.log('🔍 DEBUG DE DUPLICIDAD DE OUTBOX');

  try {
    // 1. Encontrar mensajes con múltiples outbox
    console.log('\n📊 MENSAJES CON MÚLTIPLES OUTBOX:');
    const duplicateOutbox = await db.execute(sql`
      SELECT 
        message_id,
        COUNT(*) as outbox_count,
        ARRAY_AGG(id ORDER BY created_at) as outbox_ids,
        ARRAY_AGG(payload::json->>'accountId' ORDER BY created_at) as account_ids,
        ARRAY_AGG(status ORDER BY created_at) as statuses,
        ARRAY_AGG(created_at ORDER BY created_at) as created_times
      FROM chatcore_outbox
      GROUP BY message_id
      HAVING COUNT(*) > 1
      ORDER BY MAX(created_at) DESC
      LIMIT 5
    `);

    console.table(duplicateOutbox);

    // 2. Analizar cada duplicado
    for (const dup of duplicateOutbox) {
      console.log(`\n🔍 ANALIZANDO MENSAJE: ${dup.message_id}`);
      console.log(`- Outbox count: ${dup.outbox_count}`);
      console.log(`- Outbox IDs: ${dup.outbox_ids.join(', ')}`);
      console.log(`- Account IDs: ${dup.account_ids.join(', ')}`);
      console.log(`- Statuses: ${dup.statuses.join(', ')}`);
      
      // Verificar el mensaje
      const message = await db.execute(sql`
        SELECT id, sender_account_id, created_at, content
        FROM messages
        WHERE id = '${dup.message_id}'
        LIMIT 1
      `);
      
      if (message.length > 0) {
        console.log(`- Mensaje sender_account_id: ${message[0].sender_account_id}`);
        console.log(`- Mensaje created_at: ${message[0].created_at}`);
        
        try {
          const content = JSON.parse(message[0].content);
          console.log(`- Mensaje content: ${content.text}`);
        } catch (error) {
          console.log(`- Mensaje content: ${message[0].content}`);
        }
      }
      
      // Verificar las señales
      console.log(`- Verificando señales para este mensaje...`);
      const signals = await db.execute(sql`
        SELECT sequence_number, fact_type, observed_at, evidence_raw->>'accountId' as signal_account_id
        FROM fluxcore_signals
        WHERE evidence_raw->>'meta'->>'messageId' = '${dup.message_id}'
        ORDER BY sequence_number
      `);
      
      if (signals.length > 0) {
        console.log(`- Señales encontradas: ${signals.length}`);
        for (const signal of signals) {
          console.log(`  * Signal #${signal.sequence_number}: accountId=${signal.signal_account_id}`);
        }
      } else {
        console.log(`- No hay señales para este mensaje`);
      }
    }

    // 3. Verificar timestamps para entender el orden
    console.log('\n🕐 ANÁLISIS DE TIMESTAMPS:');
    const recentOutboxWithTime = await db.execute(sql`
      SELECT 
        id,
        message_id,
        payload::json->>'accountId' as account_id,
        status,
        created_at,
        LAG(created_at) OVER (PARTITION BY message_id ORDER BY created_at) as prev_created_at,
        created_at - LAG(created_at) OVER (PARTITION BY message_id ORDER BY created_at) as time_diff
      FROM chatcore_outbox
      WHERE message_id IN (
        SELECT message_id 
        FROM chatcore_outbox 
        GROUP BY message_id 
        HAVING COUNT(*) > 1
      )
      ORDER BY message_id, created_at
    `);

    console.table(recentOutboxWithTime);

  } catch (error) {
    console.error('❌ Error en debug:', error);
    throw error;
  }
}

debugDuplicateOutbox().catch(console.error);
