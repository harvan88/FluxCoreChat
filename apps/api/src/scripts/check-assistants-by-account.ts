import { db, sql } from '@fluxcore/db';

async function checkAssistantsByAccount() {
  try {
    const data = await db.execute(sql`
      SELECT account_id, count(*) as total 
      FROM fluxcore_assistants 
      GROUP BY account_id
    `);
    
    console.log('📊 Asistentes por Cuenta:');
    for (const row of data) {
      console.log(`- Account: ${row.account_id}, Total: ${row.total}`);
    }
    
    const allAccounts = await db.execute(sql`SELECT id, username FROM accounts LIMIT 10`);
    console.log('\n👥 Cuentas registradas:');
    for (const acc of allAccounts) {
      console.log(`- ${acc.id} (${acc.username})`);
    }
    
  } catch (error) {
    console.error('❌ Error checking assistants:', error);
  } finally {
    process.exit(0);
  }
}

checkAssistantsByAccount();
