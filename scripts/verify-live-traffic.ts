
import { db, fluxcoreSignals, conversations, messages, relationships, fluxcoreActors, accounts } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import { chatCoreWebchatGateway } from '../apps/api/src/services/fluxcore/chatcore-webchat-gateway.service';
import { chatProjector } from '../apps/api/src/core/projections/chat-projector';
import { identityProjector } from '../apps/api/src/services/fluxcore/identity-projector.service';
import { v4 as uuidv4 } from 'uuid';

async function main() {
    console.log('🚦 Verifying Live Traffic (Post-Fix)...');

    // Setup: Fetch valid accounts
    const allAccounts = await db.select().from(accounts).limit(1);
    if (allAccounts.length < 1) {
        console.error('❌ Need at least 1 account in DB to run this test.');
        process.exit(1);
    }

    const tenantId = allAccounts[0].id;
    const visitorToken = `vtok_live_${Date.now()}`;
    
    console.log(`📋 Test Params:`);
    console.log(`   Tenant: ${tenantId} (${allAccounts[0].username})`);
    console.log(`   Visitor: ${visitorToken}`);

    // =====================================================================================
    // STEP 1: Visitor sends a message
    // =====================================================================================
    console.log('\n[1] 📨 Visitor sends new message...');
    
    const msgPayload = { text: 'Hello, is the projector working now?' };
    const cert = await chatCoreWebchatGateway.certifyIngress({
        visitorToken,
        tenantId,
        payload: msgPayload,
        meta: { requestId: uuidv4() }
    });

    if (!cert.accepted || !cert.signalId) {
        console.error('❌ Failed to certify ingress:', cert.reason);
        process.exit(1);
    }
    console.log(`   ✅ Certified Ingress Signal #${cert.signalId}`);

    // Fetch Signal
    const [signal] = await db.select().from(fluxcoreSignals).where(eq(fluxcoreSignals.sequenceNumber, cert.signalId));
    if (!signal) throw new Error(`Signal #${cert.signalId} not found in DB`);

    // Run Projectors (Manually triggering them to simulate worker)
    console.log('   Running IdentityProjector...');
    await identityProjector['project'](signal, db);
    
    console.log('   Running ChatProjector...');
    try {
        await chatProjector['project'](signal, db);
        console.log('   ✅ ChatProjector finished without error.');
    } catch (e) {
        console.error('   ❌ ChatProjector Failed:', e);
        process.exit(1);
    }

    // Verify Conversation
    const [conv] = await db.select().from(conversations).where(eq(conversations.visitorToken, visitorToken));
    
    if (conv) {
        console.log(`   ✅ PASS: Conversation created: ${conv.id}`);
        console.log(`      Owner: ${conv.ownerAccountId}`);
        console.log(`      Rel: ${conv.relationshipId}`);
    } else {
        console.error('   ❌ FAIL: Conversation not found!');
        process.exit(1);
    }

    console.log('\n✅ System is operational.');
    process.exit(0);
}

main().catch(console.error);
