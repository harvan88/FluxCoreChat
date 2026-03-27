import { db } from '../../../packages/db/src/index';
import { sql } from 'drizzle-orm';

async function checkPolicy() {
    const accountId = '520954df-cd5b-499a-a435-a5c0be4fb4e8';
    try {
        const result = (await db.execute(sql`
            SELECT id, account_id, mode FROM fluxcore_account_policies 
            WHERE account_id = ${accountId}
        `)) as any;
        console.log('--- POLICY FOR ACCOUNT 520954df ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('Error checking policy:', e.message);
    }
}

checkPolicy().then(() => process.exit(0));
