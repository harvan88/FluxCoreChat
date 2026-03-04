import { db, sql } from '@fluxcore/db';

/**
 * Verificar cuentas existentes
 */
async function checkAccounts() {
  console.log('🔍 VERIFICANDO CUENTAS EXISTENTES');

  try {
    // 1. Verificar todas las cuentas
    const accounts = await db.execute(sql`
      SELECT id, email, type, created_at
      FROM accounts
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 CUENTAS EXISTENTES:');
    console.table(accounts);

    // 2. Verificar la cuenta que estamos usando
    const targetAccount = await db.execute(sql`
      SELECT id, email, type
      FROM accounts
      WHERE id = $1
      LIMIT 1
    `, ['c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe']);

    console.log('\n📊 CUENTA USADA:');
    console.table(targetAccount);

    // 3. Verificar la cuenta del sistema
    const systemAccount = await db.execute(sql`
      SELECT id, email, type
      FROM accounts
      WHERE id = $1
      LIMIT 1
    `, ['a9611c11-70f2-46cd-baef-6afcde715f3a']);

    console.log('\n📊 CUENTA SISTEMA:');
    console.table(systemAccount);

    // 4. Si no existe la cuenta, usar una existente
    if (targetAccount.length === 0) {
      console.log('\n❌ La cuenta c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe NO existe');
      
      if (accounts.length > 0) {
        console.log(`✅ Usando cuenta existente: ${accounts[0].id}`);
        return accounts[0].id;
      }
    } else {
      console.log('\n✅ La cuenta existe');
      return 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe';
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAccounts().catch(console.error);
