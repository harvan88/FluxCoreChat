import { db, sql } from '@fluxcore/db';

/**
 * Verificar si la extensión @fluxcore/asistentes está instalada
 */
async function checkFluxCoreExtension() {
  console.log('🔍 VERIFICANDO EXTENSIÓN @fluxcore/asistentes');

  try {
    // 1. Verificar si la extensión está instalada para el usuario
    const installation = await db.execute(sql`
      SELECT 
        account_id,
        extension_id,
        enabled,
        updated_at,
        settings
      FROM extension_installations 
      WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND extension_id = '@fluxcore/asistentes'
    `);

    console.log('\n📊 INSTALACIÓN DE @fluxcore/asistentes:');
    if (installation.length === 0) {
      console.log('❌ NO ESTÁ INSTALADA - ESTE ES EL PROBLEMA');
    } else {
      console.table(installation);
      installation.forEach(inst => {
        console.log(`- Account: ${inst.account_id}`);
        console.log(`- Extension: ${inst.extension_id}`);
        console.log(`- Enabled: ${inst.enabled ? '✅ SÍ' : '❌ NO'}`);
        console.log(`- Updated: ${inst.updated_at}`);
      });
    }

    // 2. Verificar todas las instalaciones del usuario
    const allInstallations = await db.execute(sql`
      SELECT 
        extension_id,
        enabled,
        updated_at
      FROM extension_installations 
      WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      ORDER BY updated_at DESC
    `);

    console.log('\n📊 TODAS LAS EXTENSIONES DEL USUARIO:');
    console.table(allInstallations);

    // 3. Verificar si existe la cuenta @fluxcore
    const fluxcoreAccount = await db.execute(sql`
      SELECT id, username, display_name
      FROM accounts 
      WHERE username = '@fluxcore'
    `);

    console.log('\n📊 CUENTA @fluxcore:');
    if (fluxcoreAccount.length === 0) {
      console.log('❌ NO EXISTE LA CUENTA @fluxcore');
    } else {
      console.table(fluxcoreAccount);
    }

    // 4. Verificar relaciones con @fluxcore
    const fluxcoreRelationships = await db.execute(sql`
      SELECT 
        r.id,
        r.account_a_id,
        r.account_b_id,
        r.updated_at,
        CASE WHEN r.account_a_id = r.account_b_id THEN 'SELF_REFERENCE' ELSE 'VALID' END as type
      FROM relationships r
      JOIN accounts a ON a.username = '@fluxcore'
      WHERE (r.account_a_id = a.id OR r.account_b_id = a.id)
        AND (r.account_a_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a' 
             OR r.account_b_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a')
    `);

    console.log('\n📊 RELACIONES CON @fluxcore:');
    console.table(fluxcoreRelationships);

    console.log('\n🎯 DIAGNÓSTICO:');
    if (installation.length === 0) {
      console.log('❌ PROBLEMA: @fluxcore/asistentes NO está instalada');
      console.log('🔧 SOLUCIÓN: Instalar la extensión para el usuario');
    } else if (!installation[0].enabled) {
      console.log('❌ PROBLEMA: @fluxcore/asistentes está deshabilitada');
      console.log('🔧 SOLUCIÓN: Habilitar la extensión');
    } else {
      console.log('✅ @fluxcore/asistentes está instalada y habilitada');
    }

    if (fluxcoreAccount.length === 0) {
      console.log('❌ PROBLEMA: No existe cuenta @fluxcore');
      console.log('🔧 SOLUCIÓN: Crear cuenta @fluxcore');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkFluxCoreExtension().catch(console.error);
