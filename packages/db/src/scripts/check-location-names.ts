import { db, accountLocations, accounts } from '..';
import { eq } from 'drizzle-orm';

async function normalizeNames() {
  console.log('🔄 Normalizando nombres de sedes...');
  
  const allAccounts = await db.select().from(accounts);
  
  for (const account of allAccounts) {
    const locations = await db.select()
      .from(accountLocations)
      .where(eq(accountLocations.accountId, account.id))
      .orderBy(accountLocations.createdAt);
      
    if (locations.length === 0) continue;
    
    console.log(`[Account ${account.id}] Normalizando ${locations.length} sedes.`);
    
    const baseName = account.displayName || account.username || 'Sede';
    
    for (let i = 0; i < locations.length; i++) {
      const letter = String.fromCharCode(65 + i);
      const newName = `${baseName} - Sede ${letter}`;
      
      if (locations[i].name !== newName) {
        console.log(`  - "${locations[i].name}" ➡️ "${newName}"`);
        await db.update(accountLocations)
          .set({ name: newName })
          .where(eq(accountLocations.id, locations[i].id));
      }
    }
  }
  
  console.log('✨ Normalización completada.');
  process.exit(0);
}

import { eq } from 'drizzle-orm';
import { accounts } from '..';
normalizeNames().catch(err => {
  console.error(err);
  process.exit(1);
});
