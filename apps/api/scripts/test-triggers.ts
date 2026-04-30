import { db, accounts, conversations } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function test() {
    console.log('🏁 SCRIPT START');
    const { keywordTriggerService } = await import('../src/services/keyword-trigger.service');
    
    console.log('🚀 Starting FULL Keyword Trigger & Execution Test...');
    
    // 1. Encontrar una cuenta de prueba
    const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.username, 'drjones'))
        .limit(1);
    
    if (!account) {
        console.error('❌ Account "drjones" not found');
        process.exit(1);
    }
    
    console.log(`✅ Using account: ${account.displayName} (${account.id})`);

    // 2. Encontrar una conversación REAL para esta cuenta
    console.log(`🔍 Fetching real conversation for account: ${account.id}`);
    const [realConv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.ownerAccountId, account.id))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);
    
    if (!realConv) {
        console.error('❌ No real conversations found for this account');
        process.exit(1);
    }

    console.log(`✅ Using real conversation: ${realConv.id}`);

    // 3. Ejecutar via MessageCore
    const testText = "manzana";
    console.log(`\n🔍 Sending to MessageCore: "${testText}"`);

    const { messageCore } = await import('../src/core/message-core');
    
    const result = await messageCore.receive({
        conversationId: realConv.id,
        targetAccountId: account.id,
        senderAccountId: 'visitor-mock',
        type: 'incoming',
        content: { text: testText },
        generatedBy: 'human',
        meta: { channel: 'test' }
    });

    console.log(`\n✅ MessageCore result:`, result);
    console.log(`\n⏳ Waiting 3 seconds to see if trigger logs appear...`);
    await new Promise(r => setTimeout(r, 3000));
    
    console.log(`\n✅ Test flow completed. Check console for [KeywordTriggerService] logs.`);
    process.exit(0);
}

test().catch(err => {
    console.error('💥 Test failed:', err);
    process.exit(1);
});
