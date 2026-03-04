import { db, sql } from '@fluxcore/db';

/**
 * Auditoría del uso de accountIds en señales
 */
async function auditAccountUsage() {
  console.log('🔍 AUDITORÍA DE USO DE ACCOUNT_IDS');

  try {
    // 1. Verificar distribución de accountIds en señales
    console.log('\n📊 DISTRIBUCIÓN DE ACCOUNT_IDS EN SEÑALES:');
    const accountDistribution = await db.execute(sql`
      SELECT 
        evidence_raw->>'accountId' as account_id,
        COUNT(*) as count,
        MAX(sequence_number) as latest_signal
      FROM fluxcore_signals
      WHERE evidence_raw->>'accountId' IS NOT NULL
      GROUP BY evidence_raw->>'accountId'
      ORDER BY latest_signal DESC
    `);

    console.table(accountDistribution);

    // 2. Analizar cada accountId
    for (const row of accountDistribution) {
      const accountId = row.account_id;
      console.log(`\n🔍 ANALIZANDO ACCOUNT_ID: ${accountId}`);
      console.log(`- Count: ${row.count}`);
      console.log(`- Latest signal: ${row.latest_signal}`);
      
      // Verificar si existe en accounts
      const account = await db.execute(sql`
        SELECT id, username, account_type, created_at
        FROM accounts
        WHERE id = '${accountId}'
        LIMIT 1
      `);
      
      if (account.length > 0) {
        console.log('✅ Account existe:');
        console.log(`- Username: ${account[0].username}`);
        console.log(`- Type: ${account[0].account_type}`);
        console.log(`- Created: ${account[0].created_at}`);
      } else {
        console.log('❌ Account NO existe');
      }
    }

    // 3. Verificar mensajes recientes y sus señales
    console.log('\n📊 MENSAJES RECIENTES Y SUS SEÑALES:');
    const recentMessages = await db.execute(sql`
      SELECT 
        m.id,
        m.created_at,
        m.signal_id,
        s.sequence_number,
        s.evidence_raw->>'accountId' as signal_account_id
      FROM messages m
      LEFT JOIN fluxcore_signals s ON m.signal_id = s.sequence_number
      WHERE m.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

    console.table(recentMessages);

    // 4. Verificar outbox recientes
    console.log('\n📦 OUTBOX RECIENTES:');
    const recentOutbox = await db.execute(sql`
      SELECT 
        id,
        message_id,
        status,
        created_at,
        payload::json->>'accountId' as outbox_account_id
      FROM chatcore_outbox
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.table(recentOutbox);

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

auditAccountUsage().catch(console.error);
