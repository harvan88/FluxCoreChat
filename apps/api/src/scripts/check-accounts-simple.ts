import { db, sql } from '@fluxcore/db';

/**
 * Verificar cuentas existentes - versión simple
 */
async function checkAccountsSimple() {
  console.log('🔍 VERIFICANDO CUENTAS EXISTENTES');

  try {
    // 1. Verificar esquema de accounts
    const schema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'accounts'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 ESQUEMA DE ACCOUNTS:');
    console.table(schema);

    // 2. Verificar todas las cuentas
    const accounts = await db.execute(sql`
      SELECT * FROM accounts
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 CUENTAS EXISTENTES:');
    console.table(accounts);

    // 3. Verificar la cuenta que estamos usando
    const targetAccount = await db.execute(sql`
      SELECT * FROM accounts
      WHERE id = 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe'
      LIMIT 1
    `);

    console.log('\n📊 CUENTA USADA:');
    console.table(targetAccount);

    // 4. Verificar la cuenta del sistema
    const systemAccount = await db.execute(sql`
      SELECT * FROM accounts
      WHERE id = 'a9611c11-70f2-46cd-baef-6afcde715f3a'
      LIMIT 1
    `);

    console.log('\n📊 CUENTA SISTEMA:');
    console.table(systemAccount);

    // 5. Encontrar una cuenta válida para usar
    let validAccountId = 'a9611c11-70f2-46cd-baef-6afcde715f3a'; // Sistema por defecto
    
    if (accounts.length > 0) {
      validAccountId = accounts[0].id;
      console.log(`\n✅ Usando cuenta: ${validAccountId}`);
    }

    return validAccountId;

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAccountsSimple().catch(console.error);
