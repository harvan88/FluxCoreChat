#!/usr/bin/env bun
import { db, messages, accounts } from '@fluxcore/db';
import { eq, desc, and, gt, sql } from 'drizzle-orm';

const CONVERSATION_ID = 'd01b81c6-4bed-4269-908c-f0564c27181c';
const PATRICIA_ID = '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31';
const HAROLD_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('🔍 Monitoring sender_account_id fix...\n');
console.log('Waiting for AI message in conversation...\n');

let lastMessageId: string | null = null;
let attempts = 0;
const MAX_ATTEMPTS = 60; // 1 minute

const checkInterval = setInterval(async () => {
    attempts++;
    
    if (attempts > MAX_ATTEMPTS) {
        console.log('\n⏱️ Timeout - no new AI message detected in 60 seconds');
        process.exit(0);
    }
    
    const aiMessages = await db
        .select({
            id: messages.id,
            senderAccountId: messages.senderAccountId,
            generatedBy: messages.generatedBy,
            createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(
            eq(messages.conversationId, CONVERSATION_ID),
            eq(messages.generatedBy, 'ai'),
            gt(messages.createdAt, new Date(Date.now() - 120000)) // Last 2 minutes
        ))
        .orderBy(desc(messages.createdAt))
        .limit(1);
    
    if (aiMessages.length > 0 && aiMessages[0].id !== lastMessageId) {
        lastMessageId = aiMessages[0].id;
        clearInterval(checkInterval);
        
        const aiMsg = aiMessages[0];
        const [account] = await db
            .select({ username: accounts.username })
            .from(accounts)
            .where(eq(accounts.id, aiMsg.senderAccountId))
            .limit(1);
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ AI MESSAGE DETECTED\n');
        console.log(`Message ID: ${aiMsg.id}`);
        console.log(`Sender Account ID: ${aiMsg.senderAccountId}`);
        console.log(`Sender Username: ${account?.username || 'unknown'}`);
        console.log(`Created At: ${aiMsg.createdAt}\n`);
        
        if (aiMsg.senderAccountId === PATRICIA_ID) {
            console.log('✅ ✅ ✅ FIX VERIFIED ✅ ✅ ✅');
            console.log('AI responded FROM Patricia (correct)\n');
        } else if (aiMsg.senderAccountId === HAROLD_ID) {
            console.log('❌ ❌ ❌ FIX FAILED ❌ ❌ ❌');
            console.log('AI still responding FROM Harold (incorrect)\n');
        } else {
            console.log('⚠️ UNEXPECTED sender_account_id');
            console.log('Not Patricia, not Harold - investigate\n');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(aiMsg.senderAccountId === PATRICIA_ID ? 0 : 1);
    }
    
    process.stdout.write(`\r⏳ Waiting... (${attempts}s)`);
}, 1000);
