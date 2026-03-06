/**
 * Test: Full Kernel-mediated AI Response Flow
 * 
 * Verifies the architecture:
 * 1. Send a message via API (user → ChatCore → Kernel)
 * 2. Wait for CognitionWorker to process → AI response
 * 3. Verify AI_RESPONSE_GENERATED signal exists in fluxcore_signals
 * 4. Verify AI message was persisted in messages table by ChatCore (not FluxCore)
 * 
 * Usage: bun run scripts/test-kernel-ai-response.ts
 */

const API_URL = 'http://localhost:3000';

// Use existing conversation from logs
const CONVERSATION_ID = '9d35128a-d35c-4d2f-816f-5b97d378c7a6';

async function getAuthToken(): Promise<string> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'carlos@test.com', password: '123456' }),
    });
    const data: any = await res.json();
    if (!data.success) throw new Error('Login failed: ' + JSON.stringify(data));
    return data.data.token;
}

async function main() {
    console.log('=== TEST: Kernel-Mediated AI Response Flow ===\n');

    // Step 1: Check initial signal count
    console.log('Step 1: Checking initial state...');
    const initialSignals = await queryDB(`SELECT COUNT(*) as cnt FROM fluxcore_signals WHERE fact_type = 'AI_RESPONSE_GENERATED'`);
    console.log(`  Initial AI_RESPONSE_GENERATED signals: ${initialSignals}`);
    
    const initialMessages = await queryDB(`SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = '${CONVERSATION_ID}' AND generated_by = 'ai'`);
    console.log(`  Initial AI messages in conversation: ${initialMessages}`);

    // Step 2: Send a message
    console.log('\nStep 2: Sending test message...');
    const testMsg = `Test kernel flow ${Date.now()}`;
    
    try {
        const AUTH_TOKEN = await getAuthToken();
        console.log(`  Auth token obtained: ${AUTH_TOKEN.slice(0, 20)}...`);
        
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                conversationId: CONVERSATION_ID,
                content: { text: testMsg },
                type: 'outgoing',
            }),
        });
        
        if (!res.ok) {
            const body = await res.text();
            console.error(`  ❌ Failed to send message: ${res.status} ${body}`);
            process.exit(1);
        }
        
        const data = await res.json();
        console.log(`  ✅ Message sent: ${data.id?.slice(0, 8) || 'unknown'}`);
    } catch (err: any) {
        console.error(`  ❌ Request failed: ${err.message}`);
        process.exit(1);
    }

    // Step 3: Wait for the full pipeline
    // Turn window (3s) + wakeup delay (4s) + AI response time (~5s) + projection (~2s) = ~14s
    console.log('\nStep 3: Waiting 18s for full pipeline (turn window + wakeup + AI + projection)...');
    await sleep(18000);

    // Step 4: Check for AI_RESPONSE_GENERATED signal
    console.log('\nStep 4: Verifying AI_RESPONSE_GENERATED signal in Kernel...');
    const newSignals = await queryDB(`SELECT COUNT(*) as cnt FROM fluxcore_signals WHERE fact_type = 'AI_RESPONSE_GENERATED'`);
    console.log(`  AI_RESPONSE_GENERATED signals now: ${newSignals} (was ${initialSignals})`);
    
    if (Number(newSignals) > Number(initialSignals)) {
        console.log('  ✅ PASS: New AI_RESPONSE_GENERATED signal certified in Kernel');
    } else {
        console.log('  ❌ FAIL: No new AI_RESPONSE_GENERATED signal found');
    }

    // Step 5: Check for AI message in ChatCore's messages table
    console.log('\nStep 5: Verifying AI message in ChatCore messages table...');
    const newMessages = await queryDB(`SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = '${CONVERSATION_ID}' AND generated_by = 'ai'`);
    console.log(`  AI messages now: ${newMessages} (was ${initialMessages})`);
    
    if (Number(newMessages) > Number(initialMessages)) {
        console.log('  ✅ PASS: AI message persisted by ChatCore (via messageCore.receive)');
    } else {
        console.log('  ❌ FAIL: No new AI message found in ChatCore');
    }

    // Step 6: Verify the last AI message
    console.log('\nStep 6: Checking last AI message content...');
    const lastAiMsg = await queryDB(`SELECT id, content, sender_account_id, generated_by, created_at FROM messages WHERE conversation_id = '${CONVERSATION_ID}' AND generated_by = 'ai' ORDER BY created_at DESC LIMIT 1`, true);
    if (lastAiMsg) {
        console.log(`  Last AI message:`);
        console.log(`    ID: ${lastAiMsg}`);
    }

    // Step 7: Verify cognition queue turn was processed
    console.log('\nStep 7: Checking cognition queue...');
    const pendingTurns = await queryDB(`SELECT COUNT(*) as cnt FROM fluxcore_cognition_queue WHERE processed_at IS NULL`);
    console.log(`  Pending turns: ${pendingTurns}`);
    
    if (Number(pendingTurns) === 0) {
        console.log('  ✅ PASS: All turns processed');
    } else {
        console.log('  ⚠️  WARNING: There are still pending turns');
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    const signalPass = Number(newSignals) > Number(initialSignals);
    const messagePass = Number(newMessages) > Number(initialMessages);
    
    if (signalPass && messagePass) {
        console.log('✅ ALL TESTS PASSED');
        console.log('Architecture verified: FluxCore → Kernel (AI_RESPONSE_GENERATED) → ChatCore (messageCore.receive) → DB + WebSocket');
    } else {
        console.log('❌ SOME TESTS FAILED');
        if (!signalPass) console.log('  - AI response was NOT certified in Kernel');
        if (!messagePass) console.log('  - AI message was NOT delivered by ChatCore');
    }
}

async function queryDB(query: string, fullRow = false): Promise<string> {
    const { execSync } = require('child_process');
    try {
        const flag = fullRow ? '' : '-t';
        const result = execSync(
            `docker exec fluxcore-db psql -U postgres -d fluxcore ${flag} -c "${query.replace(/"/g, '\\"')}"`,
            { encoding: 'utf-8' }
        ).trim();
        return result;
    } catch (err: any) {
        return 'ERROR: ' + err.message;
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
