/**
 * Repair Script: Fix users without accounts
 * 
 * This script finds users that have no associated accounts and creates:
 * 1. A personal account
 * 2. An actor (owner relationship)
 * 3. A relationship with Fluxi
 * 4. A welcome conversation with Fluxi
 */

import { db } from './connection';
import { users, accounts, actors, relationships, conversations, messages } from './schema';
import { eq } from 'drizzle-orm';

const FLUXI_USERNAME = 'fluxi';

async function repairUsers() {
  console.log('🔧 Buscando usuarios sin cuenta...\n');

  // Find all users
  const allUsers = await db.select().from(users);
  
  // Find users with accounts
  const usersWithAccounts = await db.select({ ownerId: accounts.ownerUserId }).from(accounts);
  const userIdsWithAccounts = new Set(usersWithAccounts.map(a => a.ownerId));
  
  // Filter users without accounts (excluding system users)
  const rows = allUsers.filter(u => 
    !userIdsWithAccounts.has(u.id) && 
    !u.email.includes('@fluxcore.system')
  );

  if (rows.length === 0) {
    console.log('✅ Todos los usuarios tienen cuenta.');
    return;
  }

  console.log(`⚠️ Encontrados ${rows.length} usuarios sin cuenta:\n`);

  // Get Fluxi account
  const [fluxiAccount] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.username, FLUXI_USERNAME))
    .limit(1);

  if (!fluxiAccount) {
    console.error('❌ Fluxi no existe. Ejecuta primero: bun run src/seed-fluxi.ts');
    return;
  }

  for (const user of rows) {
    console.log(`\n👤 Reparando: ${user.name} (${user.email})`);

    try {
      // 1. Create personal account
      const username = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const [account] = await db
        .insert(accounts)
        .values({
          ownerUserId: user.id,
          username: `${username}_${Date.now().toString(36)}`,
          displayName: user.name,
          accountType: 'personal',
          profile: {},
          privateContext: null,
        })
        .returning();

      console.log(`   ✅ Cuenta creada: ${account.id}`);

      // 2. Create actor
      await db.insert(actors).values({
        userId: user.id,
        accountId: account.id,
        role: 'owner',
        actorType: 'user',
      });

      console.log(`   ✅ Actor creado`);

      // 3. Create relationship with Fluxi
      const [relationship] = await db
        .insert(relationships)
        .values({
          accountAId: fluxiAccount.id,
          accountBId: account.id,
          perspectiveA: { savedName: user.name },
          perspectiveB: { savedName: 'Fluxi' },
        })
        .returning();

      console.log(`   ✅ Relación con Fluxi creada`);

      // 4. Create welcome conversation
      const [conversation] = await db
        .insert(conversations)
        .values({
          relationshipId: relationship.id,
          channel: 'web',
        })
        .returning();

      // 5. Create welcome message
      await db.insert(messages).values({
        conversationId: conversation.id,
        senderAccountId: fluxiAccount.id,
        type: 'incoming',
        content: {
          text: `¡Hola ${user.name}! 👋\n\nSoy Fluxi, tu asistente de FluxCore. Tu cuenta ha sido reparada.\n\n¿En qué puedo ayudarte hoy?`,
        },
      });

      console.log(`   ✅ Conversación de bienvenida creada`);

    } catch (error) {
      console.error(`   ❌ Error: ${(error as Error).message}`);
    }
  }

  console.log('\n✅ Reparación completada');
}

// Execute
repairUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
