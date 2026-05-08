import { fluxPolicyContextService } from '../services/flux-policy-context.service';

async function testPolicy() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    const conversationId = '2146cc33-392d-4369-a891-552d314325d1';
    
    console.log(`🔍 PROBANDO POLICY CONTEXT PARA: account=${accountId}, conv=${conversationId}`);
    
    try {
        const context = await fluxPolicyContextService.resolvePolicyContext({
            accountId,
            conversationId,
            contactId: '', // Default for now
            channel: 'web'
        });
        console.log('✅ Contexto resuelto exitosamente:');
        console.log(JSON.stringify(context, null, 2));
    } catch (error: any) {
        console.error('❌ Error resolviendo contexto:');
        console.error(error.stack);
    }
}

testPolicy().catch(console.error);
