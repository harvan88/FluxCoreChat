import { db, sql } from '@fluxcore/db';

async function checkAllRecentSignals() {
  try {
    const result = await db.execute(sql`
      SELECT sequence_number, fact_type, evidence_raw
      FROM fluxcore_signals
      WHERE sequence_number >= 250
      ORDER BY sequence_number DESC
      LIMIT 10
    `);
    
    console.log('🔍 Todas las señales recientes (250+):');
    
    for (const signal of result) {
      try {
        const evidence = JSON.parse(signal.evidence_raw);
        console.log(`\n--- Señal #${signal.sequence_number} (${signal.fact_type}) ---`);
        console.log('- accountId:', evidence.accountId);
        console.log('- subjectKey:', evidence.subject?.key);
        console.log('- objectKey:', evidence.object?.key);
        console.log('- driverId:', evidence.provenance?.driverId);
        
        // Buscar el problemático
        if (evidence.subject?.key === '535949b8-58a9-4310-87a7-42a2480f5746') {
          console.log('🚨 ¡ENCONTRADO EL PROBLEMÁTICO!');
        }
      } catch (error) {
        console.log(`❌ Error parsing signal #${signal.sequence_number}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking signals:', error);
  }
}

checkAllRecentSignals().catch(console.error);
