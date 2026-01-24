
import OpenAI from 'openai';

console.log('Checking OpenAI SDK structure...');
try {
    const client = new OpenAI({ apiKey: 'sk-dummy' });
    console.log('Client created.');

    if (client.beta) {
        console.log('✅ client.beta exists');
        if (client.beta.vectorStores) {
            console.log('✅ client.beta.vectorStores exists');
        } else {
            console.error('❌ client.beta.vectorStores MISSING');
            console.log('Beta keys:', Object.keys(client.beta));
        }
    } else {
        console.error('❌ client.beta MISSING');
        console.log('Client keys:', Object.keys(client));
    }
} catch (e) {
    console.error('Error instantiating client:', e);
}
