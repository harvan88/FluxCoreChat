import { db, sql } from '@fluxcore/db';

/**
 * Verificar señales de conversaciones en el Kernel
 */
async function checkConversationSignals() {
  console.log('🔍 VERIFICANDO SEÑALES DE CONVERSACIONES EN EL KERNEL');

  try {
    // 1. Buscar señales relacionadas con conversaciones
    const conversationSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        source_namespace,
        source_key,
        evidence_raw,
        certified_by_adapter,
        observed_at
      FROM fluxcore_signals 
      WHERE fact_type LIKE '%conversation%'
         OR evidence_raw::text LIKE '%conversation%'
         OR evidence_raw::text LIKE '%relationship%'
      ORDER BY sequence_number DESC
      LIMIT 10
    `);

    console.log('\n📊 SEÑALES RELACIONADAS CON CONVERSACIONES:');
    if (conversationSignals.length === 0) {
      console.log('❌ No hay señales de conversaciones');
    } else {
      console.table(conversationSignals);
      conversationSignals.forEach((signal, index) => {
        console.log(`\n🔹 Señal ${index + 1}:`);
        console.log(`- Type: ${signal.fact_type}`);
        console.log(`- Source: ${signal.source_namespace}:${signal.source_key}`);
        console.log(`- Adapter: ${signal.certified_by_adapter}`);
        console.log(`- Evidence:`, JSON.stringify(signal.evidence_raw, null, 2));
      });
    }

    // 2. Verificar todos los tipos de señales existentes
    const allSignalTypes = await db.execute(sql`
      SELECT 
        fact_type,
        COUNT(*) as count,
        MAX(observed_at) as last_observed
      FROM fluxcore_signals 
      GROUP BY fact_type
      ORDER BY count DESC
    `);

    console.log('\n📊 TODOS LOS TIPOS DE SEÑALES EXISTENTES:');
    console.table(allSignalTypes);

    // 3. Buscar señales de relaciones
    const relationshipSignals = await db.execute(sql`
      SELECT 
        sequence_number,
        fact_type,
        evidence_raw,
        observed_at
      FROM fluxcore_signals 
      WHERE fact_type LIKE '%relationship%'
         OR evidence_raw::text LIKE '%relationship%'
      ORDER BY sequence_number DESC
      LIMIT 5
    `);

    console.log('\n📊 SEÑALES DE RELACIONES:');
    if (relationshipSignals.length === 0) {
      console.log('❌ No hay señales de relaciones');
    } else {
      console.table(relationshipSignals);
    }

    // 4. Verificar conversaciones recientes y sus señales
    const recentConversations = await db.execute(sql`
      SELECT 
        id,
        relationship_id,
        channel,
        created_at
      FROM conversations 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📊 CONVERSACIONES RECIENTES:');
    console.table(recentConversations);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkConversationSignals().catch(console.error);
