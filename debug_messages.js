const baseUrl = 'http://localhost:3000';
const alias = 'harvan_mkokevb2';
const visitorToken = 'test-token-123';

async function test() {
  console.log(`--- Getting session for ${alias} ---`);
  const sessionRes = await fetch(`${baseUrl}/public/profiles/${alias}/session?visitorToken=${visitorToken}`);
  console.log(`Status: ${sessionRes.status}`);
  const sessionData = await sessionRes.json();
  console.log(JSON.stringify(sessionData, null, 2));

  if (!sessionData.success) {
    console.error('Failed to get session');
    return;
  }

  const { publicToken, conversationId } = sessionData.data;

  console.log(`\n--- Loading messages for conversation ${conversationId} ---`);
  const messagesRes = await fetch(`${baseUrl}/messages?conversationId=${conversationId}&limit=50`, {
    headers: {
      'Authorization': `Bearer ${publicToken}`
    }
  });
  console.log(`Status: ${messagesRes.status}`);
  try {
    const messagesData = await messagesRes.json();
    console.log(JSON.stringify(messagesData, null, 2));
  } catch (e) {
    const text = await messagesRes.text();
    console.log(`Response (not JSON): ${text}`);
  }
}

test();
