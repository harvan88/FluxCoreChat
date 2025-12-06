/**
 * Test Suite: Relationship Context
 * 
 * Pruebas del sistema de contexto relacional:
 * - Agregar/editar/eliminar entradas de contexto
 * - Validación de límite de 2000 caracteres
 * - Perspectivas bilaterales
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

async function runTests() {
  console.log('🧪 Starting Relationship Context Tests...\n');
  
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
    const email = `testctx${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'test123',
        name: 'Context Test User',
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
        username: `ctxuser1${Date.now()}`,
        displayName: 'Context User 1',
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
        username: `ctxuser2${Date.now()}`,
        displayName: 'Context User 2',
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

  // Test 5: Get initial context (empty)
  await test('Get Initial Context (Empty)', async () => {
    const res = await request(`/context/${relationshipId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get context');
    if (res.data.entries.length !== 0) throw new Error('Expected empty entries');
    console.log(`   Entries: ${res.data.entries.length}, Chars: ${res.data.total_chars}/2000`);
  });

  // Test 6: Add note entry
  await test('Add Note Entry', async () => {
    const res = await request(`/context/${relationshipId}/entries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        authorAccountId: accountId,
        content: 'Cliente VIP desde 2020',
        type: 'note',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to add entry');
    console.log(`   Entry added. Chars: ${res.data.total_chars}/2000`);
  });

  // Test 7: Add preference entry
  await test('Add Preference Entry', async () => {
    const res = await request(`/context/${relationshipId}/entries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        authorAccountId: accountId,
        content: 'Prefiere contacto por WhatsApp',
        type: 'preference',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to add entry');
    console.log(`   Entry added. Chars: ${res.data.total_chars}/2000`);
  });

  // Test 8: Add rule entry
  await test('Add Rule Entry', async () => {
    const res = await request(`/context/${relationshipId}/entries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        authorAccountId: accountId2,
        content: 'Si cancela, ofrecer 10% descuento',
        type: 'rule',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to add entry');
    console.log(`   Entry added. Entries: ${res.data.entries.length}`);
  });

  // Test 9: Get context with entries
  await test('Get Context With Entries', async () => {
    const res = await request(`/context/${relationshipId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get context');
    if (res.data.entries.length !== 3) throw new Error(`Expected 3 entries, got ${res.data.entries.length}`);
    console.log(`   Entries: ${res.data.entries.length}`);
    console.log(`   Chars used: ${res.data.charLimit.used}/${res.data.charLimit.max}`);
  });

  // Test 10: Update entry
  await test('Update Entry', async () => {
    const res = await request(`/context/${relationshipId}/entries/0`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        content: 'Cliente VIP premium desde 2020',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to update entry');
    console.log(`   Entry updated. Chars: ${res.data.total_chars}/2000`);
  });

  // Test 11: Delete entry
  await test('Delete Entry', async () => {
    const res = await request(`/context/${relationshipId}/entries/2`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to delete entry');
    if (res.data.entries.length !== 2) throw new Error('Entry not deleted');
    console.log(`   Entry deleted. Entries: ${res.data.entries.length}`);
  });

  // Test 12: Get character limit
  await test('Get Character Limit', async () => {
    const res = await request(`/context/${relationshipId}/chars`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get char limit');
    console.log(`   Used: ${res.data.used}, Available: ${res.data.available}, Max: ${res.data.max}`);
  });

  // Test 13: Get perspective
  await test('Get Perspective', async () => {
    const res = await request(`/context/${relationshipId}/perspective/${accountId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get perspective');
    console.log(`   Saved name: ${res.data.saved_name || '(none)'}`);
    console.log(`   Tags: ${res.data.tags.length}`);
    console.log(`   Status: ${res.data.status}`);
  });

  // Test 14: Update perspective - saved name
  await test('Update Perspective - Saved Name', async () => {
    const res = await request(`/context/${relationshipId}/perspective/${accountId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        savedName: 'Mi mejor cliente',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to update perspective');
    if (res.data.saved_name !== 'Mi mejor cliente') throw new Error('Saved name not updated');
    console.log(`   Saved name: ${res.data.saved_name}`);
  });

  // Test 15: Update perspective - tags
  await test('Update Perspective - Tags', async () => {
    const res = await request(`/context/${relationshipId}/perspective/${accountId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        tags: ['vip', 'frecuente', 'premium'],
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to update perspective');
    if (res.data.tags.length !== 3) throw new Error('Tags not updated');
    console.log(`   Tags: ${res.data.tags.join(', ')}`);
  });

  // Test 16: Test char limit validation
  await test('Validate Character Limit', async () => {
    // Try to add a very long entry
    const longContent = 'x'.repeat(3000);
    const res = await request(`/context/${relationshipId}/entries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        authorAccountId: accountId,
        content: longContent,
        type: 'note',
      }),
    });
    if (res.success) throw new Error('Should have rejected long entry');
    console.log(`   Correctly rejected: ${res.message}`);
  });

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Relationship Context Test Results:');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All context tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\nTest Data:');
  console.log(`- User ID: ${userId}`);
  console.log(`- Account ID: ${accountId}`);
  console.log(`- Relationship ID: ${relationshipId}`);
  console.log(`- Auth Token: ${authToken.substring(0, 30)}...`);
}

runTests();
