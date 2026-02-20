/**
 * Script de prueba para la API de autenticación
 * 
 * NOTA: Este script requiere que PostgreSQL esté corriendo y las migraciones aplicadas.
 * Para ejecutar:
 * 1. Asegúrate de tener PostgreSQL corriendo
 * 2. Configura DATABASE_URL en .env
 * 3. Ejecuta: bun run packages/db/src/migrate.ts
 * 4. Ejecuta: bun run src/test-api.ts
 */

const API_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function testRegister() {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        name: 'Test User',
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      results.push({
        name: 'Register User',
        success: true,
        message: 'User registered successfully',
        data: data.data,
      });
      return data.data;
    } else {
      results.push({
        name: 'Register User',
        success: false,
        message: data.message || 'Registration failed',
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      name: 'Register User',
      success: false,
      message: error.message,
    });
    return null;
  }
}

async function testLogin(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      results.push({
        name: 'Login User',
        success: true,
        message: 'User logged in successfully',
        data: data.data,
      });
      return data.data;
    } else {
      results.push({
        name: 'Login User',
        success: false,
        message: data.message || 'Login failed',
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      name: 'Login User',
      success: false,
      message: error.message,
    });
    return null;
  }
}

async function testCreateAccount(token: string) {
  try {
    const response = await fetch(`${API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: `testuser${Date.now()}`,
        displayName: 'Test Account',
        accountType: 'personal',
        profile: {
          bio: 'This is a test account',
        },
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      results.push({
        name: 'Create Account',
        success: true,
        message: 'Account created successfully',
        data: data.data,
      });
      return data.data;
    } else {
      results.push({
        name: 'Create Account',
        success: false,
        message: data.message || 'Account creation failed',
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      name: 'Create Account',
      success: false,
      message: error.message,
    });
    return null;
  }
}

async function testGetAccounts(token: string) {
  try {
    const response = await fetch(`${API_URL}/accounts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      results.push({
        name: 'Get Accounts',
        success: true,
        message: `Found ${data.data.length} accounts`,
        data: data.data,
      });
      return data.data;
    } else {
      results.push({
        name: 'Get Accounts',
        success: false,
        message: data.message || 'Failed to get accounts',
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      name: 'Get Accounts',
      success: false,
      message: error.message,
    });
    return null;
  }
}

async function testUpdateAccount(token: string, accountId: string) {
  try {
    const response = await fetch(`${API_URL}/accounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        displayName: 'Updated Test Account',
        privateContext: 'This is private context for testing',
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      results.push({
        name: 'Update Account',
        success: true,
        message: 'Account updated successfully',
        data: data.data,
      });
      return data.data;
    } else {
      results.push({
        name: 'Update Account',
        success: false,
        message: data.message || 'Account update failed',
      });
      return null;
    }
  } catch (error: any) {
    results.push({
      name: 'Update Account',
      success: false,
      message: error.message,
    });
    return null;
  }
}

async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  // Test 1: Register
  const registerData = await testRegister();
  if (!registerData) {
    console.log('❌ Registration failed, stopping tests');
    printResults();
    return;
  }

  // Test 2: Login
  const loginData = await testLogin(registerData.user.email, 'password123');
  if (!loginData) {
    console.log('❌ Login failed, stopping tests');
    printResults();
    return;
  }

  const token = loginData.token;

  // Test 3: Create Account
  const account = await testCreateAccount(token);

  // Test 4: Get Accounts
  await testGetAccounts(token);

  // Test 5: Update Account (if account was created)
  if (account) {
    await testUpdateAccount(token, account.id);
  }

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
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2).substring(0, 200));
    }
    console.log('');

    if (result.success) passed++;
    else failed++;
  });

  console.log('═'.repeat(60));
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}\n`);
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
