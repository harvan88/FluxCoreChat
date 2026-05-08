import { db, accounts, accountLocations } from '..';
import { eq, isNull, and } from 'drizzle-orm';

async function migrate() {
  console.log('🚀 Iniciando migración de contactos a sedes...');
  
  const allAccounts = await db.select().from(accounts);
  console.log(`📊 Encontradas ${allAccounts.length} cuentas.`);

  for (const account of allAccounts) {
    const socialLinks = account.socialLinks as any;
    if (!socialLinks) continue;

    const oldPhone = socialLinks.phone;
    const oldEmail = socialLinks.email;

    if (!oldPhone && !oldEmail) {
      console.log(`[Account ${account.id}] No hay datos de contacto para migrar.`);
      continue;
    }

    console.log(`[Account ${account.id}] Encontrados datos: Phone=${oldPhone}, Email=${oldEmail}`);

    // Buscar si ya tiene una sede por defecto
    const [existingDefault] = await db
      .select()
      .from(accountLocations)
      .where(and(
        eq(accountLocations.accountId, account.id),
        eq(accountLocations.isDefault, true)
      ))
      .limit(1);

    if (existingDefault) {
      console.log(`[Account ${account.id}] Actualizando sede existente: ${existingDefault.id}`);
      await db.update(accountLocations)
        .set({
          phone: existingDefault.phone || (typeof oldPhone === 'string' ? oldPhone : oldPhone?.value),
          email: existingDefault.email || (typeof oldEmail === 'string' ? oldEmail : oldEmail?.value),
        })
        .where(eq(accountLocations.id, existingDefault.id));
    } else {
      console.log(`[Account ${account.id}] Creando nueva sede por defecto.`);
      const letter = 'A'; // Primera sede
      const baseName = account.displayName || account.username || 'Sede';
      const name = `${baseName} - Sede ${letter}`;

      await db.insert(accountLocations).values({
        accountId: account.id,
        name,
        isDefault: true,
        status: 'active',
        phone: typeof oldPhone === 'string' ? oldPhone : oldPhone?.value,
        email: typeof oldEmail === 'string' ? oldEmail : oldEmail?.value,
      });
    }

    // Limpiar campos migrados de socialLinks para evitar duplicidad y confusiones futuras
    const nextSocialLinks = { ...socialLinks };
    delete nextSocialLinks.phone;
    delete nextSocialLinks.email;
    
    // Si phone_ai o email_ai existían, podríamos moverlos o simplemente limpiar
    delete nextSocialLinks.phone_ai;
    delete nextSocialLinks.email_ai;

    await db.update(accounts)
      .set({ socialLinks: nextSocialLinks })
      .where(eq(accounts.id, account.id));
      
    console.log(`[Account ${account.id}] ✅ Migración completada.`);
  }

  console.log('✨ Proceso finalizado.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error en la migración:', err);
  process.exit(1);
});
