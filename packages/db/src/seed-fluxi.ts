/**
 * Seed: Crear cuenta de sistema Fluxi
 * Este script crea la cuenta de Fluxi que da la bienvenida a nuevos usuarios
 */

import { db } from './connection';
import { users, accounts, actors } from './schema';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';

const FLUXI_EMAIL = 'fluxi@fluxcore.system';
const FLUXI_USERNAME = 'fluxi';

async function seedFluxi() {
  console.log('🤖 Verificando cuenta Fluxi...');

  // Verificar si ya existe
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, FLUXI_EMAIL))
    .limit(1);

  if (existing) {
    console.log('✅ Fluxi ya existe');
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.ownerUserId, existing.id))
      .limit(1);
    console.log(`   Account ID: ${account?.id}`);
    return account?.id;
  }

  // Crear usuario Fluxi
  const passwordHash = await hash('fluxi-system-no-login', 10);
  const [fluxi] = await db
    .insert(users)
    .values({
      email: FLUXI_EMAIL,
      passwordHash,
      name: 'Fluxi',
    })
    .returning();

  console.log(`✅ Usuario Fluxi creado: ${fluxi.id}`);

  // Crear cuenta Fluxi
  const [account] = await db
    .insert(accounts)
    .values({
      ownerUserId: fluxi.id,
      username: FLUXI_USERNAME,
      displayName: 'Fluxi',
      accountType: 'business',
      profile: {
        bio: '¡Hola! Soy Fluxi, tu asistente de FluxCore. Estoy aquí para ayudarte a configurar tu cuenta y responder tus preguntas.',
        avatarUrl: null,
        isSystemAccount: true,
      },
      privateContext: 'Soy Fluxi, el asistente virtual de FluxCore. Mi rol es dar la bienvenida a nuevos usuarios y ayudarles a configurar su cuenta. Debo ser amigable, conciso y útil.',
    })
    .returning();

  console.log(`✅ Cuenta Fluxi creada: ${account.id}`);

  // Create actor (owner relationship)
  await db.insert(actors).values({
    userId: fluxi.id,
    accountId: account.id,
    role: 'owner',
  });

  console.log('✅ Fluxi seed completado');
  return account.id;
}

// Ejecutar si es llamado directamente
seedFluxi()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
