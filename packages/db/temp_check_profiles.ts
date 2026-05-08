import { db, accounts } from '@fluxcore/db';

async function run() {
  const res = await db.select({ 
    id: accounts.id, 
    alias: accounts.alias, 
    displayName: accounts.displayName,
    profile: accounts.profile 
  }).from(accounts).limit(10);
  
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
