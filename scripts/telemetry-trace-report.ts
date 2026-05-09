/**
 * Telemetry Trace Reporter (Kernel Simulation)
 * 
 * Usage: 
 *   bun run scripts/telemetry-trace-report.ts
 *   bun run scripts/telemetry-trace-report.ts "Mi mensaje personalizado"
 */

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
import { eq, desc, or } from 'drizzle-orm';
import { promptBuilder } from '../apps/api/src/services/fluxcore/prompt-builder.service';

// --- CONFIGURATION ---
const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// IDs Provided by User
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr Jones (Assistant)
const SENDER_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';    // Dr Jones (Registered)
const SENDER_USER_ID = 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe';      // Dr Jones Owner
const CONVERSATION_ID = 'f0f0c12e-b2e2-4e60-9afc-5bc47fbf127e';     // Conv Real

const messageText = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && !a.includes('telemetry-trace-report.ts')) || 'Hola';
const shouldClear = process.argv.includes('--clear') || process.argv.includes('-c');

async function main() {
    console.log(`\n🚀 STARTING TELEMETRY TRACE REPORTE`);
    console.log(`------------------------------------`);
    console.log(`📝 Message: "${messageText}"`);
    console.log(`👥 From: ${SENDER_ACCOUNT_ID.slice(0, 8)}`);
    console.log(`🤖 To:   ${RECIPIENT_ACCOUNT_ID.slice(0, 8)}`);
    console.log(`💬 Conv: ${CONVERSATION_ID.slice(0, 8)}`);
    console.log(`🧹 Clear History: ${shouldClear ? 'YES' : 'NO'}`);

    // 1. Generate JWT Token (Bypass)
    const token = sign({ userId: SENDER_USER_ID, email: 'harvan@hotmail.es' }, JWT_SECRET);
    console.log(`\n🔑 JWT generated (${token.slice(0, 15)}...)`);

    // 2. Setup WebSocket for Telemetry
    console.log(`📡 Connecting to WebSocket for telemetry...`);
    const ws = new WebSocket(`${WS_URL}?token=${token}&accountId=${SENDER_ACCOUNT_ID}`);

    let capturedSteps: any[] = [];
    let runtimePhases: Record<string, any> = {};
    let aiTraceData: any = null;

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
                accountId: SENDER_ACCOUNT_ID,
                conversationId: CONVERSATION_ID
            }));
        };

        let triggered = false;
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data.toString());
            console.log(`[WS DEBUG] Received: ${data.type}`);
            
            if (data.type === 'error') {
                console.error(`[WS ERROR] ${data.message}`);
            }

            if (data.type === 'subscribed_telemetry' && !triggered) {
                triggered = true;
                ws.send(JSON.stringify({
                    type: 'toggle_persistence',
                    accountId: RECIPIENT_ACCOUNT_ID,
                    content: true
                }));

                console.log(`✅ Telemetry subscription active & persistence enabled`);
                // Give a small moment for persistence to register
                setTimeout(() => triggerMessage().catch(reject), 500);
            }

            if (data.type === 'telemetry:pipeline_step') {
                const payload = data.payload;
                console.log(`📍 STEP: ${payload.step} (${payload.status})`);
                capturedSteps.push(payload);

                if (payload.step === 'runtime' && payload.status === 'success') {
                    // Start a timer to finish if we don't get the distributed traces soon
                    setTimeout(() => {
                        ws.close();
                        resolve(true);
                    }, 5000);
                }

                if (payload.status === 'error') {
                    console.error(`❌ Pipeline Error:`, payload.metadata?.errorDetail);
                    ws.close();
                    resolve(false);
                }
            }

            if (data.type === 'telemetry:distributed_trace') {
                const payload = data.payload;
                const phaseNames = ['DEBUG_INPUT_CHECK', 'FASE_0_SIEVE', 'FASE_1_ROUTER', 'FASE_1_5_DETERMINISTIC_SHORTCUT', 'FASE_2_RAG', 'FASE_2.5_SOVEREIGNTY', 'FASE_3_RESOLUTIVE_CALL', 'FASE_4_BODY_TRANSLATION', 'IA_RUNTIME_INVOCATION'];

                console.log(`[WS DEBUG] Distributed Trace received: ${payload.stepName} (${payload.stepStatus || 'N/A'})`);

                if (phaseNames.includes(payload.stepName)) {
                    console.log(`🧠 Phase Captured: ${payload.stepName} (${payload.stepStatus || 'processing'})`);
                    runtimePhases[payload.stepName] = {
                        input: payload.payloadEnorme,
                        output: payload.output || payload.error,
                        status: payload.stepStatus,
                        timestamp: payload.timestamp
                    };
                }

                if (payload.stepStatus === 'completed' && payload.stepName === 'IA_RUNTIME_INVOCATION') {
                    console.log(`✅ Final AI Response captured`);
                    aiTraceData = {
                        provider: payload.attributes?.['ai.provider'] || 'unknown',
                        model: payload.attributes?.['ai.model'] || 'unknown',
                        output: payload.output
                    };
                }
            }
        };

        ws.onerror = (err) => {
            console.error(`❌ WS Error:`, err);
            reject(err);
        };
    });

    async function triggerMessage() {
        console.log(`\n📤 Sending message to API...`);
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                conversationId: CONVERSATION_ID,
                content: { text: messageText },
                senderAccountId: SENDER_ACCOUNT_ID, // Explicitly provide sender
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
        if (Object.keys(runtimePhases).length > 0) {
            await generateReport(capturedSteps, runtimePhases, aiTraceData);

            if (shouldClear) {
                await clearHistory(CONVERSATION_ID);
            }
        } else {
            console.log(`\n⚠️ Pipeline finished but no forensic phases were captured. Verify if tracing is enabled on server.`);
        }
    } catch (err: any) {
        console.error(`\n❌ Simulation failed:`, err.message);
    }
}

async function clearHistory(conversationId: string) {
    console.log(`\n🧹 LIMPIEZA DE HISTORIAL (Borrón y cuenta nueva)...`);
    try {
        // 1. Eliminar mensajes e historial visible
        await db.delete(messages).where(eq(messages.conversationId, conversationId));
        console.log(`  ✅ Mensajes eliminados`);

        // 2. Eliminar trazas y señales (Soberanía Cognitiva)
        await db.delete(aiTraces).where(eq(aiTraces.conversationId, conversationId));
        await db.delete(aiSignals).where(eq(aiSignals.conversationId, conversationId));
        console.log(`  ✅ Trazas y Señales eliminadas`);

        // 3. Eliminar sugerencias y auditoría de acciones
        await db.delete(aiSuggestions).where(eq(aiSuggestions.conversationId, conversationId));
        await db.delete(fluxcoreActionAudit).where(eq(fluxcoreActionAudit.conversationId, conversationId));
        console.log(`  ✅ Sugerencias y Auditoría eliminadas`);

        // 4. Limpiar Outboxes (Mensajes pendientes de entrega física)
        // ChatCoreOutbox: Se limpia por CASCADA cuando borramos mensajes (Step 1)
        // FluxCoreOutbox: Se limpia por señales
        const signalIds = await db.select({ id: aiSignals.id }).from(aiSignals).where(eq(aiSignals.conversationId, conversationId));
        if (signalIds.length > 0) {
            await db.delete(fluxcoreOutbox).where(sql`signal_id IN (${sql.join(signalIds.map(s => sql`${s.id}`), sql`, `)})`);
        }
        console.log(`  ✅ Outboxes limpiados`);

        // 5. Limpiar Cola de Cognición (Prevenir ejecuciones fantasma)
        await db.delete(fluxcoreCognitionQueue).where(eq(fluxcoreCognitionQueue.conversationId, conversationId));
        console.log(`  ✅ Cola de cognición limpiada`);

        console.log(`✨ Historial de conversación ${conversationId.slice(0, 8)} limpiado con éxito.`);
    } catch (err: any) {
        console.error(`  ❌ Error durante la limpieza:`, err.message);
    }
}

async function generateReport(steps: any[], phases: Record<string, any>, aiData: any) {
    console.log(`\n📊 Generando Reporte de Alta Densidad (Expandible)...`);

    const globalInput = phases['IA_RUNTIME_INVOCATION']?.input;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `auditoria_inteligente_${timestamp}.md`;
    const filePath = `./docs/reconstruction-phase-1/temp/${fileName}`;

    let report = `# 🧠 Auditoría Inteligente del Kernel (FluxCore)
**Turno:** \`${globalInput?.executionId || 'N/A'}\` | **Fecha:** ${new Date().toLocaleString()}

## 📥 Contexto de Entrada
- **Mensaje**: "${messageText}"
- **Runtime**: \`${globalInput?.runtimeConfig?.runtimeId || 'asistentes-local'}\` | **Modelo**: \`${aiData?.provider}/${aiData?.model}\`

---

## 🛤️ Análisis de Fases (I/O & Razonamiento)

`;

    const phaseDisplayNames: Record<string, string> = {
        'FASE_0_SIEVE': 'Fase 0: Tamiz Semántico (Filtrado)',
        'FASE_1_ROUTER': 'Fase 1: Intent Router (Ruteo)',
        'FASE_1_5_DETERMINISTIC_SHORTCUT': 'Fase 1.5: Deterministic Shortcut (Fast-Path)',
        'FASE_2_RAG': 'Fase 2: RAG Determinista (Contexto)',
        'FASE_2.5_SOVEREIGNTY': 'Fase 2.5: Soberanía Temporal (Ontología)',
        'FASE_3_RESOLUTIVE_CALL': 'Fase 3: Modo Resolutivo (IA)',
        'FASE_3_RESOLUTIVE_CALL': 'Fase 3: Modo Resolutivo (IA)',
        'FASE_4_BODY_TRANSLATION': 'Fase 4: Physical Translation (Output)'
    };

    Object.keys(phaseDisplayNames).forEach(phaseKey => {
        const phase = phases[phaseKey];
        if (phase) {
            report += `### 📍 ${phaseDisplayNames[phaseKey]}\n`;

            // 🟢 RESUMEN RÁPIDO
            if (phaseKey === 'FASE_1_ROUTER') {
                report += `> **Intent**: \`${phase.output.extractedIntent}\` | **Templates**: \`${JSON.stringify(phase.output.matchedTemplateIds)}\`\n\n`;
            } else if (phaseKey === 'FASE_2_RAG') {
                report += `> **Chunks**: \`${phase.output.chunksUsed}\` | **Intent Search**: \`${phase.input.intent}\`\n\n`;
            }

            // 📥 INPUT (COLAPSABLE)
            report += `<details>\n<summary>🔍 Ver Entrada & Prompt</summary>\n\n`;
            if (phaseKey === 'FASE_1_ROUTER' && phase.input.routerSystemPrompt) {
                report += `#### System Prompt (Router):\n\`\`\`markdown\n${phase.input.routerSystemPrompt}\n\`\`\`\n`;
            } else if (phaseKey === 'FASE_3_RESOLUTIVE_CALL' && phase.input.messages) {
                report += `#### Full Messages (IA):\n\`\`\`json\n${JSON.stringify(phase.input.messages, null, 2)}\n\`\`\`\n`;
            }
            report += `#### JSON Input:\n\`\`\`json\n${JSON.stringify(phase.input, null, 2)}\n\`\`\`\n`;
            report += `</details>\n\n`;

            // 📤 OUTPUT (SIEMPRE VISIBLE O COLAPSABLE SI ES GRANDE)
            if (phaseKey === 'FASE_2_RAG' || phaseKey === 'FASE_0_SIEVE') {
                report += `<details>\n<summary>📦 Ver Salida Detallada</summary>\n\n\`\`\`json\n${JSON.stringify(phase.output, null, 2)}\n\`\`\`\n</details>\n\n`;
            } else {
                report += `**Resultado:**\n\`\`\`json\n${JSON.stringify(phase.output, null, 2)}\n\`\`\`\n\n`;
            }

            report += `---\n`;
        }
    });

    report += `\n## 🏁 Resultado Final de IA
> ${aiData?.output?.content || JSON.stringify(aiData?.output || {})}

<details>
<summary>⚙️ Metadatos Técnicos</summary>

- **Usage**: \`${JSON.stringify(aiData?.output?.usage || {})}\`
- **Finish Reason**: \`${aiData?.output?.finishReason}\`
</details>

---
*Reporte de Alta Densidad (v17.0 Intelligence)*
`;

    const fs = require('fs');
    if (!fs.existsSync('./docs/reconstruction-phase-1/temp')) {
        fs.mkdirSync('./docs/reconstruction-phase-1/temp', { recursive: true });
    }
    fs.writeFileSync(filePath, report);

    console.log(`\n✨ REPORT CREATED: ${filePath}`);
    console.log(`------------------------------------`);
}

main().catch(console.error);
