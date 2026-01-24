
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: 'sk-dummy' });
console.log('--- OpenAI SDK v6 Introspection ---');
console.log('client keys:', Object.keys(client));
if (client.vectorStores) console.log('✅ client.vectorStores exists (Stable!)');
if (client.beta?.vectorStores) console.log('✅ client.beta.vectorStores exists');
if (client.beta) console.log('client.beta keys:', Object.keys(client.beta));
