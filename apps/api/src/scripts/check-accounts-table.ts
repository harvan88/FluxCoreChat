import { db, sql } from '@fluxcore/db';

/**
 * Verificar tabla accounts sin inferencias
 */
async function checkAccountsTable() {
  console.log('🔍 VERIFICANDO TABLA ACCOUNTS - SIN INFERENCIAS');

  try {
    // 1. Verificar schema de accounts
    const schema = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'accounts'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 SCHEMA DE ACCOUNTS:');
    console.table(schema);

    // 2. Buscar cualquier cuenta que parezca FluxCore
    const fluxcoreAccounts = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE username ILIKE '%fluxcore%' 
         OR display_name ILIKE '%fluxcore%'
         OR account_type = 'system'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 CUENTAS CON NOMBRE SIMILAR A FLUXCORE:');
    console.table(fluxcoreAccounts);

    // 3. Buscar cuentas de tipo system
    const systemAccounts = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE account_type = 'system'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 CUENTAS DE TIPO SYSTEM:');
    console.table(systemAccounts);

    // 4. Buscar todas las cuentas para ver si existe @fluxcore
    const allAccounts = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE username = '@fluxcore'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 CUENTA EXACTA @fluxcore:');
    console.table(allAccounts);

    // 5. Buscar cuentas con @ al principio
    const atAccounts = await db.execute(sql`
      SELECT id, username, display_name, account_type, created_at
      FROM accounts 
      WHERE username LIKE '@%'
      ORDER BY created_at DESC
    `);

    console.log('\n📊 TODAS LAS CUENTAS QUE EMPIEZAN CON @:');
    console.table(atAccounts);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAccountsTable().catch(console.error);
