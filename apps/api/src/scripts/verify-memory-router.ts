import { AsistentesLocalRuntime } from '../services/fluxcore/runtimes/asistentes-local.runtime';

async function main() {
    const runtime = new AsistentesLocalRuntime();
    // IDs de prueba genéricos
    const vsId = '9c25ae4f-5060-47e1-b3d9-f7cdc40db549';
    const accountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';

    console.log("=== PROBANDO PERSISTENCIA DE MEMORIA AGNÓSTICA ===");

    // Flujo de prueba genérico (ej: Identificación de un repuesto o lugar)
    const historyText = [
        'USER: Necesito información sobre el Repuesto X-500',
        'ASSISTANT: No encuentro información específica sobre el Repuesto X-500...',
        'USER: Es para el modelo del año 2024',
        'ASSISTANT: ¿En qué versión lo necesitás?',
        'USER: En la versión Premium, ¿qué más querés que te diga?'
    ].join('\n');

    // Llamada al método privado para validar la extracción de intención
    const { matchedTemplateIds, extractedIntent } = await (runtime as any).evaluateTemplateIntents({
        provider: 'openai',
        model: 'gpt-4o-mini',
        conversationContext: historyText,
        templates: []
    });

    console.log(`\n🎯 Intención Extraída: "${extractedIntent}"`);
    
    // Verificamos que haya persistido el sujeto original (Repuesto X-500)
    if (extractedIntent && extractedIntent.toLowerCase().includes('x-500')) {
        console.log("✅ ÉXITO: El Router persistió la entidad principal (Repuesto X-500).");
    } else {
        console.log("❌ FALLO: El Router olvidó la entidad principal.");
    }

    process.exit(0);
}

main().catch(console.error);
