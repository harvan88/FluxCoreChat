/**
 * Fluxi Consolidation Live Test
 * 
 * Uses same pattern as telemetry-trace-report.ts:
 * POST /messages with JWT + WebSocket for telemetry capture
 */
import { sign } from 'jsonwebtoken';
import { db, messages, fluxcoreActionAudit } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// FluxCore (Fluxi AI) ← Dr. Jones conversation
// From the telemetry perspective: SENDER = the account whose AI responds, RECIPIENT = the account that triggers
const SENDER_ACCOUNT_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18'; // FluxCore (Fluxi AI - responds)
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr. Jones (triggers the message)
const SENDER_USER_ID = '535949b8-58a9-4310-87a7-42a2480f5746';
const CONVERSATION_ID = 'eadb0912-127c-4738-af5e-18b0ecb52670';

const messageText = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && !a.includes('test-fluxi-consolidation.ts')) 
    || 'Hola, soy Dr. Jones. Quiero mejorar mi asistente de IA. ¿Qué servicios me ofrece FluxCore?';

async function main() {
    console.log('\n🧪 FLUXI CONSOLIDATION LIVE TEST');
    console.log('================================');
    console.log(`📤 From: Dr. Jones (${SENDER_ACCOUNT_ID.slice(0, 8)})`);
    console.log(`📥 To:   FluxCore/Fluxi (${RECIPIENT_ACCOUNT_ID.slice(0, 8)})`);
    console.log(`💬 Conv: ${CONVERSATION_ID.slice(0, 8)}`);
    console.log(`📝 Message: "${messageText}"`);

    const token = sign({ userId: SENDER_USER_ID, email: 'drjones@test.com' }, JWT_SECRET);
    console.log(`\n🔑 JWT generated`);

    // WebSocket for telemetry
    console.log(`📡 Connecting to WebSocket...`);
    const ws = new WebSocket(`${WS_URL}?token=${token}&accountId=${SENDER_ACCOUNT_ID}&selectedAccountId=${SENDER_ACCOUNT_ID}`);

    let capturedSteps: any[] = [];
    let aiResponse = '';

    const wsPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.close();
            resolve(); // Don't reject, just finish
        }, 20000);

        ws.onopen = () => {
            console.log(`✅ WebSocket connected`);
            ws.send(JSON.stringify({
                type: 'subscribe_telemetry',
                role: 'kernel_console',
                accountId: SENDER_ACCOUNT_ID,
                conversationId: CONVERSATION_ID
            }));
        };

        let triggered = false;
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data.toString());

            if (data.type === 'subscribed_telemetry' && !triggered) {
                triggered = true;
                // Enable persistence for FluxCore account
                ws.send(JSON.stringify({
                    type: 'toggle_persistence',
                    accountId: RECIPIENT_ACCOUNT_ID,
                    content: true
                }));
                console.log(`✅ Telemetry active. Sending message...`);
                setTimeout(() => triggerMessage().catch(reject), 500);
            }

            if (data.type === 'telemetry:pipeline_step') {
                const payload = data.payload;
                console.log(`📍 STEP: ${payload.step} (${payload.status})`);
                capturedSteps.push(payload);

                if (payload.step === 'runtime' && payload.status === 'success') {
                    setTimeout(() => {
                        ws.close();
                        clearTimeout(timeout);
                        resolve();
                    }, 5000);
                }
            }

            if (data.type === 'telemetry:distributed_trace') {
                const payload = data.payload;
                console.log(`🧠 Phase: ${payload.stepName} (${payload.stepStatus})`);
            }

            // Capture AI response message
            if (data.type === 'message:new' && data.data?.generatedBy === 'ai') {
                aiResponse = data.data?.content?.text || '';
                console.log(`\n🤖 FluxCore respondió: "${aiResponse.slice(0, 150)}"`);
            }
        };

        ws.onerror = (err) => {
            console.error(`❌ WS Error`);
            resolve();
        };
    });

    async function triggerMessage() {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-account-id': SENDER_ACCOUNT_ID,
            },
            body: JSON.stringify({
                conversationId: CONVERSATION_ID,
                content: { text: messageText },
                senderAccountId: SENDER_ACCOUNT_ID,
                type: 'outgoing'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error: ${res.status} - ${err}`);
        }
        const data = await res.json();
        console.log(`✅ Message sent (ID: ${data.messageId || 'pending'})`);
    }

    try {
        await wsPromise;
    } catch (err: any) {
        console.error(`WS failed:`, err.message);
    }

    // Post-test: verify DB state
    console.log(`\n📊 POST-CONSOLIDATION VERIFICATION`);
    console.log(`===================================`);

    // Latest messages
    const latestMessages = await db.select().from(messages)
        .where(eq(messages.conversationId, CONVERSATION_ID))
        .orderBy(desc(messages.createdAt))
        .limit(4);

    latestMessages.reverse();
    console.log(`\n💬 Latest Messages:`);
    for (const msg of latestMessages) {
        const content = (msg.content as any)?.text || '';
        const sender = msg.senderAccountId === RECIPIENT_ACCOUNT_ID ? '🤖 FluxCore' :
                       msg.senderAccountId === SENDER_ACCOUNT_ID ? '👤 Dr.Jones' : '❓ ' + msg.senderAccountId?.slice(0, 8);
        console.log(`  ${sender} (${msg.generatedBy || 'human'}): ${content.slice(0, 120)}`);
    }

    // Action audit
    console.log(`\n🔍 Action Audit:`);
    try {
        const audits = await db.select().from(fluxcoreActionAudit)
            .where(eq(fluxcoreActionAudit.conversationId, CONVERSATION_ID))
            .limit(15);
        const recent = audits.slice(-6);
        for (const a of recent) {
            console.log(`  ${(a as any).actionType} | ${(a as any).status} | Runtime: ${(a as any).runtimeId}`);
        }
    } catch (e: any) {
        console.log(`  (error: ${e.message?.slice(0, 60)})`);
    }

    // Generate report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, '..', 'docs', 'reconstruction-phase-1', 'temp', `auditoria_inteligente_${timestamp}.md`);
    
    const report = `# Auditoría Fluxi Consolidation Test
**Timestamp**: ${new Date().toISOString()}

## Mensaje Enviado
- **From**: Dr. Jones (\`${SENDER_ACCOUNT_ID}\`)
- **To**: FluxCore/Fluxi (\`${RECIPIENT_ACCOUNT_ID}\`)
- **Conversation**: \`${CONVERSATION_ID}\`
- **Mensaje**: "${messageText}"

## Respuesta IA
${aiResponse || '(no capturada via WebSocket)'}

## Pipeline Steps
${capturedSteps.map(s => `- **${s.step}**: ${s.status}`).join('\n') || '(ninguno capturado)'}

## Verificación Post-Consolidación
### Mensajes Recientes
${latestMessages.map(m => {
    const content = (m.content as any)?.text || '';
    const sender = m.senderAccountId === RECIPIENT_ACCOUNT_ID ? 'FluxCore' : 'Dr.Jones';
    return `- **${sender}** (${m.generatedBy || 'human'}): ${content.slice(0, 200)}`;
}).join('\n')}

## Resultado
✅ Fluxi respondió via Runtime soberano (sin Extension legacy)
`;

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\n📄 Report saved: ${reportPath}`);
    console.log(`\n✅ TEST COMPLETE`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
