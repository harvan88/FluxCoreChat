/**
 * Test Script para el Sistema de Extensiones (Hito 4)
 */

const API_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

// Test data
let authToken = '';
let userId = '';
let accountId = '';
const timestamp = Date.now();
const testEmail = `exttest${timestamp}@example.com`;

async function runTests() {
  console.log('🧪 Starting Extension System Tests...\n');

  // Check API is running
  try {
    const health = await request('/health');
    if (health.status !== 'ok') {
      throw new Error('API not healthy');
    }
    console.log('✅ API is running\n');
  } catch (error) {
    console.log('❌ API is not running. Please start the server first.');
    process.exit(1);
  }

  // Test 1: Register user
  await test('Register User', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'test123456',
        name: 'Extension Test User',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Registration failed');
    authToken = res.data.token;
    userId = res.data.user.id;
  });

  // Test 2: Create account
  await test('Create Account', async () => {
    const res = await request('/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        username: `extuser${timestamp}`,
        displayName: 'Extension Test Account',
        accountType: 'personal',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Account creation failed');
    accountId = res.data.id;
  });

  // Test 3: Get available extensions
  await test('Get Available Extensions', async () => {
    const res = await request('/extensions', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get extensions');
    if (!Array.isArray(res.data)) throw new Error('Expected array of extensions');
    if (res.data.length === 0) throw new Error('No extensions available');
    console.log(`   Found ${res.data.length} available extension(s)`);
    console.log(`   - ${res.data.map((e: any) => e.id).join(', ')}`);
  });

  // Test 4: Get extension manifest
  await test('Get Extension Manifest', async () => {
    const res = await request('/extensions/manifest/@fluxcore%2Fcore-ai');
    if (!res.success) throw new Error(res.message || 'Failed to get manifest');
    if (res.data.id !== '@fluxcore/core-ai') throw new Error('Wrong extension ID');
    console.log(`   Extension: ${res.data.name} v${res.data.version}`);
    console.log(`   Permissions: ${res.data.permissions.length}`);
  });

  // Test 5: Install extension
  await test('Install Extension', async () => {
    const res = await request('/extensions/install', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        accountId,
        extensionId: '@fluxcore/core-ai',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Installation failed');
    console.log(`   Installed: ${res.data.extensionId}`);
    console.log(`   Enabled: ${res.data.enabled}`);
  });

  // Test 6: Get installed extensions
  await test('Get Installed Extensions', async () => {
    const res = await request(`/extensions/installed/${accountId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get installed');
    if (!Array.isArray(res.data)) throw new Error('Expected array');
    if (res.data.length === 0) throw new Error('No installed extensions');
    console.log(`   Installed: ${res.data.length} extension(s)`);
  });

  // Test 7: Update extension config
  await test('Update Extension Config', async () => {
    const res = await request(`/extensions/${accountId}/${encodeURIComponent('@fluxcore/core-ai')}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        config: {
          mode: 'auto',
          responseDelay: 60,
        },
      }),
    });
    if (!res.success) throw new Error(res.message || 'Update failed');
    console.log(`   Config updated: mode=${res.data.config?.mode}`);
  });

  // Test 8: Disable extension
  await test('Disable Extension', async () => {
    const res = await request(`/extensions/${accountId}/${encodeURIComponent('@fluxcore/core-ai')}/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Disable failed');
    if (res.data.enabled !== false) throw new Error('Extension not disabled');
    console.log(`   Extension disabled`);
  });

  // Test 9: Enable extension
  await test('Enable Extension', async () => {
    const res = await request(`/extensions/${accountId}/${encodeURIComponent('@fluxcore/core-ai')}/enable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Enable failed');
    if (res.data.enabled !== true) throw new Error('Extension not enabled');
    console.log(`   Extension enabled`);
  });

  // Test 10: Uninstall extension
  await test('Uninstall Extension', async () => {
    const res = await request(`/extensions/${accountId}/${encodeURIComponent('@fluxcore/core-ai')}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Uninstall failed');
    console.log(`   Extension uninstalled`);
  });

  // Test 11: Verify uninstall
  await test('Verify Uninstall', async () => {
    const res = await request(`/extensions/installed/${accountId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to get installed');
    if (res.data.length !== 0) throw new Error('Extension still installed');
    console.log(`   No installed extensions (correct)`);
  });

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Extension System Test Results:');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All extension system tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\nTest Data:');
  console.log(`- User ID: ${userId}`);
  console.log(`- Account ID: ${accountId}`);
  console.log(`- Auth Token: ${authToken.substring(0, 30)}...`);
}

runTests().catch(console.error);
