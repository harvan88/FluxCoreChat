/**
 * Test Suite: Workspaces
 * 
 * Pruebas del sistema de workspaces colaborativos:
 * - Crear workspace
 * - Gestión de miembros
 * - Roles y permisos
 * - Invitaciones
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
  return res.json();
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
let authToken1 = '';
let authToken2 = '';
let userId1 = '';
let userId2 = '';
let accountId = '';
let workspaceId = '';
let invitationToken = '';

async function runTests() {
  console.log('🧪 Starting Workspaces Tests...\n');
  
  // Check if API is running
  try {
    const health = await request('/health');
    if (health.status !== 'ok') throw new Error('API not healthy');
    console.log('✅ API is running\n');
  } catch (e) {
    console.log('❌ API is not running. Please start the server first.');
    process.exit(1);
  }

  // Test 1: Register User 1 (Owner)
  await test('Register User 1 (Owner)', async () => {
    const email = `wsowner${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'test123',
        name: 'Workspace Owner',
      }),
    });
    if (!res.success) throw new Error(res.message);
    authToken1 = res.data.token;
    userId1 = res.data.user.id;
    console.log(`   User 1: ${email}`);
  });

  // Test 2: Register User 2 (Member)
  await test('Register User 2 (Member)', async () => {
    const email = `wsmember${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'test123',
        name: 'Workspace Member',
      }),
    });
    if (!res.success) throw new Error(res.message);
    authToken2 = res.data.token;
    userId2 = res.data.user.id;
    console.log(`   User 2: ${email}`);
  });

  // Test 3: Create Business Account
  await test('Create Business Account', async () => {
    const res = await request('/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        username: `business${Date.now()}`,
        displayName: 'Test Business',
        accountType: 'business',
      }),
    });
    if (!res.success) throw new Error(res.message);
    accountId = res.data.id;
    console.log(`   Account: ${res.data.username}`);
  });

  // Test 4: Create Workspace
  await test('Create Workspace', async () => {
    const res = await request('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        accountId,
        name: 'Test Workspace',
        description: 'Workspace for testing',
      }),
    });
    if (!res.success) throw new Error(res.message);
    workspaceId = res.data.id;
    console.log(`   Workspace ID: ${workspaceId}`);
  });

  // Test 5: Get Workspaces
  await test('Get User Workspaces', async () => {
    const res = await request('/workspaces', {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    if (res.data.length === 0) throw new Error('No workspaces found');
    console.log(`   Found ${res.data.length} workspace(s)`);
    console.log(`   Role: ${res.data[0].role}`);
  });

  // Test 6: Get Workspace By ID
  await test('Get Workspace By ID', async () => {
    const res = await request(`/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    if (res.data.role !== 'owner') throw new Error('Expected owner role');
    console.log(`   Name: ${res.data.name}`);
    console.log(`   Role: ${res.data.role}`);
  });

  // Test 7: Update Workspace
  await test('Update Workspace', async () => {
    const res = await request(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        name: 'Updated Workspace Name',
        description: 'Updated description',
      }),
    });
    if (!res.success) throw new Error(res.message);
    console.log(`   New name: ${res.data.name}`);
  });

  // Test 8: Get Members (initially just owner)
  await test('Get Members (Owner Only)', async () => {
    const res = await request(`/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    if (res.data.length !== 1) throw new Error('Expected 1 member');
    console.log(`   Members: ${res.data.length}`);
    console.log(`   Owner: ${res.data[0].user.name}`);
  });

  // Test 9: Add Member Directly
  await test('Add Member Directly', async () => {
    const res = await request(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        userId: userId2,
        role: 'operator',
      }),
    });
    if (!res.success) throw new Error(res.message);
    console.log(`   Added user as: ${res.data.role}`);
  });

  // Test 10: Get Members (now 2)
  await test('Get Members (2 Members)', async () => {
    const res = await request(`/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    if (res.data.length !== 2) throw new Error('Expected 2 members');
    console.log(`   Members: ${res.data.length}`);
  });

  // Test 11: Update Member Role
  await test('Update Member Role', async () => {
    const res = await request(`/workspaces/${workspaceId}/members/${userId2}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        role: 'admin',
      }),
    });
    if (!res.success) throw new Error(res.message);
    if (res.data.role !== 'admin') throw new Error('Role not updated');
    console.log(`   New role: ${res.data.role}`);
  });

  // Test 12: User 2 can now access workspace
  await test('Member Access Workspace', async () => {
    const res = await request(`/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${authToken2}` },
    });
    if (!res.success) throw new Error(res.message);
    console.log(`   Member role: ${res.data.role}`);
  });

  // Test 13: Create Invitation
  await test('Create Invitation', async () => {
    const res = await request(`/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken1}` },
      body: JSON.stringify({
        email: `newinvite${Date.now()}@example.com`,
        role: 'viewer',
      }),
    });
    if (!res.success) throw new Error(res.message);
    invitationToken = res.data.token;
    console.log(`   Invitation created for: ${res.data.email}`);
    console.log(`   Token: ${invitationToken.substring(0, 10)}...`);
  });

  // Test 14: Get Pending Invitations
  await test('Get Pending Invitations', async () => {
    const res = await request(`/workspaces/${workspaceId}/invitations`, {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    console.log(`   Pending invitations: ${res.data.length}`);
  });

  // Test 15: Remove Member
  await test('Remove Member', async () => {
    const res = await request(`/workspaces/${workspaceId}/members/${userId2}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    console.log(`   Member removed`);
  });

  // Test 16: Verify member removed
  await test('Verify Member Removed', async () => {
    const res = await request(`/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${authToken1}` },
    });
    if (!res.success) throw new Error(res.message);
    if (res.data.length !== 1) throw new Error('Expected 1 member after removal');
    console.log(`   Members remaining: ${res.data.length}`);
  });

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Workspaces Test Results:');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All workspace tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\nTest Data:');
  console.log(`- User 1 (Owner): ${userId1}`);
  console.log(`- User 2 (Member): ${userId2}`);
  console.log(`- Account ID: ${accountId}`);
  console.log(`- Workspace ID: ${workspaceId}`);
}

runTests();
