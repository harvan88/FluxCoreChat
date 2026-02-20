/**
 * advance-projector-cursor.ts
 * Advances the chat projector cursor to the current max sequence_number
 * to skip signals with invalid FK references (from_actor_id not in actors).
 */
import { db, sql } from '@fluxcore/db';

const [maxRow] = await db.execute(sql`SELECT MAX(sequence_number) as max_seq FROM fluxcore_signals`) as any[];
const maxSeq = maxRow?.max_seq ?? 0;

const [cursorRow] = await db.execute(sql`
    SELECT last_sequence_number FROM fluxcore_projector_cursors WHERE projector_name = 'chat'
`) as any[];
const currentCursor = cursorRow?.last_sequence_number ?? 0;

console.log(`Current cursor: ${currentCursor}, Max signal: ${maxSeq}`);

if (maxSeq > currentCursor) {
    await db.execute(sql`
        UPDATE fluxcore_projector_cursors
        SET last_sequence_number = ${maxSeq}
        WHERE projector_name = 'chat'
    `);
    console.log(`✅ Cursor advanced from ${currentCursor} to ${maxSeq}`);
} else {
    console.log(`✅ Cursor already at max (${currentCursor})`);
}

process.exit(0);
