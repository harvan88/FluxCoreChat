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
const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// IDs Provided by User
const RECIPIENT_ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // AI Account
const SENDER_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';    // User Account
const SENDER_USER_ID = '535949b8-58a9-4310-87a7-42a2480f5746';      // User Identity
const CONVERSATION_ID = '5ad75a5f-f0ea-4cc8-a94c-812f67a4f446';     // Default Conv

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
                const phaseNames = ['FASE_0_SIEVE', 'FASE_1_ROUTER', 'FASE_1_5_DETERMINISTIC_SHORTCUT', 'FASE_2_RAG', 'FASE_3_RESOLUTIVE_CALL', 'FASE_4_BODY_TRANSLATION', 'IA_RUNTIME_INVOCATION'];
                
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
    console.log(`\n📊 Generando Reporte Forense...`);
    
    // 1. Reconstrucción del Prompt usando el input REAL de la llamada resolutiva (v16.0 Sovereignty)
    const globalInput = phases['IA_RUNTIME_INVOCATION']?.input;
    const resolutiveInput = phases['FASE_3_RESOLUTIVE_CALL']?.input;
    
    let builtPrompt: any = { systemPrompt: 'N/A', messages: [] };
    
    if (resolutiveInput && resolutiveInput.messages && resolutiveInput.messages.length > 0) {
        // La Fase 3 recibe los mensajes ya purificados (enmascarados)
        builtPrompt = {
            systemPrompt: resolutiveInput.messages[0]?.content || 'N/A',
            messages: resolutiveInput.messages.slice(1)
        };
    } else if (globalInput) {
        // Fallback si la Fase 3 no se ejecutó
        builtPrompt = promptBuilder.build({
            policyContext: globalInput.policyContext,
            authorizedContext: globalInput.authorizedContext,
            runtimeConfig: globalInput.runtimeConfig,
            conversationHistory: globalInput.conversationHistory
        });
    }

    // 2. Build Markdown
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `auditoria_forense_${timestamp}.md`;
    const filePath = `./docs/reconstruction-phase-1/temp/${fileName}`;

    const provider = aiData?.provider || 'N/A';
    const model = aiData?.model || 'N/A';

    let report = `# Reporte Forense del Kernel (Fases 0-4)
**Turno:** \`${globalInput?.executionId || 'N/A'}\`
**Generado:** ${new Date().toLocaleString()}

## 📥 Ingress
- **Mensaje**: "${messageText}"
- **Emisor**: \`${SENDER_ACCOUNT_ID}\`
- **Conversación**: \`${CONVERSATION_ID}\`

## 🛤️ Flujo de Soberanía (Pipeline)
| Paso | Estado | Latencia | Timestamp |
| :--- | :--- | :--- | :--- |
${steps.map(e => `| ${e.step} | **${e.status.toUpperCase()}** | ${e.metadata?.latencyMs || '-'}ms | ${e.timestamp} |`).join('\n')}

## 🧠 Auditoría del Runtime Cognitivo

`;

    // 🎯 Detalle de las 4 Fases
    const phaseDisplayNames: Record<string, string> = {
        'FASE_0_SIEVE': 'Fase 0: Tamiz Semántico (Filtrado de Plantillas)',
        'FASE_1_ROUTER': 'Fase 1: Intent Router (Evaluación de Intenciones)',
        'FASE_1_5_DETERMINISTIC_SHORTCUT': 'Fase 1.5: Deterministic Shortcut (Fast-Path)',
        'FASE_2_RAG': 'Fase 2: RAG Determinista (Conocimiento Vectorial)',
        'FASE_3_RESOLUTIVE_CALL': 'Fase 3: Modo Resolutivo (Generación de Respuesta)',
        'FASE_4_BODY_TRANSLATION': 'Fase 4: Physical Body Translation (Des-enmascaramiento)',
        'IA_RUNTIME_INVOCATION': 'Traza Técnica: IA_RUNTIME_INVOCATION (Legacy/Global)'
    };

    Object.keys(phaseDisplayNames).forEach(phaseKey => {
        const phase = phases[phaseKey];
        report += `### ${phaseDisplayNames[phaseKey]}\n`;
        if (phase) {
            report += `**Estado:** \`${phase.status}\` | **Timestamp:** \`${phase.timestamp}\`

#### 📥 Reality Input (Entrada)
\`\`\`json
${JSON.stringify(phase.input, null, 2)}
\`\`\`

#### 📤 Reality Output (Salida)
\`\`\`json
${JSON.stringify(phase.output, null, 2)}
\`\`\`

${phaseKey === 'FASE_0_SIEVE' ? `
##### 📊 Análisis de Similitud Coseno (Top Matches)
| Plantilla ID | Score (0-1) |
| :--- | :--- |
${(phase.output as any[] || []).map((r: any) => `| \`${r.id}\` | **${(r.score * 100).toFixed(2)}%** |`).join('\n')}
` : ''}

${phaseKey === 'FASE_1_ROUTER' ? `
##### 🤖 Router System Prompt
\`\`\`markdown
${(phase.input as any)?.routerSystemPrompt || 'N/A'}
\`\`\`
` : ''}

`;
        } else {
            report += `*Fase no ejecutada o no capturada.*\n\n`;
        }
    });

    report += `## 🤖 Prompt Final (Fase 3)

### System Instructions
\`\`\`markdown
${builtPrompt.systemPrompt}
\`\`\`

### Historial Enviado
${builtPrompt.messages.length > 0 
    ? builtPrompt.messages.map((m: any) => `**${m.role.toUpperCase()}**: ${m.content}`).join('\n\n')
    : '*Sin historial detectable*'}

## 🏁 Resultado de IA
- **Provider**: ${provider}
- **Model**: ${model}
- **Respuesta/Acciones**:
\`\`\`json
${JSON.stringify(aiData?.output || {}, null, 2)}
\`\`\`

---
*Reporte autogenerado por Telemetry Trace Reporter (v16.0 Forensic)*
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
