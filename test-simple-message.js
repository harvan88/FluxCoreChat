const http = require('http');

const data = JSON.stringify({
  conversationId: '744c4c32-10fd-4275-bcdd-8eff9f2785a8',
  senderAccountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
  content: { text: 'Test message SIN DUPLICACION ' + Date.now() },
  type: 'outgoing'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('Response:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      if (parsed.success && parsed.data?.messageId) {
        console.log('✅ Message persisted with ID:', parsed.data.messageId);
      }
    } catch (e) {
      console.log('Failed to parse response');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
