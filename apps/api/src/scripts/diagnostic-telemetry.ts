
import { sign } from 'jsonwebtoken';
import {
    db,
    aiTraces,
    conversations,
    messages,
    aiSuggestions,
    fluxcoreCognitionQueue,
    aiSignals,
    fluxcoreActionAudit,
    fluxcoreOutbox,
    chatcoreOutbox
} from '@fluxcore/db';
import { eq, desc, or, sql } from 'drizzle-orm';

// --- CONFIGURATION ---
const API_URL = 'http://127.0.0.1:3001';
const WS_URL = 'ws://127.0.0.1:3001/ws';
const JWT_SECRET = 'dev-secret-change-me';

// REAL IDs from current session
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr Jones
const SENDER_ACCOUNT_ID = '200322e7-4273-40b9-8491-77e1ab3a7bda';    // Visitor
const CONVERSATION_ID = '03b4d3e3-588d-4b21-b62d-17ca21c8e641';     // Active Conv

const messageText = 'PRUEBA_TELEMETRIA_V2';

async function main() {
    console.log(`\n🚀 STARTING TELEMETRY TRACE REPORTE (v2)`);
    console.log(`------------------------------------`);

    // 1. Generate JWT Token (Public Profile Style)
    const token = sign({ 
        type: 'public_profile', 
        ownerAccountId: RECIPIENT_ACCOUNT_ID,
        visitorToken: 'mock-visitor-token-' + Date.now(),
        visitorActorId: SENDER_ACCOUNT_ID,
        permissions: ['send_messages', 'read_messages']
    }, JWT_SECRET);
    
    console.log(`\n🔑 JWT generated`);

    // 2. Setup WebSocket
    console.log(`📡 Connecting to WS: ${WS_URL}`);
    const ws = new WebSocket(`${WS_URL}?token=${token}&accountId=${RECIPIENT_ACCOUNT_ID}`);

    let capturedSteps: any[] = [];
    let runtimePhases: Record<string, any> = {};

    const wsPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket timeout (30s)'));
        }, 30000);

        ws.onopen = () => {
            console.log(`✅ WebSocket connected`);
            ws.send(JSON.stringify({
                type: 'subscribe_telemetry',
                role: 'kernel_console',
                accountId: RECIPIENT_ACCOUNT_ID,
                conversationId: CONVERSATION_ID
            }));
        };

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data.toString());
            console.log(`[WS] Received type: ${data.type}`);
            
            if (data.type === 'error') {
                console.error(`[WS ERROR] ${data.message}`);
            }
            
            if (data.type === 'subscribed_telemetry') {
                console.log(`✅ Telemetry subscription active`);
                triggerMessage().catch(reject);
            }

            if (data.type === 'telemetry:pipeline_step') {
                const payload = data.payload;
                console.log(`📍 STEP: ${payload.step} (${payload.status})`);
                capturedSteps.push(payload);
                if (payload.step === 'worker' && payload.status === 'success') {
                    setTimeout(() => { ws.close(); resolve(true); }, 3000);
                }
            }

            if (data.type === 'telemetry:distributed_trace') {
                runtimePhases[data.payload.stepName] = data.payload;
            }
        };

        ws.onerror = (err: any) => reject(err);
    });

    async function triggerMessage() {
        console.log(`📤 Sending message...`);
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                conversationId: CONVERSATION_ID,
                content: { text: messageText }
            })
        });
        console.log(`✅ Message sent (Status: ${res.status})`);
    }

    try {
        await wsPromise;
        console.log(`\n📊 Generando Reporte Final...`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `auditoria_inteligente_${timestamp}.md`;
        const filePath = `./docs/reconstruction-phase-1/temp/${fileName}`;
        const fs = require('fs');
        
        let report = `# 🧠 Auditoría Inteligente\n\n## Pasos\n${capturedSteps.map(s => `- ${s.step}: ${s.status}`).join('\n')}`;
        fs.writeFileSync(filePath, report);
        console.log(`✨ REPORT CREATED: ${filePath}`);
    } catch (err: any) {
        console.error(`\n❌ Error:`, err.message);
    }
}

main().catch(console.error);
