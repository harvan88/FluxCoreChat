/**
 * Test Suite: AI System (@fluxcore/fluxcore)
 * 
 * Pruebas del sistema de IA:
 * - Estado del servicio
 * - Generación de sugerencias
 * - Gestión de sugerencias (aprobar/rechazar/editar)
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

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
    throw new Error(`Failed to parse JSON: ${text.substring(0, 100)}`);
  }
}

function getEnv(name: string): string | undefined {
  const v = (process.env as any)?.[name];
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function upsertAiEntitlements(targetAccountId: string, payload: any) {
  const internalKey = getEnv('INTERNAL_API_KEY');
  if (!internalKey) {
    return null;
  }

  const res = await request(`/internal/ai/entitlements/${targetAccountId}`, {
    method: 'PATCH',
    headers: {
      'x-internal-key': internalKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.success) {
    throw new Error(res.message || 'Failed to upsert AI entitlements');
  }

  return res.data;
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
let userId = '';
let accountId = '';
let accountId2 = '';
let relationshipId = '';
let conversationId = '';
let aiConfigured = false;
let aiConnected: boolean | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🧪 Starting AI System Tests...\n');
  
  // Check if API is running
  try {
    const health = await request('/health');
    if (health.status !== 'healthy' && health.status !== 'ok') throw new Error('API not healthy');
    console.log('✅ API is running\n');
  } catch (e) {
    console.log('❌ API is not running. Please start the server first.');
    process.exit(1);
  }

  // Test 1: Register user
  await test('Register User', async () => {
    const email = `testai${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'test123',
        name: 'AI Test User',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Registration failed');
    authToken = res.data.token;
    userId = res.data.user.id;
  });

  // Test 2: Create account 1
  await test('Create Account 1', async () => {
    const res = await request('/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        username: `aiuser1${Date.now()}`,
        displayName: 'AI User 1',
        accountType: 'personal',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Account creation failed');
    accountId = res.data.id;
  });

  // Test 3: Create account 2
  await test('Create Account 2', async () => {
    const res = await request('/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        username: `aiuser2${Date.now()}`,
        displayName: 'AI User 2',
        accountType: 'personal',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Account creation failed');
    accountId2 = res.data.id;
  });

  // Test 4: Create relationship
  await test('Create Relationship', async () => {
    const res = await request('/relationships', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        accountAId: accountId,
        accountBId: accountId2,
      }),
    });
    if (!res.success) throw new Error(res.message || 'Relationship creation failed');
    relationshipId = res.data.id;
  });

  // Test 5: Create conversation
  await test('Create Conversation', async () => {
    const res = await request('/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        relationshipId,
        channel: 'web',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Conversation creation failed');
    conversationId = res.data.id;
  });

  await test('Upsert AI entitlements for test accounts', async () => {
    if (!getEnv('INTERNAL_API_KEY')) {
      console.log('   Skipping: INTERNAL_API_KEY not set (entitlements upsert)');
      return;
    }

    await upsertAiEntitlements(accountId, {
      enabled: true,
      allowedProviders: ['groq', 'openai'],
      defaultProvider: 'groq',
    });

    await upsertAiEntitlements(accountId2, {
      enabled: true,
      allowedProviders: ['groq', 'openai'],
      defaultProvider: 'groq',
    });
  });

  // Test 6: Check AI status
  await test('Check AI Status', async () => {
    const res = await request(`/ai/status?accountId=${accountId2}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Status check failed');
    aiConfigured = Boolean(res.data?.configured);
    aiConnected = typeof res.data?.connected === 'boolean' ? res.data.connected : null;
    console.log(`   Entitled: ${res.data.entitled}`);
    console.log(`   Enabled: ${res.data.enabled}`);
    console.log(`   Provider: ${res.data.provider}`);
    console.log(`   Model: ${res.data.model}`);
    console.log(`   Configured: ${res.data.configured}`);
    console.log(`   Connected: ${res.data.connected}`);
  });

  // Test 7: Get pending suggestions (should be empty)
  await test('Get Pending Suggestions (Empty)', async () => {
    const res = await request(`/ai/suggestions/${conversationId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get suggestions');
    if (!Array.isArray(res.data)) throw new Error('Expected array');
    console.log(`   Pending suggestions: ${res.data.length}`);
  });

  // Test 8: Generate suggestion (may fail without API key)
  await test('Generate Suggestion Request', async () => {
    if (!aiConfigured) {
      console.log('   Skipping: no provider API keys configured (GROQ_API_KEY/OPENAI_API_KEY)');
      return;
    }

    const res = await request('/ai/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        conversationId,
        accountId,
        message: 'Hola, ¿cómo estás?',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Generation failed');
    // May return null if API key not configured
    if (res.data) {
      console.log(`   Suggestion ID: ${res.data.id}`);
      console.log(`   Content: ${res.data.content?.substring(0, 50)}...`);
    } else {
      console.log(`   Note: ${res.message || 'No suggestion generated (API not configured)'}`);
    }
  });

  await test('Configure Account 2 Automation: automatic', async () => {
    const res = await request('/automation/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        accountId: accountId2,
        mode: 'automatic',
      }),
    });

    if (!res.success) throw new Error(res.message || 'Failed to set automation rule');
  });

  await test('Set FluxCore responseDelay=0 for Account 2', async () => {
    const encodedExtId = encodeURIComponent('@fluxcore/fluxcore');
    const res = await request(`/extensions/${accountId2}/${encodedExtId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        config: {
          responseDelay: 0,
        },
      }),
    });

    if (!res.success) throw new Error(res.message || 'Failed to update FluxCore config');
  });

  await test('Auto-Reply: send message from Account 1 and wait AI reply from Account 2', async () => {
    if (!aiConfigured || aiConnected !== true) {
      console.log('   Skipping: AI not configured/connected. Set GROQ_API_KEY/OPENAI_API_KEY and ensure /ai/status connected=true');
      return;
    }

    const sendRes = await request('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        conversationId,
        senderAccountId: accountId,
        content: { text: 'Ping auto-reply test' },
        type: 'outgoing',
      }),
    });

    if (!sendRes.success) throw new Error(sendRes.message || 'Failed to send message');

    const startedAt = Date.now();
    const timeoutMs = 15000;
    const pollEveryMs = 750;

    while (Date.now() - startedAt < timeoutMs) {
      const msgsRes = await request(`/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!msgsRes.success) {
        throw new Error(msgsRes.message || 'Failed to fetch messages');
      }

      const list = msgsRes.data as any[];
      const hasAiReply = Array.isArray(list)
        ? list.some((m) => m?.senderAccountId === accountId2 && m?.generatedBy === 'ai')
        : false;

      if (hasAiReply) {
        return;
      }

      await sleep(pollEveryMs);
    }

    throw new Error('Timed out waiting for AI auto-reply. Check: GROQ_API_KEY validity, /ai/status connected=true, and automation rule for Account 2.');
  });

  // Test 9: Get suggestion (may not exist)
  await test('Get Suggestion by ID', async () => {
    const fakeId = crypto.randomUUID();
    const res = await request(`/ai/suggestion/${fakeId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    // Should return 404 for non-existent suggestion
    if (res.success) {
      console.log(`   Found suggestion: ${res.data.id}`);
    } else {
      console.log(`   Not found (expected for fake ID)`);
    }
  });

  // Test 10: Approve suggestion (test the endpoint)
  await test('Approve Suggestion Endpoint', async () => {
    const fakeId = crypto.randomUUID();
    const res = await request(`/ai/suggestion/${fakeId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    // Should return 404 for non-existent suggestion
    console.log(`   Response: ${res.success ? 'Approved' : 'Not found (expected)'}`);
  });

  // Test 11: Reject suggestion (test the endpoint)
  await test('Reject Suggestion Endpoint', async () => {
    const fakeId = crypto.randomUUID();
    const res = await request(`/ai/suggestion/${fakeId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`   Response: ${res.success ? 'Rejected' : 'Not found (expected)'}`);
  });

  // Test 12: Edit suggestion (test the endpoint)
  await test('Edit Suggestion Endpoint', async () => {
    const fakeId = crypto.randomUUID();
    const res = await request(`/ai/suggestion/${fakeId}/edit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        content: 'Edited content',
      }),
    });
    console.log(`   Response: ${res.success ? 'Edited' : 'Not found (expected)'}`);
  });

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 AI System Test Results:');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All AI system tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\nTest Data:');
  console.log(`- User ID: ${userId}`);
  console.log(`- Account ID: ${accountId}`);
  console.log(`- Conversation ID: ${conversationId}`);
  console.log(`- Auth Token: ${authToken.substring(0, 30)}...`);

  console.log('\n💡 Note: AI tests require INTERNAL_API_KEY (for entitlements) and GROQ_API_KEY and/or OPENAI_API_KEY (for provider calls).');
}

runTests();
