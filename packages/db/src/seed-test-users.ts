/**
 * Seed Script: Crear usuarios de prueba para producción
 * 
 * Usuarios creados:
 * - FluxCore Test (fluxcore@test.com) - Admin/Bot
 * - Maria Test (maria@test.com)
 * - Daniel Test (daniel@test.com)
 * 
 * Uso: bun run seed:test
 */

import { db } from './connection';
import { users, accounts, relationships, conversations } from './schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcrypt';

const TEST_PASSWORD = '123456';
const SALT_ROUNDS = 10;

interface TestUser {
  name: string;
  email: string;
  alias: string;
}

const TEST_USERS: TestUser[] = [
  { name: 'FluxCore Test', email: 'fluxcore@test.com', alias: 'fluxcore' },
  { name: 'Maria Test', email: 'maria@test.com', alias: 'maria' },
  { name: 'Daniel Test', email: 'daniel@test.com', alias: 'daniel' },
];

async function seedTestUsers() {
  console.log('🌱 Iniciando seed de usuarios de prueba...\n');

  const createdUsers: { id: string; email: string; accountId: string }[] = [];

  for (const testUser of TEST_USERS) {
    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, testUser.email))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏭️  Usuario ${testUser.email} ya existe, saltando...`);
      
      // Get their account
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.ownerUserId, existing[0].id))
        .limit(1);

      if (existingAccount.length > 0) {
        createdUsers.push({
          id: existing[0].id,
          email: testUser.email,
          accountId: existingAccount[0].id,
        });
      }
      continue;
    }

    // Create user with proper bcrypt hash
    const passwordHash = await hash(TEST_PASSWORD, SALT_ROUNDS);
    const [user] = await db
      .insert(users)
      .values({
        email: testUser.email,
        passwordHash,
        name: testUser.name,
      })
      .returning();

    console.log(`✅ Usuario creado: ${testUser.email} (ID: ${user.id})`);

    // Create default personal account
    const [account] = await db
      .insert(accounts)
      .values({
        ownerUserId: user.id,
        username: testUser.alias,
        displayName: testUser.name,
        accountType: testUser.alias === 'fluxcore' ? 'business' : 'personal',
        alias: testUser.alias,
        profile: {
          bio: testUser.alias === 'fluxcore' 
            ? 'Soy Fluxi, tu asistente virtual de FluxCore.' 
            : '',
        },
        privateContext: '',
      })
      .returning();

    console.log(`✅ Cuenta creada: @${testUser.alias} (ID: ${account.id})`);

    createdUsers.push({
      id: user.id,
      email: testUser.email,
      accountId: account.id,
    });
  }

  // Create relationships with FluxCore (the bot account)
  const fluxcoreUser = createdUsers.find(u => u.email === 'fluxcore@test.com');
  
  if (fluxcoreUser) {
    console.log('\n🔗 Creando relaciones con FluxCore...');

    for (const user of createdUsers) {
      if (user.email === 'fluxcore@test.com') continue;

      // Check if relationship exists
      const existingRel = await db
        .select()
        .from(relationships)
        .where(eq(relationships.accountAId, fluxcoreUser.accountId))
        .limit(1);

      if (existingRel.some(r => r.accountBId === user.accountId)) {
        console.log(`⏭️  Relación FluxCore <-> ${user.email} ya existe`);
        continue;
      }

      // Create relationship
      const [relationship] = await db
        .insert(relationships)
        .values({
          accountAId: fluxcoreUser.accountId,
          accountBId: user.accountId,
          perspectiveA: JSON.stringify({
            savedName: '',
            tags: ['test'],
            status: 'active',
          }),
          perspectiveB: JSON.stringify({
            savedName: 'FluxCore',
            tags: ['bot', 'support'],
            status: 'active',
          }),
          context: JSON.stringify({
            entries: [],
            totalChars: 0,
          }),
        })
        .returning();

      console.log(`✅ Relación creada: FluxCore <-> ${user.email}`);

      // Create welcome conversation
      const [conversation] = await db
        .insert(conversations)
        .values({
          relationshipId: relationship.id,
          channel: 'web',
          status: 'active',
          lastMessageText: '¡Hola! Soy Fluxi, tu asistente virtual.',
          lastMessageAt: new Date(),
        })
        .returning();

      console.log(`✅ Conversación de bienvenida creada (ID: ${conversation.id})`);
    }
  }

  console.log('\n✅ Seed completado!\n');
  console.log('Usuarios de prueba:');
  console.log('───────────────────');
  for (const user of TEST_USERS) {
    console.log(`  📧 ${user.email}`);
    console.log(`  🔑 Contraseña: 123456`);
    console.log(`  👤 Alias: @${user.alias}`);
    console.log('');
  }
}

// Run seed
seedTestUsers()
  .then(() => {
    console.log('🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error durante seed:', error);
    process.exit(1);
  });
