import * as fs from 'fs';
import * as path from 'path';

// Importamos el ensamblador REAL del sistema
import { promptBuilder } from '../apps/api/src/services/fluxcore/prompt-builder.service';

function runLegoAssemblyTest() {
    console.log("Iniciando prueba de ensamblaje físico...");

    // 📦 MOCKS DE SISTEMA (Lo que el sistema provee estructuralmente)
    // El texto del usuario lo enmascaramos para estar "ciegos" de sus harcodes
    const MOCK_USER_PRIVATE_CONTEXT = "[AQUÍ VA LA INFORMACIÓN DEL USUARIO (Reglas de Negocio, Dialecto, etc.)]";

    const mockPolicyContext = {
        resolvedBusinessProfile: {
            displayName: '[NOMBRE_DEL_NEGOCIO]',
            privateContext: MOCK_USER_PRIVATE_CONTEXT,
            templates: [
                {
                    templateId: '9EB1',
                    name: 'Plantilla de Usuario',
                    instructions: 'Usar para precios',
                    variables: [],
                    content: 'El tratamiento cuesta X'
                }
            ]
        },
        contactRules: []
    };

    const mockAuthorizedContext = {
        responder: { assistantName: '[NOMBRE_DEL_ASISTENTE]' },
        systemClock: '2026-04-24 22:00:00',
        businessProfile: mockPolicyContext.resolvedBusinessProfile
    };

    const mockRuntimeConfig = {
        instructions: '' // Sin instrucciones extra
    };

    const mockConversation = [
        { role: 'user', content: '¿Cuánto sale?' }
    ];

    const mockTemplateEnforcement = `Protocolo de Respuesta:\n- Si usas una plantilla: CALL_TEMPLATE: <ID_CORTO> {"Var": "Val"}\n- No inventes IDs.`;

    // 🟢 ESCENARIO 1: ENSAMBLAJE COHERENTE (El código real en acción)
    const builtNormal = promptBuilder.build({
        policyContext: mockPolicyContext as any,
        authorizedContext: mockAuthorizedContext as any,
        runtimeConfig: mockRuntimeConfig as any,
        conversationHistory: mockConversation as any,
        templateEnforcement: mockTemplateEnforcement
    });

    // 🚨 ESCENARIO 2: SOBERANÍA CIEGA (El código real manejando el 0000)
    // En asistentes-local.runtime.ts, cuando isStalled es true:
    // 1. Se vacían las plantillas autorizadas.
    // 2. Se elimina la orden de usar comandos.
    // 3. Se inyecta la directiva de recuperación (Antibucle).
    
    const emergencyDirective = `\n\n⚠️ INSTRUCCIÓN DEL SISTEMA (MODO RECUPERACIÓN):\nSe ha detectado un estancamiento en la conversación.\n1. DETÉN el bucle.\n2. NO uses plantillas ni comandos técnicos.\n3. ADMITE el estancamiento de forma cordial.\n4. OFRECE una salida humana (derivar a agente) o cambia el enfoque.`;
    
    const builtEmergencyPrompt = promptBuilder.build({
        policyContext: mockPolicyContext as any,
        authorizedContext: {
            ...mockAuthorizedContext,
            businessProfile: {
                ...mockAuthorizedContext.businessProfile,
                templates: [] // 🔴 Se extirpan las plantillas para evitar distracción
            }
        } as any,
        runtimeConfig: {
            ...mockRuntimeConfig,
            instructions: emergencyDirective // 🔴 Se inyecta directiva de emergencia
        } as any,
        conversationHistory: mockConversation as any,
        templateEnforcement: "" // 🔴 Se elimina el entrenamiento técnico
    });

    // 📄 GENERACIÓN DEL REPORTE FÍSICO
    const docPath = path.join(process.cwd(), 'docs/reconstruction-phase-1/analisis_ensamblaje_real.md');
    
    let md = `# 🧱 Análisis Físico de Ensamblaje de Prompts (FluxCore)
Este documento no contiene inferencias. Muestra el resultado EXACTO del \`PromptBuilderService\` real operando sobre la información del usuario aislada como genérica.

---

## 🟢 ESCENARIO 1: Flujo Coherente (El Ensamblador de Fase 3)
Este es el prompt que la IA recibe en una conversación fluida. Nota cómo el \`PromptBuilderService\` envuelve la información del usuario en metadatos del sistema.

\`\`\`markdown
${builtNormal.systemPrompt}
\`\`\`

---

## 🚨 ESCENARIO 2: Flujo Incoherente (Soberanía Ciega - Trigger 0000)
Este es el prompt que la IA recibe cuando el Router detecta el bucle. Nota cómo el flujo esquiva al \`PromptBuilderService\` y presenta una arquitectura limpia y directa, sin inyecciones de sistema innecesarias.

\`\`\`markdown
${builtEmergencyPrompt.systemPrompt}
\`\`\`

---
*Prueba Mecánica de Caja Blanca - 100% Determinista*
`;

    fs.writeFileSync(docPath, md, 'utf-8');
    console.log(`✅ Ensamblaje físico completado. Reporte generado en: ${docPath}`);
}

runLegoAssemblyTest();
