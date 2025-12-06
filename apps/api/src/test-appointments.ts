/**
 * Test Suite: Appointments System
 * 
 * Pruebas del sistema de turnos:
 * - Gestión de servicios
 * - Verificación de disponibilidad
 * - Creación y cancelación de turnos
 * - Ejecución de tools de IA
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
let businessAccountId = '';
let clientAccountId = '';
let serviceId = '';
let appointmentId = '';

async function runTests() {
  console.log('🧪 Starting Appointments System Tests...\n');
  
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
    const email = `testappt${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'test123',
        name: 'Appointments Test User',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Registration failed');
    authToken = res.data.token;
    userId = res.data.user.id;
  });

  // Test 2: Create business account
  await test('Create Business Account', async () => {
    const res = await request('/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        username: `peluqueria${Date.now()}`,
        displayName: 'Peluquería Test',
        accountType: 'business',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Account creation failed');
    businessAccountId = res.data.id;
    console.log(`   Business Account: ${res.data.username}`);
  });

  // Test 3: Create client account
  await test('Create Client Account', async () => {
    const res = await request('/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        username: `cliente${Date.now()}`,
        displayName: 'Cliente Test',
        accountType: 'personal',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Account creation failed');
    clientAccountId = res.data.id;
  });

  // Test 4: Create service
  await test('Create Service', async () => {
    const res = await request(`/appointments/${businessAccountId}/services`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Corte de pelo',
        description: 'Corte clásico o moderno',
        duration: 30,
        price: 5000,
      }),
    });
    if (!res.success) throw new Error(res.message || 'Service creation failed');
    serviceId = res.data.id;
    console.log(`   Service: ${res.data.name} (${res.data.duration} min)`);
  });

  // Test 5: List services
  await test('List Services', async () => {
    const res = await request(`/appointments/${businessAccountId}/services`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to list services');
    if (res.data.length === 0) throw new Error('No services found');
    console.log(`   Found ${res.data.length} service(s)`);
  });

  // Test 6: Check availability
  await test('Check Availability', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(
      `/appointments/${businessAccountId}/availability?date=${dateStr}&service=${serviceId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (!res.success) throw new Error(res.message || 'Failed to check availability');
    console.log(`   Available: ${res.data.available}`);
    console.log(`   Slots: ${res.data.slots?.length || 0}`);
  });

  // Test 7: Create appointment
  await test('Create Appointment', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(`/appointments/${businessAccountId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        clientAccountId,
        serviceId,
        date: dateStr,
        time: '10:00',
        notes: 'Primera visita',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to create appointment');
    appointmentId = res.data.id;
    console.log(`   Appointment ID: ${appointmentId}`);
    console.log(`   Status: ${res.data.status}`);
  });

  // Test 8: List appointments
  await test('List Appointments', async () => {
    const res = await request(`/appointments/${businessAccountId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to list appointments');
    if (res.data.length === 0) throw new Error('No appointments found');
    console.log(`   Found ${res.data.length} appointment(s)`);
  });

  // Test 9: Execute tool - check_availability
  await test('Execute Tool: check_availability', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(`/appointments/${businessAccountId}/tools/check_availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        date: dateStr,
        service: serviceId,
      }),
    });
    if (!res.success && !res.data) throw new Error(res.message || 'Tool execution failed');
    console.log(`   Tool result: ${res.message || res.data?.message}`);
  });

  // Test 10: Execute tool - get_appointments
  await test('Execute Tool: get_appointments', async () => {
    const res = await request(`/appointments/${businessAccountId}/tools/get_appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        accountId: clientAccountId,
      }),
    });
    if (!res.success) throw new Error(res.message || 'Tool execution failed');
    console.log(`   Found: ${res.data?.count || 0} appointment(s)`);
  });

  // Test 11: Cancel appointment
  await test('Cancel Appointment', async () => {
    const res = await request(`/appointments/${businessAccountId}/${appointmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        reason: 'Test cancellation',
      }),
    });
    if (!res.success) throw new Error(res.message || 'Failed to cancel appointment');
    console.log(`   Status: ${res.data.status}`);
  });

  // Test 12: Verify cancellation
  await test('Verify Cancellation', async () => {
    const res = await request(`/appointments/${businessAccountId}?status=cancelled`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.success) throw new Error(res.message || 'Failed to list appointments');
    const cancelled = res.data.find((a: any) => a.id === appointmentId);
    if (!cancelled) throw new Error('Cancelled appointment not found');
    if (cancelled.status !== 'cancelled') throw new Error('Status not cancelled');
    console.log(`   Verified: appointment is cancelled`);
  });

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Appointments System Test Results:');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All appointments system tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\nTest Data:');
  console.log(`- User ID: ${userId}`);
  console.log(`- Business Account: ${businessAccountId}`);
  console.log(`- Client Account: ${clientAccountId}`);
  console.log(`- Service ID: ${serviceId}`);
  console.log(`- Auth Token: ${authToken.substring(0, 30)}...`);
}

runTests();
