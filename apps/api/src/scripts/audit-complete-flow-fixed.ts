import { db, sql } from '@fluxcore/db';

/**
 * Auditoría completa del flujo de señales - FIXED VERSION
 */
async function auditCompleteFlow() {
  console.log('🔍 AUDITORÍA COMPLETA DEL FLUJO DE SEÑALES');

  try {
    // 1. Verificar últimas señales creadas
    console.log('\n📊 ÚLTIMAS SEÑALES CREADAS:');
    const recentSignals = await db.execute(sql`
      SELECT sequence_number, fact_type, observed_at, evidence_raw
      FROM fluxcore_signals
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.table(recentSignals);

    // 2. Analizar cada señal
    for (const signal of recentSignals) {
      console.log(`\n🔍 ANALIZANDO SEÑAL #${signal.sequence_number}:`);
      
      try {
        const evidence = JSON.parse(signal.evidence_raw);
        
        console.log('- accountId:', evidence.accountId);
        console.log('- subjectKey (en evidence):', evidence.meta?.humanSenderId);
        console.log('- context.userId:', evidence.context?.userId);
        console.log('- meta.messageId:', evidence.meta?.messageId);
        
        // 3. Verificar si el accountId existe - FIXED: sin comillas
        if (evidence.accountId) {
          const account = await db.execute(sql`
            SELECT id, username, account_type
            FROM accounts
            WHERE id = ${evidence.accountId}
            LIMIT 1
          `);
          
          console.log('- ¿Account existe?', account.length > 0 ? '✅ SÍ' : '❌ NO');
          if (account.length > 0) {
            console.log('- Account:', account[0].username);
          }
        }
        
        // 4. Verificar si el subjectKey existe - FIXED: sin comillas
        const subjectKey = evidence.meta?.humanSenderId || evidence.context?.userId;
        if (subjectKey) {
          const subjectAccount = await db.execute(sql`
            SELECT id, username, account_type
            FROM accounts
            WHERE id = ${subjectKey}
            LIMIT 1
          `);
          
          console.log('- ¿SubjectKey existe?', subjectAccount.length > 0 ? '✅ SÍ' : '❌ NO');
          if (subjectAccount.length > 0) {
            console.log('- SubjectKey:', subjectAccount[0].username);
          }
        }
        
      } catch (error) {
        console.log('❌ Error parsing evidence:', error);
      }
    }

    // 5. Verificar errores de projectors
    console.log('\n🚨 ERRORES DE PROJECTORS:');
    const projectorErrors = await db.execute(sql`
      SELECT projector_name, error_message, created_at
      FROM fluxcore_projector_errors
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (projectorErrors.length > 0) {
      console.table(projectorErrors);
    } else {
      console.log('✅ No hay errores de projectors');
    }

    // 6. Verificar estado de cursors
    console.log('\n📊 ESTADO DE CURSORS:');
    const cursors = await db.execute(sql`
      SELECT projector_name, last_sequence_number, error_count
      FROM fluxcore_projector_cursors
      ORDER BY projector_name
    `);

    console.table(cursors);

    // 7. Verificar cuentas problemáticas - FIXED: sin comillas
    console.log('\n🔍 CUENTAS PROBLEMÁTICAS:');
    const problematicAccounts = ['535949b8-58a9-4310-87a7-42a2480f5746'];
    
    for (const accountId of problematicAccounts) {
      const account = await db.execute(sql`
        SELECT id, username, account_type
        FROM accounts
        WHERE id = ${accountId}
        LIMIT 1
      `);
      
      console.log(`- Account ${accountId}:`, account.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE');
    }

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  }
}

auditCompleteFlow().catch(console.error);
