import { db, sql } from '@fluxcore/db';

/**
 * Script para corregir la constraint de fact_type en fluxcore_signals
 * Ejecutar con: bun run scripts/fix-fact-type-constraint.ts
 */
async function fixFactTypeConstraint() {
  console.log('🔧 Fixing fluxcore_signals fact_type constraint...\n');

  try {
    // 1. Eliminar la constraint existente
    console.log('🗑️ Dropping existing fact_type check constraint...');
    await db.execute(sql`
      ALTER TABLE fluxcore_signals 
      DROP CONSTRAINT IF EXISTS fluxcore_signals_fact_type_check
    `);

    // 2. Crear nueva constraint con todos los factTypes válidos
    console.log('🏗️ Creating new fact_type check constraint...');
    await db.execute(sql`
      ALTER TABLE fluxcore_signals 
      ADD CONSTRAINT fluxcore_signals_fact_type_check 
      CHECK (fact_type IN (
        'EXTERNAL_INPUT_OBSERVED',
        'EXTERNAL_STATE_OBSERVED', 
        'DELIVERY_SIGNAL_OBSERVED',
        'MEDIA_CAPTURED',
        'SYSTEM_TIMER_ELAPSED',
        'CONNECTION_EVENT_OBSERVED',
        'chatcore.message.received'
      ))
    `);

    console.log('✅ Fact type constraint fixed successfully!');

    // 3. Verificar la constraint
    console.log('\n🔍 Verifying constraint...');
    const constraints = await db.execute(sql`
      SELECT 
        constraint_name,
        check_clause
      FROM information_schema.check_constraints 
      WHERE table_name = 'fluxcore_signals'
        AND constraint_name = 'fluxcore_signals_fact_type_check'
    `);

    console.table(constraints);

    // 4. Probar insertando un signal con el nuevo factType
    console.log('\n🧪 Testing new factType...');
    const testResult = await db.execute(sql`
      INSERT INTO fluxcore_signals (
        signal_fingerprint,
        fact_type,
        source_namespace,
        source_key,
        subject_namespace,
        subject_key,
        evidence_raw,
        evidence_format,
        evidence_checksum,
        provenance_driver_id,
        provenance_external_id,
        provenance_entry_point,
        certified_by_adapter,
        certified_adapter_version,
        observed_at
      ) VALUES (
        'test-fingerprint-chatcore',
        'chatcore.message.received',
        '@fluxcore/internal',
        'test-account',
        '@fluxcore/internal',
        'test-account',
        '{"test": true}',
        'json',
        'test-checksum',
        'chatcore/internal',
        'test-external-id',
        'test-entry-point',
        'chatcore-gateway',
        '1.0.0',
        NOW()
      )
      RETURNING sequence_number
    `);

    console.log('✅ Test insert successful:', testResult);

    // 5. Limpiar el test
    await db.execute(sql`
      DELETE FROM fluxcore_signals 
      WHERE signal_fingerprint = 'test-fingerprint-chatcore'
    `);

    console.log('🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Error fixing constraint:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixFactTypeConstraint()
    .then(() => {
      console.log('\n🎉 Fact type constraint fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

export { fixFactTypeConstraint };
