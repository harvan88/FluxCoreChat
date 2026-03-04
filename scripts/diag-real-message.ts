#!/usr/bin/env bun
/**
 * Diagnóstico: envía un mensaje real via POST /messages (igual que el web UI)
 * Incluye login para obtener JWT de Harold
 */
const API_URL = 'http://localhost:3000';
const HAROLD_EMAIL = 'harvan@hotmail.es';
const HAROLD_PASS = process.env.HAROLD_PASSWORD || 'test123'; // ajustar si es diferente
const CONV_ID = '1d568459-d4b3-47e2-8571-af7c0bd43fd3';
const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('═══════════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO: Mensaje real via POST /messages (web UI sim)');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Login como Harold para obtener JWT
console.log('🔑 Obteniendo token de Harold...');
const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: HAROLD_EMAIL, password: HAROLD_PASS }),
});

if (!loginRes.ok) {
    const body = await loginRes.text();
    console.error(`❌ Login falló: HTTP ${loginRes.status}: ${body}`);
    console.log('   Intenta con: bun run scripts/diag-real-message.ts HAROLD_PASSWORD=<pass>');
    process.exit(1);
}

const loginData = await loginRes.json() as any;
const token = loginData.token || loginData.data?.token || loginData.access_token;
if (!token) {
    console.error('❌ No token en respuesta:', JSON.stringify(loginData).slice(0, 200));
    process.exit(1);
}
console.log('✅ Token obtenido\n');

// 2. Enviar mensaje vía POST /messages (exactamente como el web UI)
console.log('📤 Enviando mensaje via POST /messages con type=outgoing...');
const msgRes = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
        conversationId: CONV_ID,
        senderAccountId: HAROLD_ACCOUNT_ID,
        content: { text: 'Diagnóstico: mensaje desde UI simulado' },
        type: 'outgoing',
        generatedBy: 'human',
    }),
});

const msgData = await msgRes.json() as any;
console.log(`   HTTP ${msgRes.status}: ${JSON.stringify(msgData)}`);

if (!msgRes.ok) {
    console.error('❌ Mensaje rechazado. Ver logs del servidor.');
    process.exit(1);
}

console.log('✅ Mensaje enviado. Esperando 5s para ver si la queue recibe el turno...\n');
await new Promise(r => setTimeout(r, 5000));

// 3. Verificar cognition queue
const { db, fluxcoreCognitionQueue } = await import('@fluxcore/db');
const { eq, gt, desc } = await import('drizzle-orm');

const [lastEntry] = await db
    .select()
    .from(fluxcoreCognitionQueue)
    .where(eq(fluxcoreCognitionQueue.conversationId, CONV_ID))
    .orderBy(desc(fluxcoreCognitionQueue.id))
    .limit(1);

if (lastEntry) {
    const status = lastEntry.processedAt ? '✅ processed' : '⏳ pending';
    console.log(`Cognition queue entry: id=${lastEntry.id} | ${status}`);
    console.log(`  expires_at: ${lastEntry.turnWindowExpiresAt}`);
    console.log(`  processed_at: ${lastEntry.processedAt ?? 'null'}`);
} else {
    console.log('❌ No hay ninguna entrada en cognition queue para esta conversación.');
}

console.log('\n👆 Revisar logs del servidor para ver [MessageDispatch] 📨 con gate=true/false');
process.exit(0);
