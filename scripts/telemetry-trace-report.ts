/**
 * Telemetry Trace Reporter (Kernel Simulation)
 * 
 * Usage: 
 *   bun run scripts/telemetry-trace-report.ts
 *   bun run scripts/telemetry-trace-report.ts "Mi mensaje personalizado"
 */

import { sign } from 'jsonwebtoken';
// Cargar entorno desde la raíz del proyecto usando la API nativa de Bun
const dotEnvPath = require('path').resolve(__dirname, '../.env');
const fs = require('fs');

if (fs.existsSync(dotEnvPath)) {
    const envContent = fs.readFileSync(dotEnvPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
}

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
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET no encontrado en el entorno.');
    console.error('Asegúrese de que el archivo .env exista en la raíz del proyecto.');
    process.exit(1);
}

// IDs Provided by User
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr Jones (Assistant)
const SENDER_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';    // Dr Jones (Registered)
const SENDER_USER_ID = 'c7439d6a-7e46-4e84-a4d6-d73bea3cb5fe';      // Dr Jones Owner
const CONVERSATION_ID = 'f0f0c12e-b2e2-4e60-9afc-5bc47fbf127e';     // Conv Real

const messageText = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && !a.includes('telemetry-trace-report.ts')) || 'Hola';
const shouldClear = process.argv.includes('--clear') || process.argv.includes('-c');

async function main() {
    console.log(`\n🚀 STARTING TELEMETRY TRACE REPORTE (REFACTORED)`);
    console.log(`-----------------------------------------------`);
    console.log(`📝 Message: "${messageText}"`);
    console.log(`👥 From: ${SENDER_ACCOUNT_ID.slice(0, 8)}`);
    console.log(`🤖 To:   ${RECIPIENT_ACCOUNT_ID.slice(0, 8)}`);
    console.log(`💬 Conv: ${CONVERSATION_ID.slice(0, 8)}`);
    console.log(`🧹 Clear History: ${shouldClear ? 'YES' : 'NO'}`);

    if (shouldClear) {
        await clearHistory(CONVERSATION_ID);
    }

    // 1. Generate JWT Token (Bypass con claims completos)

    const token = sign(
        { 
            userId: SENDER_USER_ID, 
            accountId: SENDER_ACCOUNT_ID, 
            email: 'harvan@hotmail.es' 
        }, 
        JWT_SECRET,
        { expiresIn: '1h' }
    );
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
            reject(new Error('WebSocket timeout (60s)'));
        }, 60000);

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
                const phaseNames = ['DEBUG_INPUT_CHECK', 'FASE_0_SIEVE', 'FASE_1_ROUTER', 'FASE_1_5_DETERMINISTIC_SHORTCUT', 'FASE_2_RAG', 'FASE_2.1_CRP', 'FASE_2.5_SOVEREIGNTY', 'FASE_3_RESOLUTIVE_CALL', 'FASE_4_BODY_TRANSLATION', 'IA_RUNTIME_INVOCATION'];

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
                        provider: payload.attributes?.['ai.provider'] || payload.attributes?.['runtime.id'] || 'unknown',
                        model: payload.attributes?.['ai.model'] || payload.attributes?.['model'] || 'unknown',
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
        }
        process.exit(0);
    } catch (err: any) {
        console.error(`\n❌ Simulation failed:`, err.message);
        process.exit(1);
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
    const globalInput = phases['IA_RUNTIME_INVOCATION']?.input;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `auditoria_${timestamp}.md`;
    const filePath = `./docs/reconstruction-phase-1/temp/${fileName}`;

    let report = `# 🧠 Auditoría del Kernel FluxCore\n`;
    report += `> **Turno:** \`${globalInput?.executionId || 'N/A'}\` | **Fecha:** ${new Date().toLocaleString()}\n`;
    report += `> **Mensaje:** \`${messageText}\` | **Modelo:** \`${aiData?.provider}/${aiData?.model}\` | **Runtime:** \`${globalInput?.runtimeConfig?.runtimeId || 'asistentes-local'}\`\n\n`;

    // 📊 TABLA RESUMEN (VISTA RÁPIDA)
    report += `## 📊 Resumen Ejecutivo\n`;
    report += `| Fase | Estado | Resultado Clave |\n`;
    report += `| :--- | :--- | :--- |\n`;

    const phaseNames = [
        ['FASE_0_SIEVE', 'Sieve (Filtrado)'],
        ['FASE_1_ROUTER', 'Router (Intención)'],
        ['FASE_1_5_DETERMINISTIC_SHORTCUT', 'Fast-Path (Directo)'],
        ['FASE_2_RAG', 'RAG (Contexto)'],
        ['FASE_2.1_CRP', 'CRP (Soberanía Realidad)'],
        ['FASE_2.5_SOVEREIGNTY', 'Legacy (Soberanía)'],
        ['FASE_3_RESOLUTIVE_CALL', 'IA (Razonamiento)'],
        ['FASE_4_BODY_TRANSLATION', 'Translation (Output)']
    ];

    phaseNames.forEach(([key, name]) => {
        const phase = phases[key];
        if (phase) {
            let result = '✅ Procesado';
            if (key === 'FASE_1_ROUTER') result = `🎯 \`${phase.output.extractedIntent}\``;
            if (key === 'FASE_1_5_DETERMINISTIC_SHORTCUT') result = `⚡ \`${phase.output[0]?.type || 'N/A'}\``;
            if (key === 'FASE_3_RESOLUTIVE_CALL') result = `🤖 AI Response`;
            
            report += `| ${name} | ${phase.status === 'completed' ? '🟢' : '🟡'} | ${result} |\n`;
        } else {
            report += `| ${name} | ⚪ | *Omitida* |\n`;
        }
    });

    report += `\n---\n\n`;

    // 🛤️ DETALLE DE FASES
    const phaseDisplayNames: Record<string, string> = {
        'FASE_0_SIEVE': 'Fase 0: Tamiz Semántico',
        'FASE_1_ROUTER': 'Fase 1: Intent Router',
        'FASE_1_5_DETERMINISTIC_SHORTCUT': 'Fase 1.5: Fast-Path',
        'FASE_2_RAG': 'Fase 2: RAG Determinista',
        'FASE_2.1_CRP': 'Fase 2.1: Cognitive Reality Protocol (Soberanía)',
        'FASE_2.5_SOVEREIGNTY': 'Fase 2.5: Soberanía Temporal (LEGACY FALLBACK)',
        'FASE_3_RESOLUTIVE_CALL': 'Fase 3: Modo Resolutivo (IA)',
        'FASE_4_BODY_TRANSLATION': 'Fase 4: Physical Translation'
    };

    Object.keys(phaseDisplayNames).forEach(phaseKey => {
        const phase = phases[phaseKey];
        if (phase) {
            report += `### 📍 ${phaseDisplayNames[phaseKey]}\n`;

            if (phaseKey === 'FASE_1_ROUTER') {
                report += `**Intención:** \`${phase.output.extractedIntent}\` | **Templates:** \`${JSON.stringify(phase.output.matchedTemplateIds)}\`\n`;
            }

            // INPUT/OUTPUT COMPACTO
            report += `#### 📥 Entrada\n`;
            if (phaseKey === 'FASE_3_RESOLUTIVE_CALL') {
                const systemPrompt = phase.input.messages?.find((m: any) => m.role === 'system')?.content || phase.input.systemPrompt || 'N/A';
                const history = phase.input.messages?.filter((m: any) => m.role !== 'system') || [];
                
                report += `<details><summary>Ver System Prompt</summary>\n\n\`\`\`markdown\n${systemPrompt}\n\`\`\`\n</details>\n\n`;
                
                if (history.length > 0) {
                    report += `**Historial de Mensajes:**\n`;
                    report += `\`\`\`text\n${history.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\`\`\`\n\n`;
                }
                
                report += `**User Message:** \`${phase.input.lastUserMessage || history[history.length-1]?.content || 'N/A'}\`\n`;
            } else {
                report += `\`\`\`json\n${JSON.stringify(phase.input, null, 1)}\n\`\`\`\n`;
            }

            report += `#### 📤 Salida\n`;
            report += `\`\`\`json\n${JSON.stringify(phase.output, null, 1)}\n\`\`\`\n\n`;
            report += `---\n`;
        }
    });

    // 🏁 RESULTADO FINAL
    report += `\n## 🏁 Resultado Final\n`;
    const finalContent = aiData?.output?.content || JSON.stringify(aiData?.output || {});
    report += `\`\`\`text\n${finalContent}\n\`\`\`\n`;

    const fs = require('fs');
    if (!fs.existsSync('./docs/reconstruction-phase-1/temp')) {
        fs.mkdirSync('./docs/reconstruction-phase-1/temp', { recursive: true });
    }
    fs.writeFileSync(filePath, report);

    console.log(`\n✨ REPORT CREATED: ${filePath}`);
}

main().catch(console.error);
