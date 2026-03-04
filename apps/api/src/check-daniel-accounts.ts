import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkDanielAccounts() {
  try {
    console.log('🔍 VERIFICANDO ACCOUNTS DE DANIEL...');
    
    // Daniel Test user ID
    const danielUserId = 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe';
    
    // Obtener todas las accounts de Daniel
    const danielAccounts = await db
      .select({ 
        id: accounts.id, 
        username: accounts.username, 
        accountType: accounts.accountType,
        displayName: accounts.displayName,
        ownerUserId: accounts.ownerUserId 
      })
      .from(accounts)
      .where(eq(accounts.ownerUserId, danielUserId))
      .orderBy(accounts.createdAt);
    
    console.log(`📊 Daniel tiene ${danielAccounts.length} accounts:`);
    
    danielAccounts.forEach((account, i) => {
      console.log(`${i + 1}. ID: ${account.id}`);
      console.log(`   Username: ${account.username}`);
      console.log(`   Display: ${account.displayName}`);
      console.log(`   Type: ${account.accountType}`);
      console.log(`   Owner: ${account.ownerUserId}`);
      console.log(`   ¿Es personal?: ${account.accountType === 'personal' ? '✅ SÍ' : '❌ NO'}`);
      console.log('');
    });
    
    // Verificar cuál es la "personal"
    const personalAccount = danielAccounts.find(a => a.accountType === 'personal');
    const danielTestAccount = danielAccounts.find(a => a.username.includes('daniel'));
    const patriciaAccount = danielAccounts.find(a => a.username.includes('patricia'));
    const gianfrancoAccount = danielAccounts.find(a => a.username.includes('gianfranco'));
    
    console.log(`🎯 ANÁLISIS DE SELECCIÓN:`);
    console.log(`   • Account personal: ${personalAccount ? `${personalAccount.username} (${personalAccount.id})` : '❌ NO TIENE'}`);
    console.log(`   • Account Daniel: ${danielTestAccount ? `${danielTestAccount.username} (${danielTestAccount.id})` : '❌ NO TIENE'}`);
    console.log(`   • Account Patricia: ${patriciaAccount ? `${patriciaAccount.username} (${patriciaAccount.id})` : '❌ NO TIENE'}`);
    console.log(`   • Account Gianfranco: ${gianfrancoAccount ? `${gianfrancoAccount.username} (${gianfrancoAccount.id})` : '❌ NO TIENE'}`);
    
    // Simular la lógica de authStore
    const resolvedAccountId = 
      (personalAccount?.id) ||
      danielAccounts[0]?.id;
    
    console.log(`\n🔥 SIMULACIÓN DE LÓGICA authStore:`);
    console.log(`   • personalAccount?.id: ${personalAccount?.id || 'null'}`);
    console.log(`   • accounts[0]?.id: ${danielAccounts[0]?.id || 'null'}`);
    console.log(`   • resolvedAccountId: ${resolvedAccountId}`);
    
    if (personalAccount) {
      console.log(`\n❌ ¡PROBLEMA! authStore seleccionará ${personalAccount.username} en lugar de la account que Daniel eligió`);
      console.log(`   • Si Daniel eligió "daniel_mkonr9z2", authStore usará "${personalAccount.username}"`);
      console.log(`   • Esto causa que los mensajes se envíen con la account equivocada`);
    } else {
      console.log(`\n✅ No hay account personal, usará la primera: ${danielAccounts[0]?.username}`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando accounts de Daniel:', error);
  } finally {
    process.exit(0);
  }
}

checkDanielAccounts().catch(console.error);
