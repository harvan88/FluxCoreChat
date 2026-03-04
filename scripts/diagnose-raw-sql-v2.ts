#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('=== Probando estructura de db.execute ===');
const result = await db.execute(sql`
    SELECT account_id, mode 
    FROM fluxcore_account_policies
    WHERE account_id = ${ACCOUNT_ID}
    LIMIT 1
`);

console.log('typeof result:', typeof result);
console.log('Array.isArray(result):', Array.isArray(result));
console.log('result.length:', (result as any).length);
console.log('result[0]:', (result as any)[0]);
console.log('result:', result);

console.log('\n=== Iterando sobre result ===');
for (const row of result as any) {
    console.log('Row:', row);
}

process.exit(0);
