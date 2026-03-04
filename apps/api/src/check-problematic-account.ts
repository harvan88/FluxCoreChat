import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkProblematicAccount() {
  try {
    console.log('🔍 VERIFICANDO ACCOUNT PROBLEMÁTICA...');
    
    // Account que está causando el error
    const problematicAccountId = '535949b8-58a9-4310-87a7-42a2480f5746';
    
    console.log(`📋 Buscando account: ${problematicAccountId}`);
    
    // Verificar si existe en la tabla accounts
    const account = await db
      .select({ 
        id: accounts.id, 
        username: accounts.username, 
        ownerUserId: accounts.ownerUserId,
        accountType: accounts.accountType
      })
      .from(accounts)
      .where(eq(accounts.id, problematicAccountId))
      .limit(1);
    
    if (account.length === 0) {
      console.log(`❌ Account ${problematicAccountId} NO EXISTE en la tabla accounts`);
      
      // Verificar si es un userId
      console.log(`📋 Verificando si es un userId...`);
      
      // Buscar todos los usuarios para ver si coincide
      const { users } = await import('@fluxcore/db');
      const user = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, problematicAccountId))
        .limit(1);
      
      if (user.length > 0) {
        console.log(`✅ ${problematicAccountId} es un userId: ${user[0].email}`);
        
        // Verificar si ese userId tiene accounts
        const userAccounts = await db
          .select({ id: accounts.id, username: accounts.username })
          .from(accounts)
          .where(eq(accounts.ownerUserId, problematicAccountId));
        
        console.log(`📊 Ese usuario tiene ${userAccounts.length} accounts:`);
        userAccounts.forEach((acc, i) => {
          console.log(`   ${i + 1}. ${acc.id} - ${acc.username}`);
        });
        
        if (userAccounts.length > 0) {
          console.log(`💡 SOLUCIÓN: Usar la primera account del usuario: ${userAccounts[0].id}`);
        }
      } else {
        console.log(`❌ ${problematicAccountId} no es ni account ni userId válido`);
      }
    } else {
      console.log(`✅ Account encontrada: ${account[0].username} (${account[0].accountType})`);
    }
    
    // Verificar qué está pasando en el backend
    console.log(`\n🔍 ANÁLISIS DEL PROBLEMA:`);
    console.log(`   • Frontend selecciona: 3e94f74e-e6a0-4794-bd66-16081ee3b02d (Harold)`);
    console.log(`   • Backend usa: 535949b8-58a9-4310-87a7-42a2480f5746`);
    console.log(`   • ¿De dónde viene 535949b8-58a9-4310-87a7-42a2480f5746?`);
    
  } catch (error) {
    console.error('❌ Error verificando account problemática:', error);
  } finally {
    process.exit(0);
  }
}

checkProblematicAccount().catch(console.error);
