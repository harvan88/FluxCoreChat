
import { sign } from 'jsonwebtoken';
import {
    db,
    messages
} from '@fluxcore/db';
import { eq, desc, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
const API_URL = 'http://127.0.0.1:3001';
const WS_URL = 'ws://127.0.0.1:3001/ws';
const JWT_SECRET = 'dev-secret-change-me';

// IDs Reales
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr Jones
const SENDER_ACCOUNT_ID = '200322e7-4273-40b9-8491-77e1ab3a7bda';    // Visitante
const CONVERSATION_ID = '03b4d3e3-588d-4b21-b62d-17ca21c8e641';     // Conv Activa

const messageText = process.argv[2] || 'Prueba de duplicación ' + Date.now();

async function main() {
    console.log(`\n🚀 INICIANDO AUDITORÍA SOBERANA (v2)`);
    console.log(`----------------------------------------------------------------`);

    const token = sign({ userId: 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe', email: 'harvan@hotmail.es' }, JWT_SECRET);
    const ws = new WebSocket(`${WS_URL}?token=${token}&accountId=${RECIPIENT_ACCOUNT_ID}`);

    let capturedSteps: any[] = [];
    let runtimePhases: Record<string, any> = {};
    let aiTraceData: any = null;

    const wsPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { ws.close(); reject(new Error('WebSocket timeout (30s)')); }, 30000);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'subscribe_telemetry',
                role: 'kernel_console',
                accountId: RECIPIENT_ACCOUNT_ID,
                conversationId: CONVERSATION_ID
            }));
        };

        ws.onmessage = (event: any) => {
            const data = JSON.parse(event.data.toString());
            if (data.type === 'subscribed_telemetry') {
                ws.send(JSON.stringify({ type: 'toggle_persistence', accountId: RECIPIENT_ACCOUNT_ID, content: true }));
                setTimeout(() => triggerMessage().catch(reject), 500);
            }
            if (data.type === 'telemetry:pipeline_step') {
                capturedSteps.push(data.payload);
                console.log(`📍 STEP: ${data.payload.step} (${data.payload.status})`);
                if (data.payload.step === 'worker' && data.payload.status === 'success') {
                    setTimeout(() => { ws.close(); resolve(true); }, 5000);
                }
            }
            if (data.type === 'telemetry:distributed_trace') {
                runtimePhases[data.payload.stepName] = data.payload;
                if (data.payload.stepName === 'IA_RUNTIME_INVOCATION' && data.payload.stepStatus === 'completed') aiTraceData = data.payload;
            }
        };
        ws.onerror = (err: any) => reject(err);
    });

    async function triggerMessage() {
        await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ conversationId: CONVERSATION_ID, content: { text: messageText }, senderAccountId: SENDER_ACCOUNT_ID, type: 'incoming' })
        });
    }

    try {
        await wsPromise;
        await generateReport(capturedSteps, runtimePhases, aiTraceData);
    } catch (err: any) { console.error(`\n❌ Error:`, err.message); }
}

async function generateReport(steps: any[], phases: Record<string, any>, aiData: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `reporte_soberania_fluxi_${timestamp}.md`;
    const reportDir = path.resolve('C:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/docs/reconstruction-phase-1/temp');
    const filePath = path.join(reportDir, fileName);

    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    let report = `# 🧠 Reporte de Soberanía Cognitiva\n- **Mensaje**: "${messageText}"\n\n## Trace\n${steps.map(s => `- **${s.step}**: ${s.status}`).join('\n')}\n\n## Fases\n`;
    Object.keys(phases).forEach(p => { report += `### 📍 ${p}\n\`\`\`json\n${JSON.stringify(phases[p].output, null, 2)}\n\`\`\`\n\n`; });

    fs.writeFileSync(filePath, report);
    console.log(`\n✨ REPORT CREATED: ${filePath}`);
    process.exit(0);
}

main().catch(console.error);
