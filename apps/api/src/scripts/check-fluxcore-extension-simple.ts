import { db, sql } from '@fluxcore/db';

/**
 * Verificar si la extensión @fluxcore/asistentes está instalada
 */
async function checkFluxCoreExtension() {
  console.log('🔍 VERIFICANDO EXTENSIÓN @fluxcore/asistentes');

  try {
    // 1. Verificar schema de extension_installations
    const schema = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'extension_installations'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 SCHEMA DE EXTENSION_INSTALLATIONS:');
    console.table(schema);

    // 2. Verificar si la extensión está instalada
    const installation = await db.execute(sql`
      SELECT * FROM extension_installations 
      WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
        AND extension_id = '@fluxcore/asistentes'
    `);

    console.log('\n📊 INSTALACIÓN DE @fluxcore/asistentes:');
    if (installation.length === 0) {
      console.log('❌ NO ESTÁ INSTALADA - ESTE ES EL PROBLEMA');
    } else {
      console.table(installation);
    }

    // 3. Verificar todas las instalaciones del usuario
    const allInstallations = await db.execute(sql`
      SELECT * FROM extension_installations 
      WHERE account_id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
    `);

    console.log('\n📊 TODAS LAS EXTENSIONES DEL USUARIO:');
    console.table(allInstallations);

    // 4. Verificar si existe la cuenta @fluxcore
    const fluxcoreAccount = await db.execute(sql`
      SELECT id, username, display_name FROM accounts 
      WHERE username = '@fluxcore'
    `);

    console.log('\n📊 CUENTA @fluxcore:');
    console.table(fluxcoreAccount);

    console.log('\n🎯 DIAGNÓSTICO:');
    if (installation.length === 0) {
      console.log('❌ PROBLEMA: @fluxcore/asistentes NO está instalada');
      console.log('🔧 SOLUCIÓN: Instalar la extensión para el usuario');
    } else {
      console.log('✅ @fluxcore/asistentes está instalada');
      console.log(`- Enabled: ${installation[0].enabled ? '✅ SÍ' : '❌ NO'}`);
    }

    if (fluxcoreAccount.length === 0) {
      console.log('❌ PROBLEMA: No existe cuenta @fluxcore');
      console.log('🔧 SOLUCIÓN: Crear cuenta @fluxcore');
    } else {
      console.log('✅ Cuenta @fluxcore existe');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkFluxCoreExtension().catch(console.error);
