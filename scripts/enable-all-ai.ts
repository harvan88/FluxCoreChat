#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

console.log('🔧 Habilitando IA para todas las cuentas...\n');

await db.execute(sql`
    UPDATE fluxcore_account_policies 
    SET mode = 'auto'
    WHERE mode = 'off'
`);

const [result] = await db.execute(sql`
    SELECT COUNT(*) as count FROM fluxcore_account_policies WHERE mode = 'auto'
`) as any;

console.log(`✅ ${result.count} cuenta(s) ahora tienen mode='auto'`);
console.log('🤖 FluxCore responderá automáticamente a mensajes de visitantes\n');

process.exit(0);
