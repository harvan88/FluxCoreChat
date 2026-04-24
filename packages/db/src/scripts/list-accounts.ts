
import { db, templates } from '../index';
import { sql } from 'drizzle-orm';

async function main() {
    console.log(`--- LISTADO DE CUENTAS CON PLANTILLAS ---`);
    const results = await db.execute(sql`SELECT account_id, COUNT(*) as count FROM templates GROUP BY account_id`);
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}
main().catch(console.error);
