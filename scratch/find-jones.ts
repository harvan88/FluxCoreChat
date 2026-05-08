import { db, accounts, accountLocations } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function findDrJones() {
  const allAccounts = await db.select({ id: accounts.id, username: accounts.username }).from(accounts);
  console.log('Accounts:', JSON.stringify(allAccounts, null, 2));

  const jones = allAccounts.find(a => a.username?.toLowerCase().includes('jones'));
  if (jones) {
    const locations = await db.select().from(accountLocations).where(eq(accountLocations.accountId, jones.id));
    console.log('Jones Locations:', JSON.stringify(locations, null, 2));
  }
}

findDrJones().catch(console.error);
