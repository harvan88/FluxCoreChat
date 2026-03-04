import { db, sql } from '@fluxcore/db';

/**
 * Debug del problema del accountId - versión corregida
 */
async function debugAccountProblemFixed() {
  console.log('🔍 DEBUG DEL PROBLEMA DE ACCOUNT_ID');

  try {
    // 1. Verificar el accountId problemático
    const problematicAccountId = '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31';
    
    console.log(`\n🔍 Verificando accountId: ${problematicAccountId}`);
    
    const account = await db.execute(sql`
      SELECT id, username, account_type, created_at
      FROM accounts
      WHERE id = '${problematicAccountId}'
      LIMIT 1
    `);

    console.log('\n📊 RESULTADO:');
    if (account.length > 0) {
      console.log('✅ Account existe:');
      console.log('- ID:', account[0].id);
      console.log('- Username:', account[0].username);
      console.log('- Type:', account[0].account_type);
    } else {
      console.log('❌ Account NO existe');
    }

    // 2. Verificar el accountId correcto
    const correctAccountId = 'a9611c11-70f2-46cd-baef-6afcde715f3a';
    
    console.log(`\n🔍 Verificando accountId correcto: ${correctAccountId}`);
    
    const correctAccount = await db.execute(sql`
      SELECT id, username, account_type, created_at
      FROM accounts
      WHERE id = '${correctAccountId}'
      LIMIT 1
    `);

    console.log('\n📊 RESULTADO:');
    if (correctAccount.length > 0) {
      console.log('✅ Account existe:');
      console.log('- ID:', correctAccount[0].id);
      console.log('- Username:', correctAccount[0].username);
      console.log('- Type:', correctAccount[0].account_type);
    } else {
      console.log('❌ Account NO existe');
    }

    // 3. Mostrar todos los accounts
    const allAccounts = await db.execute(sql`
      SELECT id, username, account_type
      FROM accounts
      ORDER BY created_at
    `);

    console.log('\n📊 TODAS LAS CUENTAS:');
    console.table(allAccounts);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugAccountProblemFixed().catch(console.error);
