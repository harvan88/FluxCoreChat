import { db, assistants, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { runtimeInputFactoryService } from '../services/fluxcore/runtime-input-factory.service';
import { fluxPolicyContextService } from '../services/flux-policy-context.service';
import { promptBuilder } from '../services/fluxcore/prompt-builder.service';
import { sovereignIdentityService } from '../services/fluxcore/sovereign-identity.service';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr Jones
    const conversationId = 'f0f0c12e-b2e2-4e60-9afc-5bc47fbf127e';
    
    console.log('--- 🛡️ AUDITORÍA DE SOBERANÍA DE CONTEXTO ---');
    
    // 1. Policy Context
    const policyContext = await fluxPolicyContextService.resolvePolicyContext({
        accountId,
        conversationId,
        channel: 'web'
    });
    
    // 2. Build Runtime Input (Real logic)
    const input = await runtimeInputFactoryService.build({
        accountId,
        conversationId,
        runtimeId: 'asistentes-local',
        policyContext,
        runtimeConfig: {
            provider: 'groq',
            model: 'llama-3.1-8b-instant',
            instructions: (policyContext.resolvedBusinessProfile as any)?.assistantInstructions || ''
        },
        conversationHistory: [{ role: 'user', content: 'Puedo ir ahora?', createdAt: new Date() }],
        lastUserMessage: 'Puedo ir ahora?'
    });

    // 3. Masking (Real logic)
    const { idToMask } = sovereignIdentityService.createMappingContext(input);
    
    // Applying Masking to input (Simulating CognitiveDispatcher)
    if (input.authorizedContext.authorizedTemplates) {
        input.authorizedContext.authorizedTemplates = input.authorizedContext.authorizedTemplates.map(id => 
            idToMask.get(id.toLowerCase()) || id
        );
    }
    
    const businessTemplates = (input.authorizedContext.businessProfile as any)?.templates;
    if (Array.isArray(businessTemplates)) {
        businessTemplates.forEach((t: any) => {
            if (t.templateId) {
                t.templateId = idToMask.get(t.templateId.toLowerCase()) || t.templateId;
            }
        });
    }

    // 4. Inspect Final System Prompt
    console.log('\n--- 🧠 ANALIZANDO PROMPT GENERADO ---');
    
    // The prompt builder uses the authorizedContext.businessProfile to build the prompt.
    // In AsistentesLocalRuntime, it uses TemplateRegistry.buildInstructionBlock.
    
    // For this audit, let's look at the Business Profile content directly
    console.log('\n--- 📂 PERFIL DE NEGOCIO (INSTRUCCIONES) ---');
    console.log((policyContext.resolvedBusinessProfile as any)?.assistantInstructions || 'No hay instrucciones específicas');
    
    console.log('\n--- 📋 PLANTILLAS DETECTADAS EN PERFIL ---');
    businessTemplates.forEach((t: any) => {
        console.log(`- [${t.templateId}] ${t.name}`);
        if (t.name.includes('HORARIO') || t.templateId.includes('HORARIO')) {
            console.log('   ⚠️ ¡DETECTOR DE GHOST ID ACTIVADO!');
        }
    });

    console.log('\n--- 🧪 SIMULANDO PLANTILLAS REGISTRADAS ---');
    const templatesList = businessTemplates.map((t: any) => {
        return `- ID: ${t.templateId}\n  Nombre: ${t.name}\n  Cuándo usarla: ${t.instructions || t.aiUsageInstructions || 'n/a'}`;
    }).join('\n\n');
    
    console.log(templatesList);
    
    if (templatesList.includes('HORARIO_SUNDIO')) {
        console.log('\n❌ ERROR: HORARIO_SUNDIO encontrado en la lista de plantillas procesada.');
    } else {
        console.log('\n✅ OK: HORARIO_SUNDIO no está en la lista de plantillas procesada.');
    }
}

main().catch(console.error);
