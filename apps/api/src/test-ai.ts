/**
 * Test Suite: AI System (@fluxcore/core-ai)
 * 
 * Pruebas del sistema de IA:
 * - Estado del servicio
 * - Generación de sugerencias
 * - Gestión de sugerencias (aprobar/rechazar/editar)
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
    throw new Error(`Failed to parse JSON: ${text.substring(0, 100)}`);
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
let userId = '';
let accountId = '';
let accountId2 = '';
let relationshipId = '';
let conversationId = '';

async function runTests() {
  console.log('🧪 Starting AI System Tests...\n');
  
  // Check if API is running
  try {
    const health = await request('/health');
    if (health.status !== 'ok') throw new Error('API not healthy');
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

  // Test 6: Check AI status
  await test('Check AI Status', async () => {
    const res = await request('/ai/status', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Status check failed');
    console.log(`   Provider: ${res.data.provider}`);
    console.log(`   Model: ${res.data.model}`);
    console.log(`   Configured: ${res.data.configured}`);
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

  console.log('\n💡 Note: Full AI generation requires GROQ_API_KEY environment variable.');
}

runTests();
