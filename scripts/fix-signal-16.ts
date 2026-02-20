#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

// 1. Check signal #16 (column is sequence_number per fluxcoreSignals schema)
const sigs = await db.execute(sql`
    SELECT sequence_number, fact_type, source_namespace, source_key, evidence_raw
    FROM fluxcore_signals WHERE sequence_number = 16
`);
console.log('Signal #16:', JSON.stringify(sigs[0] ?? 'NOT FOUND', null, 2));

// 2. Check missing actor
const actors = await db.execute(sql`
    SELECT id FROM actors WHERE id = '24ca73f0-0d8d-4089-b1c3-ed075b50e107'
`);
console.log('Missing actor 24ca73f0:', actors[0] ?? 'NOT FOUND');

// 3. Chat projector cursor (projector_name = 'chat', last_sequence_number)
const proj = await db.execute(sql`
    SELECT * FROM fluxcore_projector_cursors WHERE projector_name = 'chat'
`);
console.log('Chat projector cursor:', proj[0] ?? 'NOT FOUND');

// 4. projector errors for signal 16
const errs = await db.execute(sql`
    SELECT * FROM fluxcore_projector_errors WHERE signal_seq = 16 AND projector_name = 'chat'
`);
console.log('Projector errors for sig#16:', errs[0] ?? 'none');

const answer = process.argv[2];
if (answer === '--fix') {
    // Advance cursor to 16 — projector will process starting from 17 on next wakeUp
    await db.execute(sql`
        UPDATE fluxcore_projector_cursors
        SET last_sequence_number = 16
        WHERE projector_name = 'chat'
    `);
    console.log('\n✅ Cursor advanced to 16 — ChatProjector will start from signal #17 on next wakeUp');
} else if (answer === '--skip-all') {
    // Advance cursor to MAX — skip all existing signals (new arch handles its own pipeline)
    const maxSeq = await db.execute(sql`SELECT MAX(sequence_number) AS max_seq FROM fluxcore_signals`);
    const max = (maxSeq as any)[0]?.max_seq ?? 0;
    await db.execute(sql`
        UPDATE fluxcore_projector_cursors
        SET last_sequence_number = ${Number(max)}
        WHERE projector_name = 'chat'
    `);
    console.log(`\n✅ Cursor advanced to ${max} — ChatProjector log noise eliminated`);
} else {
    console.log('\nRun with --fix to advance past signal #16');
    console.log('Run with --skip-all to advance to current max (silence all existing signal errors)');
}

process.exit(0);
