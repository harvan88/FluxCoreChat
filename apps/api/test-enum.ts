import { db, assetAuditLogs } from '@fluxcore/db';

async function testInsert() {
  try {
    await db.insert(assetAuditLogs).values({
        action: 'url_signed',
        actorType: 'visitor',
        context: 'test',
        timestamp: new Date()
    });
    console.log("Insert ok!");
  } catch(e) {
    console.error("DEBUG DB ERROR:", e);
  } finally {
    process.exit(0);
  }
}
testInsert();
