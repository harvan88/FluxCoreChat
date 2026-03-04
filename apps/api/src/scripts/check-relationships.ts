import { db, sql } from '@fluxcore/db';

/**
 * Verificar relaciones del usuario
 */
async function checkRelationships() {
  console.log('🔍 VERIFICANDO RELACIONES DEL USUARIO');

  try {
    const relationships = await db.execute(sql`
      SELECT 
        id,
        account_a_id,
        account_b_id,
        created_at,
        CASE WHEN account_a_id = account_b_id THEN 'SELF_REFERENCE' ELSE 'VALID' END as relationship_type
      FROM relationships 
      WHERE account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
         OR account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 RELACIONES DEL USUARIO:');
    console.table(relationships);

    // Contar tipos
    const selfRef = relationships.filter(r => r.relationship_type === 'SELF_REFERENCE');
    const valid = relationships.filter(r => r.relationship_type === 'VALID');

    console.log('\n📈 ANÁLISIS:');
    console.log(`- Relaciones válidas: ${valid.length}`);
    console.log(`- Relaciones autoreferenciales: ${selfRef.length}`);
    
    if (selfRef.length > 0) {
      console.log('\n❌ RELACIONES AUTOREFERENCIALES (causan problemas):');
      selfRef.forEach(rel => {
        console.log(`- ID: ${rel.id} (${rel.account_a_id} = ${rel.account_b_id})`);
      });
    }

    if (valid.length > 0) {
      console.log('\n✅ RELACIONES VÁLIDAS (deberían funcionar):');
      valid.forEach(rel => {
        console.log(`- ID: ${rel.id} (${rel.account_a_id} ↔ ${rel.account_b_id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkRelationships().catch(console.error);
