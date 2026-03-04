const http = require('http');

const data = JSON.stringify({
  conversationId: '744c4c32-10fd-4275-bcdd-8eff9f2785a8',
  senderAccountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
  content: { text: 'Test message para debug ' + Date.now() },
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
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50SWQiOiJjNzQzOWQ2YS03ZTQ2LTRlODQtYTRkNmQ3M2JlYTNjYjVmZSIsInVzZXJJZCI6ImM3NDM5ZDZhLTdlNDYtNGU4NC1hNGQ2LWQ3M2JlYTNjYjVmZSIsImlhdCI6MTczODA5MjQ4MiwiZXhwIjoxNzM4MDk2MDgyfQ.L_oY3pKxUe3vL2ON7Yqk4Qn6qC6FpJpZGjX9I0xQ3o'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
