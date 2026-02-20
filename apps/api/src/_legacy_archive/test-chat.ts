/**
 * Script de prueba para el sistema de chat
 * 
 * NOTA: Requiere PostgreSQL corriendo y migraciones aplicadas
 * Para ejecutar:
 * 1. Asegúrate de tener PostgreSQL corriendo
 * 2. Aplica migraciones: bun run packages/db/src/migrate.ts
 * 3. Inicia el servidor: bun run dev
 * 4. Ejecuta: bun run apps/api/src/test-chat.ts
 */

const API_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];
let authToken = '';
let userId = '';
let accountId = '';
let secondAccountId = '';
let relationshipId = '';
let conversationId = '';

async function testRegisterAndLogin() {
  try {
    // Register
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `testchat${Date.now()}@example.com`,
        password: 'password123',
        name: 'Chat Test User',
      }),
    });

    const registerData = await registerRes.json();
    if (!registerData.success) {
      results.push({ name: 'Register User', success: false, message: registerData.message });
      return null;
    }

    authToken = registerData.data.token;
    userId = registerData.data.user.id;

    results.push({ name: 'Register User', success: true, message: 'User registered', data: registerData.data.user });
    return registerData.data;
  } catch (error: any) {
    results.push({ name: 'Register User', success: false, message: error.message });
    return null;
  }
}

async function testCreateAccounts() {
  try {
    // Create first account
    const res1 = await fetch(`${API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        username: `chatuser${Date.now()}`,
        displayName: 'Chat User 1',
        accountType: 'personal',
      }),
    });

    const data1 = await res1.json();
    if (!data1.success) {
      results.push({ name: 'Create Account 1', success: false, message: data1.message });
      return false;
    }

    accountId = data1.data.id;
    results.push({ name: 'Create Account 1', success: true, message: 'Account created', data: data1.data });

    // Create second account
    const res2 = await fetch(`${API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        username: `chatuser2${Date.now()}`,
        displayName: 'Chat User 2',
        accountType: 'business',
      }),
    });

    const data2 = await res2.json();
    if (!data2.success) {
      results.push({ name: 'Create Account 2', success: false, message: data2.message });
      return false;
    }

    secondAccountId = data2.data.id;
    results.push({ name: 'Create Account 2', success: true, message: 'Account created', data: data2.data });

    return true;
  } catch (error: any) {
    results.push({ name: 'Create Accounts', success: false, message: error.message });
    return false;
  }
}

async function testCreateRelationship() {
  try {
    const res = await fetch(`${API_URL}/relationships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        accountAId: accountId,
        accountBId: secondAccountId,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      results.push({ name: 'Create Relationship', success: false, message: data.message });
      return false;
    }

    relationshipId = data.data.id;
    results.push({ name: 'Create Relationship', success: true, message: 'Relationship created', data: data.data });
    return true;
  } catch (error: any) {
    results.push({ name: 'Create Relationship', success: false, message: error.message });
    return false;
  }
}

async function testAddContextEntry() {
  try {
    const res = await fetch(`${API_URL}/relationships/${relationshipId}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        authorAccountId: accountId,
        content: 'This is a test context entry for the relationship',
        type: 'note',
      }),
    });

    const data = await res.json();
    if (!data.success) {
      results.push({ name: 'Add Context Entry', success: false, message: data.message });
      return false;
    }

    results.push({ name: 'Add Context Entry', success: true, message: 'Context added' });
    return true;
  } catch (error: any) {
    results.push({ name: 'Add Context Entry', success: false, message: error.message });
    return false;
  }
}

async function testCreateConversation() {
  try {
    const res = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        relationshipId: relationshipId,
        channel: 'web',
      }),
    });

    const data = await res.json();
    if (!data.success) {
      results.push({ name: 'Create Conversation', success: false, message: data.message });
      return false;
    }

    conversationId = data.data.id;
    results.push({ name: 'Create Conversation', success: true, message: 'Conversation created', data: data.data });
    return true;
  } catch (error: any) {
    results.push({ name: 'Create Conversation', success: false, message: error.message });
    return false;
  }
}

async function testSendMessage() {
  try {
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        conversationId: conversationId,
        senderAccountId: accountId,
        content: {
          text: 'Hello! This is a test message from the chat system.',
        },
        type: 'outgoing',
      }),
    });

    const data = await res.json();
    if (!data.success) {
      results.push({ name: 'Send Message', success: false, message: data.message });
      return false;
    }

    results.push({ name: 'Send Message', success: true, message: 'Message sent', data: data.data });
    return true;
  } catch (error: any) {
    results.push({ name: 'Send Message', success: false, message: error.message });
    return false;
  }
}

async function testGetMessages() {
  try {
    const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await res.json();
    if (!data.success) {
      results.push({ name: 'Get Messages', success: false, message: data.message });
      return false;
    }

    results.push({ 
      name: 'Get Messages', 
      success: true, 
      message: `Found ${data.data.length} messages`,
      data: data.data 
    });
    return true;
  } catch (error: any) {
    results.push({ name: 'Get Messages', success: false, message: error.message });
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Chat System Tests...\n');

  // Test 1: Register and Login
  const userData = await testRegisterAndLogin();
  if (!userData) {
    printResults();
    return;
  }

  // Test 2: Create Accounts
  const accountsCreated = await testCreateAccounts();
  if (!accountsCreated) {
    printResults();
    return;
  }

  // Test 3: Create Relationship
  const relationshipCreated = await testCreateRelationship();
  if (!relationshipCreated) {
    printResults();
    return;
  }

  // Test 4: Add Context Entry
  await testAddContextEntry();

  // Test 5: Create Conversation
  const conversationCreated = await testCreateConversation();
  if (!conversationCreated) {
    printResults();
    return;
  }

  // Test 6: Send Message
  await testSendMessage();

  // Test 7: Get Messages
  await testGetMessages();

  printResults();
}

function printResults() {
  console.log('\n📊 Test Results:\n');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.data && typeof result.data === 'object') {
      const preview = JSON.stringify(result.data, null, 2).substring(0, 150);
      console.log(`   Data: ${preview}${preview.length >= 150 ? '...' : ''}`);
    }
    console.log('');

    if (result.success) passed++;
    else failed++;
  });

  console.log('═'.repeat(60));
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}\n`);

  if (passed === results.length) {
    console.log('🎉 All tests passed!\n');
    console.log('Test Data:');
    console.log(`- User ID: ${userId}`);
    console.log(`- Account ID: ${accountId}`);
    console.log(`- Second Account ID: ${secondAccountId}`);
    console.log(`- Relationship ID: ${relationshipId}`);
    console.log(`- Conversation ID: ${conversationId}`);
    console.log(`- Auth Token: ${authToken.substring(0, 20)}...`);
  }
}

// Check if API is running
fetch(`${API_URL}/health`)
  .then(() => {
    console.log('✅ API is running\n');
    runTests();
  })
  .catch(() => {
    console.log('❌ API is not running. Please start the API first with: bun run dev');
    process.exit(1);
  });
