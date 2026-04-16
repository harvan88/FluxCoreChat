
import { db, aiTraces } from '@fluxcore/db';
import { desc } from 'drizzle-orm';

async function checkLastTrace() {
  console.log('--- Ultimas 3 Trazas AI ---');
  const results = await db.select()
    .from(aiTraces)
    .orderBy(desc(aiTraces.createdAt))
    .limit(3);

  results.forEach((r, i) => {
    console.log(`\n[${i}] ID: ${r.id}`);
    console.log(`    Account: ${r.accountId}`);
    console.log(`    Mode: ${r.mode}`);
    console.log(`    Response: ${r.responseContent}`);
    console.log(`    Context Snapshot keys:`, Object.keys(r.requestBody?.contextSnapshot || {}));
    if (r.requestBody?.contextSnapshot?._cognitiveSteps) {
      console.log(`    Cognitive Steps found:`, Object.keys(r.requestBody.contextSnapshot._cognitiveSteps));
    } else {
      console.log(`    ⚠️  _cognitiveSteps MISSING or EMPTY`);
    }
  });
  
  process.exit(0);
}

checkLastTrace().catch(console.error);
