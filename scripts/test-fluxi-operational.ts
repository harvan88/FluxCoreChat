/**
 * Fluxi Operational Test: Template Creation
 * 
 * Verifies that Fluxi (FluxCore) can propose and execute operational works
 * for a user (Dr. Jones).
 */
import { sign } from 'jsonwebtoken';
import { db, messages, fluxcoreActionAudit, fluxcoreWorks, fluxcoreWorkSlots, templates } from '@fluxcore/db';
import { eq, desc, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Accounts
const DR_JONES_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';
const FLUXCORE_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18';
const HAROLD_USER_ID = '535949b8-58a9-4310-87a7-42a2480f5746';
const CONVERSATION_ID = 'eadb0912-127c-4738-af5e-18b0ecb52670';

const messageText = 'Hola FluxCore, quiero crear una plantilla de bienvenida para mis pacientes que diga "Hola, bienvenido a la consulta del Dr. Jones"';

async function main() {
    console.log('\n🧪 FLUXI OPERATIONAL TEST');
    console.log('=========================');
    console.log(`👤 Dr. Jones (${DR_JONES_ID.slice(0, 8)}) → 🤖 FluxCore (${FLUXCORE_ID.slice(0, 8)})`);
    console.log(`💬 Message: "${messageText}"`);

    // JWT for Harold (who owns both accounts)
    const token = sign({ userId: HAROLD_USER_ID, email: 'harvan@hotmail.es' }, JWT_SECRET);
    
    // WebSocket to monitor FluxCore's response
    console.log(`📡 Connecting to WebSocket...`);
    const ws = new WebSocket(`${WS_URL}?token=${token}&accountId=${DR_JONES_ID}`);

    let capturedActions: any[] = [];
    let aiResponse = '';
    let workId = '';

    const wsPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.close();
            resolve();
        }, 30000);

        ws.onopen = () => {
            console.log(`✅ WebSocket connected`);
            // Subscribe to Dr. Jones's conversation
            ws.send(JSON.stringify({
                type: 'subscribe_telemetry',
                role: 'kernel_console',
                accountId: DR_JONES_ID,
                conversationId: CONVERSATION_ID
            }));
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data.toString());

            if (data.type === 'subscribed_telemetry') {
                console.log(`✅ Telemetry active. Sending message...`);
                await triggerMessage();
            }

            if (data.type === 'message:new' && data.data?.senderAccountId === FLUXCORE_ID) {
                aiResponse = data.data?.content?.text || '';
                console.log(`\n🤖 FluxCore: "${aiResponse}"`);
            }

            if (data.type === 'telemetry:pipeline_step' && data.payload.step === 'dispatcher') {
                console.log(`📍 FluxCore Cognitive Dispatcher processed the turn`);
            }
            
            // Look for work creation in audits (polled later, but can watch for events here if emitted)
        };
    });

    async function triggerMessage() {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-account-id': DR_JONES_ID,
            },
            body: JSON.stringify({
                conversationId: CONVERSATION_ID,
                content: { text: messageText },
                senderAccountId: DR_JONES_ID,
                type: 'incoming'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error: ${res.status} - ${err}`);
        }
        console.log(`✅ Message sent`);
    }

    // Wait a bit for processing
    await new Promise(r => setTimeout(r, 10000));
    ws.close();

    // Verificación en DB
    console.log(`\n📊 VERIFICATION`);
    console.log(`==============`);

    // 1. Ver si se propuso un Work
    const audits = await db.select().from(fluxcoreActionAudit)
        .where(eq(fluxcoreActionAudit.conversationId, CONVERSATION_ID))
        .orderBy(desc(fluxcoreActionAudit.createdAt))
        .limit(10);
    
    const proposeAction = audits.find(a => (a as any).actionType === 'propose_work');
    if (proposeAction) {
        console.log(`✅ Fluxi propuso un Work: ${(proposeAction as any).actionPayload?.intent}`);
        const payload = (proposeAction as any).actionPayload;
        
        // 2. Buscar el Work creado
        const [work] = await db.select().from(fluxcoreWorks)
            .where(and(eq(fluxcoreWorks.accountId, FLUXCORE_ID), eq(fluxcoreWorks.conversationId, CONVERSATION_ID)))
            .orderBy(desc(fluxcoreWorks.createdAt))
            .limit(1);
        
        if (work) {
            console.log(`✅ Work creado: ${work.id} (Estado: ${work.state})`);
            workId = work.id;

            // 3. Ver slots
            const slots = await db.select().from(fluxcoreWorkSlots)
                .where(eq(fluxcoreWorkSlots.workId, work.id));
            
            console.log(`📝 Slots extraídos:`);
            for (const s of slots) {
                console.log(`  - ${s.path}: ${JSON.stringify(s.value)}`);
            }

            // 4. Forzar finalización para probar side effect (si no se cerró solo)
            if (work.state !== 'COMPLETED') {
                console.log(`\n🔄 Forzando transición a COMPLETED para probar side effect...`);
                // En un escenario real el usuario diría "Sí" o "Dale"
                // Aquí lo hacemos programáticamente para validar la lógica del ActionExecutor
                const { workEngineService } = await import('../apps/api/src/services/work-engine.service');
                const { actionExecutor } = await import('../apps/api/src/services/fluxcore/action-executor.service');
                
                // Simular el cierre del work vía ActionExecutor para disparar el hook
                await actionExecutor.execute([
                    { type: 'close_work', workId: work.id, conversationId: CONVERSATION_ID, resolution: 'completed', replyMessage: '¡Listo! He creado la plantilla.' }
                ], {
                    turnId: 999,
                    conversationId: CONVERSATION_ID,
                    accountId: FLUXCORE_ID,
                    targetAccountId: DR_JONES_ID,
                    runtimeId: 'fluxi',
                    runtimeConfig: { runtimeId: 'fluxi' } as any
                });

                // 5. Verificar que la plantilla exista en Dr. Jones
                const [newTemplate] = await db.select().from(templates)
                    .where(and(eq(templates.accountId, DR_JONES_ID), eq(templates.name, slots.find(s => s.path === 'name')?.value || 'Bienvenida')))
                    .limit(1);
                
                if (newTemplate) {
                    console.log(`\n🎉 ÉXITO: Plantilla "${newTemplate.name}" creada en la cuenta de Dr. Jones!`);
                } else {
                    console.log(`\n❌ FALLO: No se encontró la plantilla en la cuenta de Dr. Jones.`);
                }
            }
        }
    } else {
        console.log(`❌ Fluxi no propuso ningún Work. Revisa el prompt o las definitions.`);
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
