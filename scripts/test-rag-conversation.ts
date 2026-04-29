import { asistentesLocalRuntime } from '../apps/api/src/services/fluxcore/runtimes/asistentes-local.runtime';
import { db, fluxcoreAssistants } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function testRagConversation() {
    console.log('\n💬 SIMULACIÓN DE CONVERSACIÓN - TEST RAG (v3)');
    console.log('════════════════════════════════════════════════════════════');

    const assistantId = '3ba56d5b-495e-4474-8974-7c5beebcae5b'; // Dr. Jones
    const aiAccountId = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr. Jones (AI)
    const userMessage = 'Hola, me gustaría saber qué precio tiene el tratamiento de modelado 360';

    try {
        console.log(`👤 Usuario: ${userMessage}`);
        console.log('🧠 Procesando en FluxCore Cognitive Pipeline...');

        // Construir RuntimeInput PERFECTO según fluxcore-types.ts
        const input: any = {
            executionId: 'test-exec-' + Date.now(),
            policyContext: {
                mode: 'on',
                conversationId: '00000000-0000-0000-0000-000000000123',
                resolvedBusinessProfile: {
                    templates: [],
                    displayName: 'Dr. Jones Clinic'
                },
                contactRules: []
            },
            authorizedContext: {
                accountId: aiAccountId,
                conversationId: '00000000-0000-0000-0000-000000000123',
                channel: 'whatsapp',
                businessProfile: {
                    templates: [],
                    displayName: 'Dr. Jones Clinic'
                },
                contactRules: [],
                authorizedTemplates: [],
                responder: {
                    runtimeId: 'asistentes-local',
                    assistantId: assistantId,
                    assistantName: 'Dr. Jones'
                }
            },
            runtimeConfig: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                vectorStoreIds: ['1ec257ac-d14a-4174-875a-eba81b972eaf'],
                maxTokens: 1024,
                temperature: 0.7
            },
            conversationHistory: [
                { role: 'user', content: userMessage }
            ],
            services: {
                getAvailableTools: async () => ['search_knowledge'],
                executeTool: async () => ({ outcome: 'success' }),
                getToolDefinition: async () => ({}),
                isAuthorized: async () => true
            }
        };

        const actions = await asistentesLocalRuntime.handleMessage(input);

        console.log('\n🤖 ACCIONES RESULTANTES:');
        console.log(JSON.stringify(actions, null, 2));

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error en el chat:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

testRagConversation();
