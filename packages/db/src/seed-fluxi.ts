/**
 * Seed: Crear cuenta de sistema FluxCore
 * Este script crea la cuenta de FluxCore que da la bienvenida a nuevos usuarios
 * y es administrada por el super administrador del sistema (harvan@hotmail.es)
 */

import { db } from './connection';
import { users, accounts, actors } from './schema';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';

const FLUXCORE_EMAIL = 'fluxcore@fluxcore.system';
const FLUXCORE_USERNAME = 'fluxcore';

async function seedFluxCore() {
  console.log('🤖 Verificando cuenta FluxCore...');

  // Verificar si ya existe
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, FLUXCORE_EMAIL))
    .limit(1);

  if (existing) {
    console.log('✅ FluxCore ya existe');
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.ownerUserId, existing.id))
      .limit(1);
    console.log(`   Account ID: ${account?.id}`);
    return account?.id;
  }

  // Crear usuario FluxCore
  const passwordHash = await hash('fluxcore-system-no-login', 10);
  const [fluxcoreUser] = await db
    .insert(users)
    .values({
      email: FLUXCORE_EMAIL,
      passwordHash,
      name: 'FluxCore',
    })
    .returning();

  console.log(`✅ Usuario FluxCore creado: ${fluxcoreUser.id}`);

  // Crear cuenta FluxCore
  const [account] = await db
    .insert(accounts)
    .values({
      ownerUserId: fluxcoreUser.id,
      username: FLUXCORE_USERNAME,
      displayName: 'FluxCore',
      accountType: 'business',
      alias: 'fluxcore',
      profile: {
        bio: '¡Hola! Soy FluxCore, tu asistente. Estoy aquí para ayudarte a configurar tu cuenta y responder tus preguntas.',
        avatarUrl: null,
        isSystemAccount: true,
      },
      privateContext: 'Soy FluxCore, el asistente del sistema. Mi rol es dar la bienvenida a nuevos usuarios y ayudarles a configurar su cuenta. Debo ser amigable, conciso y útil.',
    })
    .returning();

  console.log(`✅ Cuenta FluxCore creada: ${account.id}`);

  // Create actor (owner relationship)
  await db.insert(actors).values({
    userId: fluxcoreUser.id,
    accountId: account.id,
    role: 'owner',
    actorType: 'user',
  });

  console.log('✅ FluxCore seed completado');
  return account.id;
}

// Ejecutar si es llamado directamente
seedFluxCore()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
