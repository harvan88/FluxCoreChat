import { db, fluxcoreSignals } from '@fluxcore/db';
import { desc, eq } from 'drizzle-orm';

async function checkSignals() {
  const signals = await db.select()
    .from(fluxcoreSignals)
    .where(eq(fluxcoreSignals.factType, 'AI_RESPONSE_GENERATED'))
    .orderBy(desc(fluxcoreSignals.sequenceNumber))
    .limit(2);
    
  console.log('RECENT AI_RESPONSE_GENERATED SIGNALS:');
  console.log(JSON.stringify(signals, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value, 2));
  
  process.exit(0);
}

checkSignals().catch(err => {
  console.error(err);
  process.exit(1);
});
