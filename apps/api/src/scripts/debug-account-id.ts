import { db, sql } from '@fluxcore/db';

/**
 * Debug del accountId que se está usando
 */
async function debugAccountId() {
  console.log('🔍 DEBUG DEL ACCOUNT ID');

  try {
    // 1. Verificar cuentas existentes
    const accounts = await db.execute(sql`
      SELECT id, username, account_type, created_at
      FROM accounts
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 CUENTAS EXISTENTES:');
    console.table(accounts);

    // 2. Verificar señales recientes y sus accountIds
    const recentSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at, evidence_raw
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.log('\n📊 SEÑALES RECIENTES:');
    console.table(recentSignals);

    // 3. Extraer accountIds de las señales
    console.log('\n🔍 ACCOUNT IDS EN SEÑALES:');
    for (const signal of recentSignals) {
      try {
        const evidence = JSON.parse(signal.evidence_raw);
        console.log(`Señal #${signal.sequence_number}:`);
        console.log(`- accountId: ${evidence.accountId}`);
        console.log(`- subjectKey: ${evidence.meta?.humanSenderId}`);
      } catch (error) {
        console.log(`❌ Error parsing signal #${signal.sequence_number}: ${error}`);
      }
    }

    // 4. Verificar si la cuenta del problema existe
    const problemAccountId = '535949b8-58a9-4310-87a7-42a2480f5746';
    const problemAccount = await db.execute(sql`
      SELECT id, username, account_type
      FROM accounts
      WHERE id = $1
      LIMIT 1
    `, [problemAccountId]);

    console.log(`\n🔍 CUENTA PROBLEMÁTICA (${problemAccountId}):`);
    console.table(problemAccount);

    // 5. Verificar qué accountId se está usando en outbox
    const outboxAccounts = await db.execute(sql`
      SELECT DISTINCT payload->>'accountId' as account_id, COUNT(*) as count
      FROM chatcore_outbox
      GROUP BY payload->>'accountId'
      ORDER BY count DESC
    `);

    console.log('\n📊 ACCOUNT IDS EN OUTBOX:');
    console.table(outboxAccounts);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugAccountId().catch(console.error);
