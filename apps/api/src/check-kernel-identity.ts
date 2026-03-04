import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkKernelIdentity() {
  try {
    console.log('🔍 VERIFICANDO PROBLEMA DE IDENTIDAD DEL KERNEL...');
    
    // 1. Verificar si el account_id problemático existe
    const problematicAccountId = '535949b8-58a9-4310-87a7-42a2480f5746';
    
    console.log(`📋 Buscando account_id: ${problematicAccountId}`);
    
    const account = await db
      .select({ id: accounts.id, username: accounts.username, ownerUserId: accounts.ownerUserId })
      .from(accounts)
      .where(eq(accounts.id, problematicAccountId))
      .limit(1);
    
    if (account.length === 0) {
      console.log(`❌ Account ID ${problematicAccountId} NO EXISTE en la tabla accounts`);
      
      // 2. Verificar qué accounts sí existen
      const existingAccounts = await db
        .select({ id: accounts.id, username: accounts.username, ownerUserId: accounts.ownerUserId })
        .from(accounts)
        .limit(10);
      
      console.log(`\n📊 Accounts existentes (${existingAccounts.length}):`);
      existingAccounts.forEach((acc, i) => {
        console.log(`${i + 1}. ID: ${acc.id}`);
        console.log(`   Username: ${acc.username}`);
        console.log(`   Owner: ${acc.ownerUserId}`);
        console.log('');
      });
      
      // 3. Verificar los accounts de los usuarios involucrados
      const userId1 = 'ace5d88a-1a80-4f43-805b-f31184e59595';
      const userId2 = 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe';
      
      console.log(`🔍 Verificando accounts del usuario ${userId1}:`);
      const user1Accounts = await db
        .select({ id: accounts.id, username: accounts.username })
        .from(accounts)
        .where(eq(accounts.ownerUserId, userId1));
      
      console.log(`📊 Accounts de ${userId1}:`);
      user1Accounts.forEach((acc, i) => {
        console.log(`${i + 1}. ID: ${acc.id} - Username: ${acc.username}`);
      });
      
      console.log(`\n🔍 Verificando accounts del usuario ${userId2}:`);
      const user2Accounts = await db
        .select({ id: accounts.id, username: accounts.username })
        .from(accounts)
        .where(eq(accounts.ownerUserId, userId2));
      
      console.log(`📊 Accounts de ${userId2}:`);
      user2Accounts.forEach((acc, i) => {
        console.log(`${i + 1}. ID: ${acc.id} - Username: ${acc.username}`);
      });
      
      // 4. Verificar la conversación y sus participantes
      const conversationId = '51b841be-1830-4d17-a354-af7f03bee332';
      
      console.log(`\n🔍 Verificando conversación ${conversationId}:`);
      
      // Obtener la relación de la conversación
      const { relationships } = await import('@fluxcore/db');
      const { conversations } = await import('@fluxcore/db');
      
      const conversation = await db
        .select({ relationshipId: conversations.relationshipId })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (conversation.length > 0) {
        console.log(`📋 Conversación encontrada: relationshipId = ${conversation[0].relationshipId}`);
        
        const relationship = await db
          .select({ accountAId: relationships.account_a_id, accountBId: relationships.account_b_id })
          .from(relationships)
          .where(eq(relationships.id, conversation[0].relationshipId))
          .limit(1);
        
        if (relationship.length > 0) {
          console.log(`📋 Relación encontrada:`);
          console.log(`   Account A: ${relationship[0].accountAId}`);
          console.log(`   Account B: ${relationship[0].accountBId}`);
          
          // Verificar si estos accounts existen
          const accountA = await db
            .select({ id: accounts.id, username: accounts.username })
            .from(accounts)
            .where(eq(accounts.id, relationship[0].accountAId))
            .limit(1);
          
          const accountB = await db
            .select({ id: accounts.id, username: accounts.username })
            .from(accounts)
            .where(eq(accounts.id, relationship[0].accountBId))
            .limit(1);
          
          console.log(`\n📋 Account A existe: ${accountA.length > 0 ? '✅' : '❌'} ${accountA.length > 0 ? `(${accountA[0].username})` : ''}`);
          console.log(`📋 Account B existe: ${accountB.length > 0 ? '✅' : '❌'} ${accountB.length > 0 ? `(${accountB[0].username})` : ''}`);
        }
      }
      
    } else {
      console.log(`✅ Account ID ${problematicAccountId} SÍ EXISTE`);
      console.log(`   Username: ${account[0].username}`);
      console.log(`   Owner: ${account[0].ownerUserId}`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando identidad del kernel:', error);
  } finally {
    process.exit(0);
  }
}

checkKernelIdentity().catch(console.error);
