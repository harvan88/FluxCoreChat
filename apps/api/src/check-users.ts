import { db, users } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkUsers() {
  try {
    console.log('🔍 VERIFICANDO USUARIOS EXISTENTES...');
    
    // 1. Verificar si el usuario del frontend existe
    const frontendUserId = 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe';
    const backendUserId = 'ace5d88a-1a80-4f43-805b-f31184e59595';
    
    console.log(`📋 Verificando usuario del frontend: ${frontendUserId}`);
    const frontendUser = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, frontendUserId))
      .limit(1);
    
    console.log(`📋 Verificando usuario del backend: ${backendUserId}`);
    const backendUser = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, backendUserId))
      .limit(1);
    
    console.log(`\n📊 RESULTADOS:`);
    console.log(`✅ Usuario frontend (${frontendUserId}): ${frontendUser.length > 0 ? 'EXISTS' : 'NO EXISTE'} ${frontendUser.length > 0 ? `(${frontendUser[0].email})` : ''}`);
    console.log(`❌ Usuario backend (${backendUserId}): ${backendUser.length > 0 ? 'EXISTS' : 'NO EXISTE'} ${backendUser.length > 0 ? `(${backendUser[0].email})` : ''}`);
    
    // 2. Listar todos los usuarios existentes
    const allUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .limit(10);
    
    console.log(`\n📊 TODOS LOS USUARIOS EXISTENTES:`);
    allUsers.forEach((user, i) => {
      console.log(`${i + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log('');
    });
    
    // 3. Verificar accounts por usuario
    const { accounts } = await import('@fluxcore/db');
    
    console.log(`\n📊 VERIFICANDO ACCOUNTS POR USUARIO:`);
    
    for (const user of allUsers) {
      const userAccounts = await db
        .select({ id: accounts.id, username: accounts.username })
        .from(accounts)
        .where(eq(accounts.ownerUserId, user.id));
      
      console.log(`📋 Usuario ${user.id} (${user.email}):`);
      console.log(`   Accounts: ${userAccounts.length}`);
      userAccounts.forEach((acc, i) => {
        console.log(`     ${i + 1}. ${acc.id} - ${acc.username}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers().catch(console.error);
