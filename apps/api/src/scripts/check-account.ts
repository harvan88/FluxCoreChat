import { db, sql } from '@fluxcore/db';

async function checkAccount() {
  try {
    const result = await db.execute(sql`
      SELECT id, username, account_type 
      FROM accounts 
      WHERE id = '535949b8-58a9-4310-87a7-42a2480f5746'
    `);
    
    console.log('🔍 Cuenta 535949b8-58a9-4310-87a7-42a2480f5746:');
    console.table(result);
    
    if (result.length === 0) {
      console.log('❌ La cuenta NO existe en la base de datos');
      
      // Verificar qué cuentas sí existen
      const allAccounts = await db.execute(sql`
        SELECT id, username, account_type 
        FROM accounts 
        LIMIT 10
      `);
      
      console.log('\n📊 Cuentas existentes (primeras 10):');
      console.table(allAccounts);
    }
    
  } catch (error) {
    console.error('❌ Error checking account:', error);
  }
}

checkAccount().catch(console.error);
