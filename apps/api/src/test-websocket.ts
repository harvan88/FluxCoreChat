/**
 * Script de prueba para WebSocket
 * 
 * Ejecutar: bun run apps/api/src/test-websocket.ts
 */

const WS_URL = 'ws://localhost:3000/ws';

async function testWebSocket() {
  console.log('🧪 Starting WebSocket Tests...\n');

  const ws = new WebSocket(WS_URL);

  let testsPassed = 0;
  let testsFailed = 0;

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      console.log('\n⏱️ Test timeout - closing connection');
      ws.close();
      printResults();
      resolve();
    }, 10000);

    ws.onopen = () => {
      console.log('✅ WebSocket connected\n');
      testsPassed++;

      // Test 1: Ping
      console.log('📤 Sending ping...');
      ws.send(JSON.stringify({ type: 'ping' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📥 Received:', JSON.stringify(data, null, 2));

      switch (data.type) {
        case 'connected':
          console.log('✅ Connection confirmed\n');
          testsPassed++;
          break;

        case 'pong':
          console.log('✅ Pong received\n');
          testsPassed++;
          
          // Test 2: Subscribe to a fake relationship
          console.log('📤 Subscribing to relationship...');
          ws.send(JSON.stringify({ 
            type: 'subscribe', 
            relationshipId: 'test-relationship-123' 
          }));
          break;

        case 'subscribed':
          console.log('✅ Subscription confirmed\n');
          testsPassed++;

          // Test 3: Unsubscribe
          console.log('📤 Unsubscribing...');
          ws.send(JSON.stringify({ 
            type: 'unsubscribe', 
            relationshipId: 'test-relationship-123' 
          }));
          break;

        case 'unsubscribed':
          console.log('✅ Unsubscription confirmed\n');
          testsPassed++;

          // Test 4: Invalid message type
          console.log('📤 Sending invalid message type...');
          ws.send(JSON.stringify({ type: 'invalid' }));
          break;

        case 'error':
          if (data.message === 'Unknown message type') {
            console.log('✅ Error handling works correctly\n');
            testsPassed++;
          } else {
            console.log('❌ Unexpected error:', data.message);
            testsFailed++;
          }

          // All tests done
          clearTimeout(timeout);
          ws.close();
          printResults();
          resolve();
          break;
      }
    };

    ws.onerror = (error) => {
      console.log('❌ WebSocket error:', error);
      testsFailed++;
    };

    ws.onclose = () => {
      console.log('\n🔌 WebSocket connection closed');
    };

    function printResults() {
      console.log('\n' + '═'.repeat(50));
      console.log('📊 WebSocket Test Results:');
      console.log('═'.repeat(50));
      console.log(`✅ Passed: ${testsPassed}`);
      console.log(`❌ Failed: ${testsFailed}`);
      console.log(`📈 Total: ${testsPassed + testsFailed}`);
      
      if (testsFailed === 0 && testsPassed >= 5) {
        console.log('\n🎉 All WebSocket tests passed!');
      }
    }
  });
}

// Verificar que el servidor esté corriendo
fetch('http://localhost:3000/health')
  .then(() => {
    console.log('✅ API is running\n');
    return testWebSocket();
  })
  .catch(() => {
    console.log('❌ API is not running. Please start the API first with: bun run dev');
    process.exit(1);
  });
