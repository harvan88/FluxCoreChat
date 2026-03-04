import { db, sql } from '@fluxcore/db';
import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';

/**
 * Script para probar manualmente la certificación
 */
async function testManualCertification() {
  console.log('🧪 Testing manual certification...');

  try {
    // 1. Obtener el payload de una entrada reciente del outbox
    const entry = await db.execute(sql`
      SELECT id, message_id, payload, status, created_at
      FROM chatcore_outbox
      WHERE status = 'sent'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (entry.length === 0) {
      console.log('❌ No sent entries found in outbox');
      return;
    }

    const outboxEntry = entry[0];
    console.log('📊 Found outbox entry:', outboxEntry);

    // 2. Parsear payload
    let payload;
    try {
      payload = JSON.parse(outboxEntry.payload);
      console.log('📦 Parsed payload:', payload);
    } catch (error) {
      console.error('❌ Failed to parse payload:', error);
      return;
    }

    // 3. Intentar certificar con el payload exacto
    console.log('🔧 Attempting certification...');
    const result = await chatCoreGateway.certifyIngress(payload);
    console.log('✅ Certification result:', result);

    // 4. Verificar si se creó el signal
    const signals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, provenance_driver_id, observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '1 minute'
      ORDER BY observed_at DESC
      LIMIT 5
    `);

    console.log('📊 Recent signals after certification:');
    console.table(signals);

  } catch (error) {
    console.error('❌ Manual certification failed:', error);
    throw error;
  }
}

testManualCertification().catch(console.error);
