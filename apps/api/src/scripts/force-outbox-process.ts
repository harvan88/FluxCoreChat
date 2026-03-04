import { db, sql } from '@fluxcore/db';
import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';

/**
 * Script para forzar el procesamiento del outbox y diagnosticar problemas
 */
async function forceOutboxProcess() {
  console.log('🔧 Forcing outbox processing...');

  try {
    // 1. Verificar entradas pendientes
    const pending = await db.execute(sql`
      SELECT id, message_id, status, created_at, attempts, last_error
      FROM chatcore_outbox
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    `);

    console.log('📊 Pending outbox entries:');
    console.table(pending);

    if (pending.length === 0) {
      console.log('✅ No pending entries found');
      return;
    }

    // 2. Procesar manualmente la primera entrada
    const firstEntry = pending[0];
    console.log(`\n🔧 Processing entry ${firstEntry.id} manually...`);

    try {
      const payload = JSON.parse(firstEntry.payload);
      console.log('📦 Payload:', payload);

      // Intentar certificar
      const result = await chatCoreGateway.certifyIngress(payload);
      console.log('✅ Certification result:', result);

      // Actualizar estado
      await db.execute(sql`
        UPDATE chatcore_outbox 
        SET status = 'sent', sent_at = NOW() 
        WHERE id = ${firstEntry.id}
      `);

      console.log('✅ Entry marked as sent');

    } catch (error) {
      console.error('❌ Certification failed:', error);
      
      // Actualizar con error
      await db.execute(sql`
        UPDATE chatcore_outbox 
        SET status = 'pending', attempts = attempts + 1, last_error = ${error instanceof Error ? error.message : String(error)}
        WHERE id = ${firstEntry.id}
      `);
    }

    // 3. Verificar estado final
    const finalStatus = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM chatcore_outbox
      GROUP BY status
      ORDER BY status
    `);

    console.log('\n📊 Final outbox status:');
    console.table(finalStatus);

    // 4. Verificar signals recientes
    const recentSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, certified_by_adapter, provenance_driver_id, observed_at
      FROM fluxcore_signals
      WHERE observed_at >= NOW() - INTERVAL '10 minutes'
      ORDER BY observed_at DESC
      LIMIT 5
    `);

    console.log('\n📊 Recent signals:');
    console.table(recentSignals);

  } catch (error) {
    console.error('❌ Error forcing outbox process:', error);
    throw error;
  }
}

forceOutboxProcess().catch(console.error);
