#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('Cambiando mode a AUTO...');

await db.execute(sql`
    UPDATE fluxcore_account_policies 
    SET mode = 'auto'
    WHERE account_id = ${HAROLD_ACCOUNT_ID}
`);

const [policy] = await db.execute(sql`
    SELECT mode FROM fluxcore_account_policies 
    WHERE account_id = ${HAROLD_ACCOUNT_ID}
`) as any;

console.log('✓ Mode actualizado a:', policy.mode);

process.exit(0);
