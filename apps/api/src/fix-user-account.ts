import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function fixUserAccount() {
  try {
    console.log('🔧 CREANDO ACCOUNT PARA USUARIO SIN ACCOUNT...');
    
    // 1. Usuario que necesita account
    const userIdWithoutAccount = 'ace5d88a-1a80-4f43-805b-f31184e59595';
    
    console.log(`📋 Usuario sin account: ${userIdWithoutAccount}`);
    
    // 2. Verificar si ya tiene account
    const existingAccounts = await db
      .select({ id: accounts.id, username: accounts.username })
      .from(accounts)
      .where(eq(accounts.ownerUserId, userIdWithoutAccount));
    
    if (existingAccounts.length > 0) {
      console.log(`✅ El usuario ya tiene ${existingAccounts.length} accounts:`);
      existingAccounts.forEach((acc, i) => {
        console.log(`${i + 1}. ID: ${acc.id} - Username: ${acc.username}`);
      });
      return;
    }
    
    // 3. Crear account para el usuario
    const newAccountId = randomUUID(); // Generar UUID
    const username = `user_${userIdWithoutAccount.substring(0, 8)}_${Date.now()}`;
    
    console.log(`🔧 Creando account:`);
    console.log(`   ID: ${newAccountId}`);
    console.log(`   Username: ${username}`);
    console.log(`   Owner: ${userIdWithoutAccount}`);
    
    const newAccount = await db
      .insert(accounts)
      .values({
        ownerUserId: userIdWithoutAccount,
        username: username,
        displayName: 'User Account',
        accountType: 'personal',
        profile: {},
        avatarAssetId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({ id: accounts.id, username: accounts.username });
    
    console.log(`✅ Account creada exitosamente:`);
    console.log(`   ID: ${newAccount[0].id}`);
    console.log(`   Username: ${newAccount[0].username}`);
    
    // 4. Verificar la creación
    const verifyAccount = await db
      .select({ id: accounts.id, username: accounts.username, ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(eq(accounts.id, newAccount[0].id))
      .limit(1);
    
    if (verifyAccount.length > 0) {
      console.log(`✅ Verificación exitosa:`);
      console.log(`   ID: ${verifyAccount[0].id}`);
      console.log(`   Username: ${verifyAccount[0].username}`);
      console.log(`   Owner: ${verifyAccount[0].ownerUserId}`);
    } else {
      console.log(`❌ Error en la verificación`);
    }
    
  } catch (error) {
    console.error('❌ Error creando account para usuario:', error);
  } finally {
    process.exit(0);
  }
}

fixUserAccount().catch(console.error);
