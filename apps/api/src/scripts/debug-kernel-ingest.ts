import { db, sql } from '@fluxcore/db';

/**
 * Debug del kernel.ingestSignal
 */
async function debugKernelIngest() {
  console.log('🔍 DEBUG DE KERNEL.INGESTSIGNAL');

  try {
    // 1. Importar kernel
    const { kernel } = await import('../core/kernel');
    console.log('✅ Kernel importado');

    // 2. Crear candidato de prueba manualmente
    const testCandidate = {
      factType: 'chatcore.message.received',
      source: {
        namespace: '@fluxcore/internal',
        key: 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      },
      subject: {
        namespace: '@fluxcore/internal',
        key: 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      },
      evidence: {
        raw: {
          accountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
          content: { text: 'Mensaje de prueba manual' },
          context: {
            conversationId: '51b841be-1830-4d17-a354-af7f03bee332',
            userId: 'a9611c11-70f2-46cd-baef-6afcde715f3a'
          },
          metadata: {
            ip: '127.0.0.1',
            userAgent: 'Debug Script',
            clientTimestamp: new Date().toISOString(),
            requestId: 'debug-manual-test'
          },
          meta: {
            humanSenderId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
            messageId: 'manual-test-message-id'
          },
          security: {
            authMethod: 'bearer_token',
            scope: 'user'
          }
        },
        format: 'json',
        provenance: {
          driverId: 'chatcore/internal',
          externalId: 'debug-manual-test',
          entryPoint: 'api/messages'
        },
        claimedOccurredAt: new Date()
      },
      certifiedBy: {
        adapterId: 'chatcore-gateway',
        adapterVersion: '1.0.0',
        signature: 'test-signature'
      }
    };

    console.log('\n📤 ENVIANDO CANDIDATO MANUAL A KERNEL:');
    console.log('- factType:', testCandidate.factType);
    console.log('- source:', testCandidate.source);
    console.log('- accountId:', testCandidate.evidence.raw.accountId);

    // 3. Llamar a kernel.ingestSignal directamente
    const sequence = await kernel.ingestSignal(testCandidate);

    console.log('\n✅ SEÑAL CREADA:');
    console.log('- Sequence:', sequence);

    // 4. Verificar si la señal existe
    const signal = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at
      FROM fluxcore_signals
      WHERE sequence_number = $1
      LIMIT 1
    `, [sequence]);

    if (signal.length > 0) {
      console.log('\n🎉 SEÑAL ENCONTRADA EN BD:');
      console.table(signal);
    } else {
      console.log('\n❌ SEÑAL NO ENCONTRADA EN BD');
    }

    // 5. Verificar contador total
    const totalSignals = await db.execute(sql`
      SELECT COUNT(*) as total FROM fluxcore_signals
    `);

    console.log(`\n📊 Total de señales: ${totalSignals[0].total}`);

  } catch (error) {
    console.error('❌ Error en kernel.ingestSignal:', error);
    throw error;
  }
}

debugKernelIngest().catch(console.error);
