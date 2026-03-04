import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';

/**
 * Script para probar chatCoreGateway.certifyIngress()
 * Ejecutar con: bun run scripts/test-gateway.ts
 */
async function testGateway() {
  console.log('🧪 Testing chatCoreGateway.certifyIngress()...\n');

  try {
    // 1. Probar certificación con datos de prueba
    console.log('📱 1. Testing WhatsApp message certification...');
    const result1 = await chatCoreGateway.certifyIngress({
      accountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
      userId: 'visitor_whatsapp_5491155556789',
      payload: {
        content: { text: 'Hola, quiero información sobre sus servicios' },
        channel: 'whatsapp',
        externalId: 'wamid.test.12345'
      },
      meta: {
        ip: '127.0.0.1',
        userAgent: 'WhatsApp-Test-Simulator',
        clientTimestamp: new Date().toISOString(),
        conversationId: '744c4c32-10fd-4275-bcdd-8eff9f2785a8',
        requestId: 'test-request-123',
        humanSenderId: 'visitor_whatsapp_5491155556789',
        messageId: 'c90c8989-8004-43d6-a39e-0add0db8fc7f'
      }
    });

    console.log('✅ WhatsApp certification result:', result1);

    // 2. Probar certificación con datos de WebChat
    console.log('\n🌐 2. Testing WebChat message certification...');
    const result2 = await chatCoreGateway.certifyIngress({
      accountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
      userId: 'visitor_webchat_67890',
      payload: {
        content: { text: 'Hola desde el widget web' },
        channel: 'web',
        externalId: 'webchat.test.67890'
      },
      meta: {
        ip: '127.0.0.1',
        userAgent: 'WebChat-Test-Simulator',
        clientTimestamp: new Date().toISOString(),
        conversationId: '744c4c32-10fd-4275-bcdd-8eff9f2785a8',
        requestId: 'test-request-456',
        humanSenderId: 'visitor_webchat_67890',
        messageId: 'bc3ab498-b737-4a53-9fc5-d8f71e228fa0'
      }
    });

    console.log('✅ WebChat certification result:', result2);

    // 3. Evaluación
    console.log('\n🎯 3. Evaluation:');
    
    if (result1.accepted && result2.accepted) {
      console.log('✅ Both certifications successful!');
      console.log(`📈 WhatsApp Signal ID: ${result1.signalId}`);
      console.log(`📈 WebChat Signal ID: ${result2.signalId}`);
      console.log('\n🎉 Gateway certification is working correctly!');
    } else {
      console.log('❌ Certification failures detected:');
      if (!result1.accepted) {
        console.log(`   - WhatsApp failed: ${result1.reason}`);
      }
      if (!result2.accepted) {
        console.log(`   - WebChat failed: ${result2.reason}`);
      }
    }

  } catch (error) {
    console.error('❌ Error during gateway test:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testGateway()
    .then(() => {
      console.log('\n🎉 Gateway test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Gateway test failed:', error);
      process.exit(1);
    });
}

export { testGateway };
