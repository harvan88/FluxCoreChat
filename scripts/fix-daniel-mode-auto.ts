#!/usr/bin/env bun
import { db, fluxcoreAssistants } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';

const DANIEL = 'a9611c11-70f2-46cd-baef-6afcde715f3a';

const all = await db
    .select()
    .from(fluxcoreAssistants)
    .where(eq(fluxcoreAssistants.accountId, DANIEL));

console.log('All assistants for Daniel:');
for (const a of all) console.log(`  id=${a.id} name=${a.name} status=${a.status}`);

const ass = all.find(a => a.status === 'active') ?? all[0];

if (!ass) {
    console.log('No assistant found for Daniel');
    process.exit(1);
}

console.log(`Assistant: ${ass.id} "${ass.name}" | timingConfig:`, ass.timingConfig);

const currentTiming = (ass.timingConfig as Record<string, unknown>) ?? {};
const newTiming = { ...currentTiming, mode: 'auto' };

await db
    .update(fluxcoreAssistants)
    .set({ timingConfig: newTiming as any })
    .where(eq(fluxcoreAssistants.id, ass.id));

console.log('✅ timingConfig.mode → auto');

const [updated] = await db.select({ tc: fluxcoreAssistants.timingConfig }).from(fluxcoreAssistants).where(eq(fluxcoreAssistants.id, ass.id));
console.log('Verified timingConfig:', updated.tc);
process.exit(0);
