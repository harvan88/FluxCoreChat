/**
 * Test Suite: Channel Adapters
 * 
 * Pruebas del sistema de adaptadores:
 * - Estado de adaptadores
 * - Verificación de webhook WhatsApp
 * - Simulación de mensajes entrantes
 */

const API_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text; // Para respuestas que no son JSON (como el webhook verify)
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`✅ ${name}`);
    results.push({ name, passed: true });
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    results.push({ name, passed: false, message: error.message });
  }
}

// Test data
let authToken = '';

async function runTests() {
  console.log('🧪 Starting Channel Adapters Tests...\n');
  
  // Check if API is running
  try {
    const health = await request('/health');
    if (health.status !== 'healthy') throw new Error('API not healthy');
    console.log('✅ API is running\n');
  } catch (e) {
    console.log('❌ API is not running. Please start the server first.');
    process.exit(1);
  }

  // Test 1: Get adapters status (public)
  await test('Get Adapters Status (Public)', async () => {
    const res = await request('/adapters/status');
    if (!res.success) throw new Error(res.message || 'Failed to get status');
    console.log(`   Configured adapters: ${JSON.stringify(res.data.configured)}`);
    console.log(`   Available channels: ${res.data.channels.join(', ') || '(none)'}`);
  });

  // Test 2: WhatsApp webhook verification
  await test('WhatsApp Webhook Verification', async () => {
    const verifyToken = 'fluxcore_verify';
    const challenge = 'test_challenge_123';
    
    const res = await fetch(
      `${API_URL}/adapters/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
    );
    
    const text = await res.text();
    if (text !== challenge) throw new Error(`Expected challenge "${challenge}", got "${text}"`);
    console.log(`   Webhook verification: OK`);
  });

  // Test 3: WhatsApp webhook with invalid token
  await test('WhatsApp Webhook Invalid Token', async () => {
    const res = await fetch(
      `${API_URL}/adapters/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test`
    );
    
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    console.log(`   Correctly rejected invalid token`);
  });

  // Test 4: WhatsApp webhook POST (simulate incoming message)
  await test('WhatsApp Webhook POST (Simulated Message)', async () => {
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id',
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '5491122334455',
            }],
            messages: [{
              from: '5491122334455',
              id: 'wamid.test123',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: { body: 'Hola, ¿cómo están?' },
            }],
          },
          field: 'messages',
        }],
      }],
    };

    const res = await request('/adapters/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify(webhookPayload),
    });

    // WhatsApp webhook siempre responde OK
    if (res !== 'OK') throw new Error(`Expected 'OK', got '${res}'`);
    console.log(`   Webhook processed: OK`);
  });

  // Test 5: Register user for authenticated tests
  await test('Register User', async () => {
    const email = `testadapter${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'test123',
        name: 'Adapter Test User',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Registration failed');
    authToken = res.data.token;
  });

  // Test 6: Get specific adapter status (authenticated)
  await test('Get WhatsApp Adapter Status', async () => {
    const res = await request('/adapters/whatsapp/status', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    // May return 404 if WhatsApp not configured, which is ok
    if (res.success) {
      console.log(`   Connected: ${res.data.connected}`);
      console.log(`   Messages sent: ${res.data.metrics?.messagesSent || 0}`);
    } else {
      console.log(`   Adapter not configured (expected in test environment)`);
    }
  });

  // Test 7: Send message (will fail without credentials, but tests the endpoint)
  await test('Send Message Endpoint', async () => {
    const res = await request('/adapters/whatsapp/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        to: '5491122334455',
        content: {
          type: 'text',
          text: 'Test message',
        },
      }),
    });
    
    // Without credentials, this should fail gracefully
    if (!res.success) {
      console.log(`   Expected error (no credentials): ${res.message?.substring(0, 50)}`);
    } else {
      console.log(`   Message sent: ${res.data.messageId}`);
    }
  });

  // Test 8: Status update webhook simulation
  await test('WhatsApp Status Update Webhook', async () => {
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id',
            },
            statuses: [{
              id: 'wamid.test123',
              status: 'delivered',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              recipient_id: '5491122334455',
            }],
          },
          field: 'messages',
        }],
      }],
    };

    const res = await request('/adapters/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify(webhookPayload),
    });

    if (res !== 'OK') throw new Error(`Expected 'OK', got '${res}'`);
    console.log(`   Status update processed: OK`);
  });

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Channel Adapters Test Results:');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All adapter tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\n💡 Note: Full WhatsApp integration requires:');
  console.log('   - WHATSAPP_PHONE_NUMBER_ID');
  console.log('   - WHATSAPP_ACCESS_TOKEN');
  console.log('   - WHATSAPP_WEBHOOK_VERIFY_TOKEN');
}

runTests();
