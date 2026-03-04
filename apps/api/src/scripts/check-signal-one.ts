import { db, sql } from '@fluxcore/db';

async function checkSignalOne() {
  try {
    const result = await db.execute(sql`
      SELECT sequence_number, fact_type, evidence_raw, subject_namespace, subject_key, object_namespace, object_key
      FROM fluxcore_signals
      WHERE sequence_number = 1
    `);
    
    console.log('🔍 Señal #1 (la que causa el error):');
    console.table(result);
    
    if (result.length > 0) {
      const signal = result[0];
      try {
        const evidence = JSON.parse(signal.evidence_raw);
        console.log(`\n🔍 Evidencia de señal #1:`);
        console.log('- accountId:', evidence.accountId);
        console.log('- subjectKey:', evidence.subject?.key);
        console.log('- objectKey:', evidence.object?.key);
        console.log('- driverId:', evidence.provenance?.driverId);
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking signal:', error);
  }
}

checkSignalOne().catch(console.error);
