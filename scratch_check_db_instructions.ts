
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    
    console.log('--- DB INSTRUCTIONS AUDIT ---');
    
    // 1. Check assistant instructions
    const instructions = await db.execute(sql`
        SELECT i.name, iv.content
        FROM fluxcore_assistant_instructions ai
        INNER JOIN fluxcore_instructions i ON i.id = ai.instruction_id
        INNER JOIN fluxcore_instruction_versions iv ON iv.id = i.current_version_id
        WHERE ai.assistant_id IN (SELECT id FROM fluxcore_assistants WHERE account_id = ${accountId})
    `) as any;

    for (const ins of instructions) {
        console.log(`\nInstruction: ${ins.name}`);
        if (ins.content.includes('Estado operativo') || ins.content.includes('🔴')) {
            console.log('✅ FOUND MATCH!');
            console.log(ins.content);
        } else {
            console.log('(No status logic found)');
        }
    }

    // 2. Check templates
    const templates = await db.execute(sql`
        SELECT name, content
        FROM templates
        WHERE account_id = ${accountId}
    `) as any;

    for (const tpl of templates) {
        if (tpl.content.includes('Estado operativo') || tpl.content.includes('🔴')) {
            console.log(`\n✅ FOUND MATCH IN TEMPLATE: ${tpl.name}`);
            console.log(tpl.content);
        }
    }
}

main().catch(console.error);
