import { db, sql } from '@fluxcore/db';

async function checkRecentSignals() {
  try {
    const result = await db.execute(sql`
      SELECT sequence_number, evidence_raw, observed_at
      FROM fluxcore_signals
      WHERE sequence_number >= 259
      ORDER BY sequence_number DESC
      LIMIT 3
    `);
    
    console.log('🔍 Señales recientes:');
    console.table(result);
    
    if (result.length > 0) {
      const signal = result[0];
      try {
        const evidence = JSON.parse(signal.evidence_raw);
        console.log(`\n🔍 Evidencia de señal #${signal.sequence_number}:`);
        console.log('- accountId:', evidence.accountId);
        console.log('- subjectKey:', evidence.subject?.key);
        console.log('- objectKey:', evidence.object?.key);
        console.log('- driverId:', evidence.provenance?.driverId);
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking signals:', error);
  }
}

checkRecentSignals().catch(console.error);
